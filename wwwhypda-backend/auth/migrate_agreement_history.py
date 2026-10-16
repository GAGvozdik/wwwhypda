"""Add-only explicit acceptance ledger. PostgreSQL only; no app/env-file import."""
import argparse
import sys

from sqlalchemy import (Column, DateTime, ForeignKey, Integer, MetaData, String,
    Table, UniqueConstraint, inspect, text)
from auth.migrate_terms_acceptance import SchemaError, configured_engine, migrate as check_legacy


def validate(connection):
    inspector = inspect(connection)
    schema = inspector.default_schema_name
    table = "user_agreement_acceptances"
    if not inspector.has_table(table, schema=schema):
        raise SchemaError("Миграция истории принятия ещё не применена.")
    columns = {column["name"]: column for column in inspector.get_columns(table, schema=schema)}
    if set(columns) != {"id", "user_id", "version", "accepted_at"}:
        raise SchemaError("Несовместимая структура истории принятия.")
    for name in ("id", "user_id"):
        if not isinstance(columns[name]["type"], Integer) or columns[name]["nullable"]:
            raise SchemaError("Несовместимые идентификаторы истории принятия.")
    version, instant = columns["version"], columns["accepted_at"]
    if (not isinstance(version["type"], String) or version["type"].length != 64
            or version["nullable"] or version.get("default") is not None
            or not isinstance(instant["type"], DateTime) or not instant["type"].timezone
            or instant["nullable"] or instant.get("default") is not None):
        raise SchemaError("Несовместимые поля истории принятия.")
    unique = inspector.get_unique_constraints(table, schema=schema)
    if not any(set(item["column_names"]) == {"user_id", "version"} for item in unique):
        raise SchemaError("Нет уникальности user/version.")
    foreign = inspector.get_foreign_keys(table, schema=schema)
    if not any(item["constrained_columns"] == ["user_id"]
            and item["referred_table"] == "users" and item["referred_columns"] == ["id"]
            and (item.get("options", {}).get("ondelete") or "").upper() == "CASCADE" for item in foreign):
        raise SchemaError("Нет требуемого FK/cascade истории принятия.")


def migrate(engine, check=False):
    if engine.dialect.name != "postgresql":
        raise SchemaError("Миграция требует PostgreSQL.")
    check_legacy(engine, check=True)
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        connection.execute(text("SELECT pg_advisory_xact_lock(207002, 1)"))
        schema = inspect(connection).default_schema_name
        if not inspect(connection).has_table("user_agreement_acceptances", schema=schema):
            if check:
                raise SchemaError("Миграция истории принятия ещё не применена.")
            metadata = MetaData(schema=schema)
            Table("users", metadata, Column("id", Integer, primary_key=True))
            ledger = Table("user_agreement_acceptances", metadata,
                Column("id", Integer, primary_key=True),
                Column("user_id", Integer, ForeignKey(schema+".users.id", ondelete="CASCADE"), nullable=False),
                Column("version", String(64), nullable=False),
                Column("accepted_at", DateTime(timezone=True), nullable=False),
                UniqueConstraint("user_id", "version", name="uq_agreement_acceptance_user_version"))
            ledger.create(connection)
        validate(connection)
    # No DML/backfill: original versions/dates and unknown legacy facts stay unchanged.


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    engine = None
    try:
        engine = configured_engine()
        migrate(engine, check=args.check)
    except SchemaError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception:
        print("Не удалось проверить или создать историю принятия; транзакция отменена.", file=sys.stderr)
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    print("Схема истории принятия проверена.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
