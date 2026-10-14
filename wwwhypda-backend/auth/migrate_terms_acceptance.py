"""Добавляющая миграция users_db. Запуск: python -m auth.migrate_terms_acceptance [--check]."""
import argparse
import os
import sys

from sqlalchemy import DateTime, String, create_engine, inspect, text
from sqlalchemy.engine import URL


class SchemaError(Exception):
    """Отсутствующая или несовместимая схема."""


COLUMNS = {
    "terms_accepted_at": "TIMESTAMP WITH TIME ZONE",
    "terms_version": "VARCHAR(64)",
}


def validate_column(column):
    kind = column["type"]
    if column["name"] == "terms_accepted_at":
        compatible = isinstance(kind, DateTime) and kind.timezone
    else:
        compatible = isinstance(kind, String) and kind.length == 64
    if not compatible or not column["nullable"] or column.get("default") is not None:
        raise SchemaError("Несовместимая структура колонок принятия договора.")


def migrate(engine, check=False):
    """Проверяет и обновляет схему без импорта приложения и чтения env-файлов."""
    if engine.dialect.name != "postgresql":
        raise SchemaError("Миграция требует PostgreSQL.")
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        inspector = inspect(connection)
        schema = inspector.default_schema_name
        if not inspector.has_table("users", schema=schema):
            raise SchemaError("Таблица users отсутствует.")
        columns = {c["name"]: c for c in inspector.get_columns("users", schema=schema)}
        for name in COLUMNS:
            if name in columns:
                validate_column(columns[name])
        missing = [name for name in COLUMNS if name not in columns]
        if check and missing:
            raise SchemaError("Миграция ещё не применена.")
        quoted_schema = connection.dialect.identifier_preparer.quote_schema(schema)
        for name in missing:
            connection.execute(text(f'ALTER TABLE {quoted_schema}.users ADD COLUMN {name} {COLUMNS[name]} NULL'))
        inspector.clear_cache()
        for column in inspector.get_columns("users", schema=schema):
            if column["name"] in COLUMNS:
                validate_column(column)


def configured_engine():
    """Создаёт engine из настроек процесса без чтения env-файлов."""
    required = ("DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT", "USERS_DB_NAME")
    if os.environ.get("DB_ENGINE") != "postgres" or any(not os.environ.get(k) for k in required):
        raise SchemaError("Требуются DB_ENGINE=postgres и все настройки подключения users_db.")
    port = int(os.environ["DB_PORT"])
    if not 1 <= port <= 65535:
        raise SchemaError("Некорректный порт users_db.")
    url = URL.create("postgresql+psycopg2", username=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"], host=os.environ["DB_HOST"], port=port,
        database=os.environ["USERS_DB_NAME"])
    return create_engine(url, connect_args={"connect_timeout": 5}, hide_parameters=True)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Только проверить схему, без DDL/DML")
    args = parser.parse_args(argv)
    engine = None
    try:
        engine = configured_engine()
        migrate(engine, check=args.check)
    except SchemaError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception:
        print("Не удалось проверить или обновить схему users_db; транзакция отменена.", file=sys.stderr)
        return 1
    finally:
        if engine is not None:
            engine.dispose()
    print("Схема принятия договора проверена." if args.check else "Миграция принятия договора завершена.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
