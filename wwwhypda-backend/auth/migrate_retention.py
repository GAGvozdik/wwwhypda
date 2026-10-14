"""Добавляющая PostgreSQL-миграция: python -m auth.migrate_retention [--check]."""
import argparse
import sys
from sqlalchemy import Boolean, DateTime, inspect, text
from auth.migrate_terms_acceptance import SchemaError, configured_engine

COLUMNS = {"registered_at": "TIMESTAMP WITH TIME ZONE", "registration_completed": "BOOLEAN"}
INDEXES = {
    "users": ("ix_users_retention", ["registration_completed", "active", "registered_at"]),
    "input_data": ("ix_input_data_created_at", ["created_at"]),
}


def validate_column(column):
    kind = column["type"]
    compatible = (isinstance(kind, DateTime) and kind.timezone
                  if column["name"] == "registered_at" else isinstance(kind, Boolean))
    if not compatible or not column["nullable"] or column.get("default") is not None:
        raise SchemaError("Несовместимая структура колонок retention.")


def migrate(engine, check=False):
    if engine.dialect.name != "postgresql":
        raise SchemaError("Миграция требует PostgreSQL.")
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        inspector = inspect(connection)
        schema = inspector.default_schema_name
        quoted = connection.dialect.identifier_preparer.quote_schema(schema)
        if any(not inspector.has_table(table, schema=schema) for table in INDEXES):
            raise SchemaError("Требуются таблицы users и input_data.")
        columns = {c["name"]: c for c in inspector.get_columns("users", schema=schema)}
        for name in COLUMNS:
            if name in columns:
                validate_column(columns[name])
        missing = [name for name in COLUMNS if name not in columns]
        required_indexes = []
        for table, (name, fields) in INDEXES.items():
            existing = inspector.get_indexes(table, schema=schema)
            named = next((i for i in existing if i["name"] == name), None)
            if named and (named["column_names"] != fields or named["unique"]
                          or named.get("dialect_options", {}).get("postgresql_where")):
                raise SchemaError("Несовместимый индекс retention.")
            if not any(i["column_names"] == fields and not i["unique"]
                       and not i.get("dialect_options", {}).get("postgresql_where") for i in existing):
                required_indexes.append((table, name, fields))
        if check and (missing or required_indexes):
            raise SchemaError("Миграция retention ещё не применена.")
        if check:
            return
        for name in missing:
            connection.execute(text(f'ALTER TABLE {quoted}.users ADD COLUMN {name} {COLUMNS[name]} NULL'))
        # Current activation proves completion, never age. Inactive unknown rows stay NULL.
        connection.execute(text(f'UPDATE {quoted}.users SET registration_completed=true '
                                'WHERE active=true AND registration_completed IS NULL'))
        for table, name, fields in required_indexes:
            connection.execute(text(f'CREATE INDEX {name} ON {quoted}.{table} ({", ".join(fields)})'))
        inspector.clear_cache()
        for column in inspector.get_columns("users", schema=schema):
            if column["name"] in COLUMNS:
                validate_column(column)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    engine = None
    try:
        engine = configured_engine()
        migrate(engine, check=args.check)
    except SchemaError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception:
        print("Проверка/миграция retention не выполнена; транзакция отменена.", file=sys.stderr)
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    print("Схема retention проверена." if args.check else "Миграция retention завершена.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
