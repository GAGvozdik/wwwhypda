"""Единый порядок users_db: transaction advisory lock → User → InputData/code.

Сериализует короткие транзакции с retention/self-delete, включая editing_by
без FK. PostgreSQL lock освобождается при commit/rollback; SQLite — no-op.
"""
from sqlalchemy import text
from common_defenitions import db
from auth.auth_models import User


def lock_users_transaction():
    engine = db.session.get_bind(mapper=User)
    if engine.dialect.name == "postgresql":
        connection = db.session.connection(bind_arguments={"mapper": User})
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        connection.execute(text("SELECT pg_advisory_xact_lock(207002, 1)"))
