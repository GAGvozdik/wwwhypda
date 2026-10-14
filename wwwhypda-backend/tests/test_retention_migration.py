"""PostgreSQL migration on synthetic schema only; CLI never imports mainApp."""
import os
import subprocess
import sys
import unittest
import uuid
from unittest.mock import patch
from sqlalchemy import create_engine, inspect, text, event
from auth.migrate_retention import migrate, main, SchemaError


class MigrationConfigurationTests(unittest.TestCase):
    def test_no_configuration_no_secrets_and_nonpostgres_rejected(self):
        with patch.dict(os.environ,{},clear=True), patch('sys.stderr') as output:
            self.assertEqual(main(['--check']),1)
            self.assertNotIn('password',str(output.write.call_args_list).lower())
        engine=create_engine('sqlite://')
        try:
            with self.assertRaises(SchemaError):
                migrate(engine)
        finally:
            engine.dispose()


class PostgreSQLRetentionMigrationTests(unittest.TestCase):
    def setUp(self):
        uri=os.environ.get('TEST_AUTH_DATABASE_URI','')
        if not uri.startswith('postgresql'):
            self.skipTest('Real isolated PostgreSQL required')
        self.admin=create_engine(uri)
        self.schema='retention_test_'+uuid.uuid4().hex
        with self.admin.begin() as c:
            c.execute(text(f'CREATE SCHEMA {self.schema}'))
        self.engine=create_engine(uri,connect_args={'options':f'-csearch_path={self.schema}'})
        with self.engine.begin() as c:
            c.execute(text('CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100) UNIQUE, password VARCHAR(200), active BOOLEAN, is_superuser BOOLEAN, terms_version VARCHAR(64), terms_accepted_at TIMESTAMPTZ)'))
            c.execute(text("INSERT INTO users VALUES (1,'Active','active@example.test','hash',true,false,'old','2020-01-01Z'), (2,'Disabled','disabled@example.test','hash2',false,false,NULL,NULL)"))
            c.execute(text('CREATE TABLE input_data (id SERIAL PRIMARY KEY, user_id INTEGER, created_at TIMESTAMP, body JSON)'))
            c.execute(text("INSERT INTO input_data VALUES (1,1,'2026-01-01','{}')"))

    def tearDown(self):
        if hasattr(self,'engine'):
            self.engine.dispose()
            with self.admin.begin() as c:
                c.execute(text(f'DROP SCHEMA {self.schema} CASCADE'))
            self.admin.dispose()

    def snapshot(self):
        with self.engine.connect() as c:
            return (c.execute(text('SELECT id,name,email,password,active,is_superuser,terms_version,terms_accepted_at FROM users ORDER BY id')).all(),
                    c.execute(text('SELECT * FROM input_data')).all())

    def test_additive_idempotent_check_backfill_and_unchanged_acceptance(self):
        before=self.snapshot()
        with self.assertRaises(SchemaError):
            migrate(self.engine,check=True)
        migrate(self.engine)
        migrate(self.engine,check=True)
        migrate(self.engine)
        self.assertEqual(before,self.snapshot())
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text('SELECT registered_at,registration_completed FROM users ORDER BY id')).all(),[(None,True),(None,None)])
        with self.engine.begin() as c:
            c.execute(text("UPDATE users SET registered_at='2026-01-31T12:00:00Z',registration_completed=false WHERE id=2"))
        migrate(self.engine)
        columns={c['name']:c for c in inspect(self.engine).get_columns('users')}
        self.assertTrue(columns['registered_at']['type'].timezone)
        for name in ('registered_at','registration_completed'):
            self.assertTrue(columns[name]['nullable'])
            self.assertIsNone(columns[name]['default'])
        self.assertEqual(inspect(self.engine).get_indexes('input_data')[0]['column_names'],['created_at'])
        with self.engine.connect() as c:
            self.assertEqual(c.execute(text('SELECT registration_completed FROM users WHERE id=2')).scalar(),False)

    def test_check_is_readonly_and_cli_apply_check(self):
        url=self.engine.url
        env={**os.environ,'DB_ENGINE':'postgres','DB_USER':url.username,
             'DB_PASSWORD':url.password,'DB_HOST':url.host,'DB_PORT':str(url.port or 5432),
             'USERS_DB_NAME':url.database,'PGOPTIONS':f'-csearch_path={self.schema}'}
        def cli(*args):
            return subprocess.run([sys.executable,'-m','auth.migrate_retention',*args],env=env,
                                  capture_output=True,text=True,timeout=40)
        self.assertEqual(cli('--check').returncode,1)
        self.assertEqual(cli().returncode,0)
        with self.engine.begin() as c:
            c.execute(text('UPDATE users SET registration_completed=NULL WHERE id=1'))
        self.assertEqual(cli('--check').returncode,0)
        with self.engine.connect() as c:
            self.assertIsNone(c.execute(text('SELECT registration_completed FROM users WHERE id=1')).scalar())
        self.assertEqual(cli().returncode,0)

    def test_incompatible_columns_missing_tables_and_index_rollback(self):
        for name,definition in (('registered_at','TIMESTAMP NULL'),('registered_at','TIMESTAMPTZ NOT NULL DEFAULT now()'),
                                ('registration_completed','INTEGER NULL'),('registration_completed','BOOLEAN NULL DEFAULT false')):
            with self.subTest(name=name,definition=definition):
                with self.engine.begin() as c:
                    c.execute(text(f'ALTER TABLE users ADD COLUMN {name} {definition}'))
                for check in (False,True):
                    with self.assertRaises(SchemaError):
                        migrate(self.engine,check=check)
                with self.engine.begin() as c:
                    c.execute(text(f'ALTER TABLE users DROP COLUMN {name}'))
        with self.engine.begin() as c:
            c.execute(text('CREATE INDEX ix_users_retention ON users (active)'))
        with self.assertRaises(SchemaError):
            migrate(self.engine)
        self.assertNotIn('registered_at',[c['name'] for c in inspect(self.engine).get_columns('users')])
        with self.engine.begin() as c:
            c.execute(text('DROP INDEX ix_users_retention'))
            c.execute(text('ALTER TABLE input_data RENAME TO old_input'))
        with self.assertRaises(SchemaError):
            migrate(self.engine)

    def test_ddl_error_rolls_back_all_new_columns_and_backfill(self):
        def fail(conn,cursor,statement,parameters,context,executemany):
            if 'CREATE INDEX ix_input_data_created_at' in statement:
                raise RuntimeError('injected private failure')
        event.listen(self.engine,'before_cursor_execute',fail)
        try:
            with self.assertRaises(RuntimeError):
                migrate(self.engine)
        finally:
            event.remove(self.engine,'before_cursor_execute',fail)
        names=[c['name'] for c in inspect(self.engine).get_columns('users')]
        self.assertNotIn('registered_at',names)
        self.assertNotIn('registration_completed',names)
