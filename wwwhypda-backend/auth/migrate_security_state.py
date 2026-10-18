"""Add-only session/reset security state. No backfill, account or acceptance DML."""
import argparse
import sys
from sqlalchemy import MetaData, Table, Column, Integer, inspect, text
from auth.migrate_terms_acceptance import configured_engine, SchemaError
from auth.auth_models import AuthSession, ResetLimit


def models():
    return (AuthSession, ResetLimit)


def validate(connection, model):
    inspector=inspect(connection)
    schema=inspector.default_schema_name
    expected=model.__table__
    if not inspector.has_table(expected.name,schema=schema):
        raise SchemaError('Миграция security state ещё не применена.')
    columns={c['name']:c for c in inspector.get_columns(expected.name,schema=schema)}
    if set(columns)!=set(expected.columns.keys()):raise SchemaError('Несовместимые поля security state.')
    for name, field in expected.columns.items():
        actual=columns[name]
        if (not isinstance(actual['type'],type(field.type)) or actual['nullable']!=field.nullable
            or getattr(actual['type'],'length',None)!=getattr(field.type,'length',None)
            or getattr(actual['type'],'timezone',None)!=getattr(field.type,'timezone',None)):
            raise SchemaError('Несовместимый тип security state.')
    if inspector.get_pk_constraint(expected.name,schema=schema)['constrained_columns']!=[c.name for c in expected.primary_key]:
        raise SchemaError('Несовместимый ключ security state.')
    fks=inspector.get_foreign_keys(expected.name,schema=schema)
    if not any(fk['constrained_columns']==['user_id'] and fk['referred_table']=='users'
        and fk['referred_columns']==['id'] and fk.get('options',{}).get('ondelete','').upper()=='CASCADE' for fk in fks):
        raise SchemaError('Отсутствует cascade user FK security state.')
    indexes={tuple(i['column_names']) for i in inspector.get_indexes(expected.name,schema=schema)}
    if any(tuple(c.name for c in index.columns) not in indexes for index in expected.indexes):
        raise SchemaError('Отсутствуют индексы security state.')
    expected_checks={str(c.sqltext).replace(' ','') for c in expected.constraints if hasattr(c,'sqltext')}
    actual_checks={c['sqltext'].replace(' ','').replace('(','').replace(')','') for c in inspector.get_check_constraints(expected.name,schema=schema)}
    if not expected_checks<=actual_checks:raise SchemaError('Отсутствуют ограничения security state.')


def migrate(engine,check=False):
    if engine.dialect.name!='postgresql':raise SchemaError('Миграция требует PostgreSQL.')
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        connection.execute(text('SELECT pg_advisory_xact_lock(207002, 1)'))
        schema=inspect(connection).default_schema_name
        if not inspect(connection).has_table('users',schema=schema):raise SchemaError('Требуется существующая users schema.')
        metadata=MetaData(schema=schema)
        Table('users',metadata,Column('id',Integer,primary_key=True))
        for model in models():
            table=model.__table__.to_metadata(metadata,schema=schema)
            if not inspect(connection).has_table(table.name,schema=schema):
                if check:raise SchemaError('Миграция security state ещё не применена.')
                table.create(connection)
            validate(connection,model)


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args(argv);engine=None
    try:
        engine=configured_engine();migrate(engine,check=args.check)
        print('Схема security state проверена.');return 0
    except SchemaError as error:print(str(error),file=sys.stderr)
    except Exception:print('Security state: операция отменена.',file=sys.stderr)
    finally:
        if engine is not None:engine.dispose()
    return 1


if __name__=='__main__':raise SystemExit(main())
