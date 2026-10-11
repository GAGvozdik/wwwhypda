#!/bin/sh
set -eu

# Create the two local databases without changing existing databases.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
SELECT 'CREATE DATABASE wwhypda'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wwhypda')
\gexec
SELECT 'CREATE DATABASE users_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'users_db')
\gexec
SQL

# Follow the documented PostgreSQL dump restoration procedure.
# Only restore into empty databases; preserve existing development data.
for database in wwhypda users_db; do
    tables=$(psql --username "$POSTGRES_USER" --dbname "$database" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
    if [ "$tables" = "0" ]; then
        psql -v ON_ERROR_STOP=1 --single-transaction --username "$POSTGRES_USER" --dbname "$database" -f "/dev-data/${database}_dump.sql"
        echo "Restored development database: $database"
    else
        echo "Preserving existing development database: $database"
    fi
done

# Align historical dump table names with the models in the restored commit.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname wwhypda <<'SQL'
ALTER TABLE IF EXISTS public."Status" RENAME TO status;
ALTER TABLE IF EXISTS public."Source" RENAME TO source;
ALTER TABLE IF EXISTS public."Contact" RENAME TO contact;
ALTER TABLE IF EXISTS public."Site_info" RENAME TO site_info;
ALTER TABLE IF EXISTS public."Measure_group" RENAME TO measure_group;
SQL

# Restore missing auto-increment defaults from the historical auth dump.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname users_db <<'SQL'
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq OWNED BY public.users.id;
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq');
SELECT setval('public.users_id_seq', COALESCE((SELECT MAX(id) FROM public.users), 0) + 1, false);
CREATE SEQUENCE IF NOT EXISTS public.confirmation_codes_id_seq OWNED BY public.confirmation_codes.id;
ALTER TABLE public.confirmation_codes ALTER COLUMN id SET DEFAULT nextval('public.confirmation_codes_id_seq');
SELECT setval('public.confirmation_codes_id_seq', COALESCE((SELECT MAX(id) FROM public.confirmation_codes), 0) + 1, false);
CREATE SEQUENCE IF NOT EXISTS public.input_data_id_seq OWNED BY public.input_data.id;
ALTER TABLE public.input_data ALTER COLUMN id SET DEFAULT nextval('public.input_data_id_seq');
SELECT setval('public.input_data_id_seq', COALESCE((SELECT MAX(id) FROM public.input_data), 0) + 1, false);
SQL
