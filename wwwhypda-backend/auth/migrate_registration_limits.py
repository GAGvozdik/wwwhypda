"""Add-only shared registration target budget; PostgreSQL only, no env/app loader."""
import argparse
import re
import sys
from sqlalchemy import Column, Integer, DateTime, ForeignKey, MetaData, Table, CheckConstraint, inspect, text
from auth.migrate_terms_acceptance import SchemaError, configured_engine


def validate(connection):
    inspector=inspect(connection)
    name='registration_limits'
    if not inspector.has_table(name):
        raise SchemaError('Миграция лимитов регистрации ещё не применена.')
    columns={item['name']:item for item in inspector.get_columns(name)}
    if set(columns)!={'user_id','challenge_id','failed_attempts','sent_count','window_started'}:
        raise SchemaError('Несовместимая схема лимитов регистрации.')
    for field in ('user_id','challenge_id','failed_attempts','sent_count'):
        value=columns[field]
        if not isinstance(value['type'],Integer) or value['nullable']!=(field=='challenge_id'):
            raise SchemaError('Несовместимые поля лимитов регистрации.')
    value=columns['window_started']
    if not isinstance(value['type'],DateTime) or not value['type'].timezone or not value['nullable']:
        raise SchemaError('Несовместимая дата лимита регистрации.')
    if inspector.get_pk_constraint(name)['constrained_columns']!=['user_id']:
        raise SchemaError('Несовместимый ключ лимита регистрации.')
    if not any(fk['constrained_columns']==['user_id'] and fk['referred_table']=='users'
            and fk['referred_columns']==['id'] and fk.get('options',{}).get('ondelete','').upper()=='CASCADE'
            for fk in inspector.get_foreign_keys(name)):
        raise SchemaError('Несовместимая связь лимита регистрации.')
    checks={re.sub(r'[\s()]','',item['sqltext']) for item in inspector.get_check_constraints(name)}
    if not {'failed_attempts>=0','sent_count>=0'} <= checks:
        raise SchemaError('Не заданы ограничения счётчиков регистрации.')


def migrate(engine,check=False):
    if engine.dialect.name!='postgresql':
        raise SchemaError('Миграция требует PostgreSQL.')
    with engine.begin() as connection:
        connection.execute(text("SET LOCAL lock_timeout = '5s'"))
        connection.execute(text("SET LOCAL statement_timeout = '30s'"))
        connection.execute(text('SELECT pg_advisory_xact_lock(207002, 1)'))
        inspector=inspect(connection)
        if not inspector.has_table('users'):
            raise SchemaError('Сначала требуется существующая схема пользователей.')
        if not inspector.has_table('registration_limits'):
            if check:
                raise SchemaError('Миграция лимитов регистрации ещё не применена.')
            schema=inspector.default_schema_name
            metadata=MetaData(schema=schema)
            Table('users',metadata,Column('id',Integer,primary_key=True))
            table=Table('registration_limits',metadata,
                Column('user_id',Integer,ForeignKey(schema+'.users.id',ondelete='CASCADE'),primary_key=True),
                Column('challenge_id',Integer,nullable=True),
                Column('failed_attempts',Integer,nullable=False),
                Column('sent_count',Integer,nullable=False),
                Column('window_started',DateTime(timezone=True),nullable=True),
                CheckConstraint('failed_attempts >= 0',name='ck_registration_failed_nonnegative'),
                CheckConstraint('sent_count >= 0',name='ck_registration_sent_nonnegative'))
            table.create(connection)
        validate(connection)
    # No account/code backfill; valid legacy challenges are adopted on first confirmation.


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args(argv);engine=None
    try:
        engine=configured_engine();migrate(engine,check=args.check)
        print('Схема лимитов регистрации проверена.')
        return 0
    except SchemaError as error:
        print(str(error),file=sys.stderr)
    except Exception:
        print('Не удалось проверить лимиты регистрации; транзакция отменена.',file=sys.stderr)
    finally:
        if engine is not None:engine.dispose()
    return 1


if __name__=='__main__':
    raise SystemExit(main())
