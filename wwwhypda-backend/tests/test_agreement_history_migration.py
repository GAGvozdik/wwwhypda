"""New ledger DDL/constraints checked on real isolated PostgreSQL."""
from datetime import datetime,timezone
import unittest
from sqlalchemy import inspect,text
from sqlalchemy.exc import IntegrityError
from auth.migrate_agreement_history import migrate
from auth.migrate_terms_acceptance import SchemaError
from tests import test_terms_migration as fixtures


class HistoryMigrationTests(unittest.TestCase):
    tearDown=fixtures.PostgreSQLTermsMigrationTests.tearDown
    snapshot=fixtures.PostgreSQLTermsMigrationTests.snapshot

    def setUp(self):
        fixtures.PostgreSQLTermsMigrationTests.setUp(self)
        fixtures.migrate(self.engine)

    def test_check_apply_repeat_preserves_legacy_and_does_not_backfill(self):
        with self.engine.begin() as c:
            c.execute(text("UPDATE users SET terms_version='known-old', terms_accepted_at='2020-01-01T00:00:00Z' WHERE id=1"))
        before=self.snapshot()
        with self.assertRaises(SchemaError):migrate(self.engine,check=True)
        migrate(self.engine);migrate(self.engine);migrate(self.engine,check=True)
        self.assertEqual(self.snapshot(),before)
        with self.engine.begin() as c:
            self.assertEqual(c.execute(text("SELECT count(*) FROM user_agreement_acceptances")).scalar(),0)

    def test_unique_foreign_key_and_cascade_constraints_are_real(self):
        migrate(self.engine)
        with self.engine.begin() as c:
            c.execute(text("INSERT INTO user_agreement_acceptances(user_id,version,accepted_at) VALUES(2,'old',now())"))
        with self.assertRaises(IntegrityError):
            with self.engine.begin() as c:
                c.execute(text("INSERT INTO user_agreement_acceptances(user_id,version,accepted_at) VALUES(2,'old',now())"))
        with self.assertRaises(IntegrityError):
            with self.engine.begin() as c:
                c.execute(text("INSERT INTO user_agreement_acceptances(user_id,version,accepted_at) VALUES(999,'old',now())"))
        with self.engine.begin() as c:
            c.execute(text("DELETE FROM users WHERE id=2"))
            self.assertEqual(c.execute(text("SELECT count(*) FROM user_agreement_acceptances")).scalar(),0)

    def test_incompatible_table_is_not_repaired_silently(self):
        with self.engine.begin() as c:
            c.execute(text("CREATE TABLE user_agreement_acceptances(id INTEGER PRIMARY KEY,user_id INTEGER,version VARCHAR(12),accepted_at TIMESTAMP)"))
        for check in (False,True):
            with self.assertRaises(SchemaError):migrate(self.engine,check=check)
        self.assertEqual(inspect(self.engine).get_columns("user_agreement_acceptances")[2]["type"].length,12)
