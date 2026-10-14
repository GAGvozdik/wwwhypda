"""Реальный PostgreSQL в одноразовой БД TEST_AUTH_DATABASE_URI; отдельная схема на тест."""
import os
import unittest
import uuid
import subprocess
import sys
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from auth.auth_models import User
from auth.terms import CURRENT_TERMS_VERSION
from unittest.mock import patch
from sqlalchemy import create_engine, inspect, text, event
from auth.migrate_terms_acceptance import migrate, SchemaError, configured_engine, main


class ConfigurationTests(unittest.TestCase):
    def test_no_fallback_or_secret_output(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(SchemaError):
                configured_engine()
            self.assertEqual(main(["--check"]),1)
        with patch.dict(os.environ,dict(DB_ENGINE="postgres",DB_USER="u",DB_PASSWORD="private",DB_HOST="db",DB_PORT="bad",USERS_DB_NAME="users"),clear=True):
            with patch("sys.stderr") as stderr:
                self.assertEqual(main([]),1)
                self.assertNotIn("private",str(stderr.write.call_args_list))


class PostgreSQLTermsMigrationTests(unittest.TestCase):
    def setUp(self):
        uri = os.environ.get("TEST_AUTH_DATABASE_URI", "")
        if not uri.startswith("postgresql"):
            self.skipTest("Нужна одноразовая PostgreSQL")
        self.admin = create_engine(uri)
        self.schema = "terms_test_"+uuid.uuid4().hex
        with self.admin.begin() as c:
            c.execute(text(f'CREATE SCHEMA {self.schema}'))
        self.engine = create_engine(uri,connect_args={"options":f"-csearch_path={self.schema}"})
        with self.engine.begin() as c:
            c.execute(text("CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100) UNIQUE, password VARCHAR(200), active BOOLEAN, is_superuser BOOLEAN)"))
            c.execute(text("INSERT INTO users VALUES (1,'Old','old@example.test','hashed',true,false),(2,'Inactive','inactive@example.test','hashed2',false,true)"))
            c.execute(text("CREATE TABLE related (user_id INTEGER REFERENCES users(id), data TEXT)"))
            c.execute(text("INSERT INTO related VALUES (1,'preserved')"))

    def tearDown(self):
        if hasattr(self,"engine"):
            self.engine.dispose()
            with self.admin.begin() as c:
                c.execute(text(f'DROP SCHEMA {self.schema} CASCADE'))
            self.admin.dispose()

    def snapshot(self):
        with self.engine.connect() as c:
            return (c.execute(text("SELECT id,name,email,password,active,is_superuser FROM users ORDER BY id")).all(),c.execute(text("SELECT * FROM related")).all())

    def test_apply_repeat_check_data_nulls_and_timezone(self):
        before = self.snapshot()
        with self.assertRaises(SchemaError):
            migrate(self.engine,check=True)
        self.assertNotIn("terms_version",[c["name"] for c in inspect(self.engine).get_columns("users")])
        migrate(self.engine)
        self.assertEqual(self.snapshot(),before)
        with self.engine.begin() as c:
            self.assertEqual(c.execute(text("SELECT terms_accepted_at,terms_version FROM users ORDER BY id")).all(),[(None,None),(None,None)])
            c.execute(text("UPDATE users SET terms_accepted_at='2026-10-14T12:00:00+00:00',terms_version='first' WHERE id=1"))
        migrate(self.engine)
        migrate(self.engine,check=True)
        self.assertEqual(self.snapshot(),before)
        with self.engine.begin() as c:
            for zone in ('UTC','Europe/Rome','America/New_York'):
                c.execute(text("SELECT set_config('TimeZone',:zone,true)"),dict(zone=zone))
                instant,version = c.execute(text("SELECT extract(epoch FROM terms_accepted_at),terms_version FROM users WHERE id=1")).one()
                self.assertEqual(int(instant),1791979200)
                self.assertEqual(version,'first')
        columns={c['name']:c for c in inspect(self.engine).get_columns('users')}
        self.assertTrue(columns['terms_accepted_at']['type'].timezone)
        self.assertEqual(columns['terms_version']['type'].length,64)

    def test_cli_apply_check_and_new_user_survive_repeat(self):
        url = self.engine.url
        env = {**os.environ, "DB_ENGINE":"postgres", "DB_USER":url.username,
            "DB_PASSWORD":url.password or "isolated-test-only", "DB_HOST":url.host,
            "DB_PORT":str(url.port or 5432), "USERS_DB_NAME":url.database,
            "PGOPTIONS":f"-csearch_path={self.schema}"}
        def cli(*args):
            return subprocess.run([sys.executable,"-m","auth.migrate_terms_acceptance",*args],
                env=env,capture_output=True,text=True,timeout=40)
        self.assertEqual(cli("--check").returncode,1)
        self.assertEqual(cli().returncode,0)
        with self.engine.begin() as c:
            c.execute(text("SELECT setval(pg_get_serial_sequence('users','id'),2)"))
        with Session(self.engine) as session:
            user = User(name="New",email="new@example.test",active=False,
                terms_accepted_at=datetime.now(timezone.utc),terms_version=CURRENT_TERMS_VERSION)
            user.set_password("Password1!")
            session.add(user)
            session.commit()
            original = (user.id,user.terms_version,user.terms_accepted_at)
        self.assertEqual(cli().returncode,0)
        self.assertEqual(cli("--check").returncode,0)
        with Session(self.engine) as session:
            user = session.get(User,original[0])
            self.assertEqual((user.id,user.terms_version,user.terms_accepted_at),original)

    def test_second_ddl_failure_rolls_back_first(self):
        def fail(conn,cursor,statement,parameters,context,executemany):
            if 'ADD COLUMN terms_version' in statement:
                raise RuntimeError('injected failure')
        event.listen(self.engine,'before_cursor_execute',fail)
        try:
            with self.assertRaises(RuntimeError):
                migrate(self.engine)
        finally:
            event.remove(self.engine,'before_cursor_execute',fail)
        names=[c['name'] for c in inspect(self.engine).get_columns('users')]
        self.assertNotIn('terms_accepted_at',names)
        self.assertNotIn('terms_version',names)

    def test_incompatible_type_nullability_default_and_missing_users(self):
        for definition in ("INTEGER NULL", "VARCHAR(63) NULL", "VARCHAR(64) NOT NULL DEFAULT 'x'", "VARCHAR(64) NULL DEFAULT 'x'"):
            with self.subTest(definition=definition):
                with self.engine.begin() as c:
                    c.execute(text('ALTER TABLE users ADD COLUMN terms_version '+definition))
                for check in (False,True):
                    with self.assertRaises(SchemaError):
                        migrate(self.engine,check=check)
                self.assertNotIn('terms_accepted_at',[c['name'] for c in inspect(self.engine).get_columns('users')])
                with self.engine.begin() as c:
                    c.execute(text('ALTER TABLE users DROP COLUMN terms_version'))
        with self.engine.begin() as c:
            c.execute(text('ALTER TABLE users RENAME TO old_users'))
        with self.assertRaises(SchemaError):
            migrate(self.engine)
