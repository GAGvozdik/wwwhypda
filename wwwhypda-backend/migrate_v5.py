import os
import sqlite3
import psycopg2
import re
from dotenv import load_dotenv

# Загрузка переменных
basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(basedir, 'env.dev'))

# ПРИНУДИТЕЛЬНО для локального запуска
os.environ['DB_HOST'] = 'localhost'

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = 'localhost'
DB_PORT = os.getenv('DB_PORT', '5432')
MAIN_DB_NAME = os.getenv('MAIN_DB_NAME', 'wwhypda')
USERS_DB_NAME = os.getenv('USERS_DB_NAME', 'users_db')

def clean_sql_definition(sql, table_name):
    """Удаляет FK и адаптирует типы данных."""
    sql = sql.replace('`', '"')
    
    # Извлекаем FK для последующего добавления
    fk_matches = re.findall(r'CONSTRAINT\s+(\"\w+\"|\w+)\s+FOREIGN\s+KEY\s*\((.*?)\)\s+REFERENCES\s+(\"\w+\"|\w+)\s*\((.*?)\)(.*?),?', sql, re.IGNORECASE | re.DOTALL)
    
    # Удаляем строки с CONSTRAINT ... FOREIGN KEY
    lines = sql.split('\n')
    new_lines = []
    for line in lines:
        if 'FOREIGN KEY' not in line.upper():
            new_lines.append(line)
    
    clean_sql = '\n'.join(new_lines)
    # Убираем лишние запятые перед закрывающей скобкой
    clean_sql = re.sub(r',\s*\)', r'\n)', clean_sql)
    
    # Адаптация типов
    clean_sql = re.sub(r'(\"\w+\"|\w+)\s+integer\s+NOT\s+NULL\s+PRIMARY\s+KEY\s+AUTOINCREMENT', r'\1 SERIAL PRIMARY KEY', clean_sql, flags=re.IGNORECASE)
    clean_sql = re.sub(r'PRIMARY\s+KEY\s+AUTOINCREMENT', 'PRIMARY KEY', clean_sql, flags=re.IGNORECASE)
    clean_sql = clean_sql.replace('datetime', 'TIMESTAMP').replace('DATETIME', 'TIMESTAMP')
    clean_sql = clean_sql.replace('JSON', 'JSONB')
    clean_sql = re.sub(r'\bfloat\b', 'DOUBLE PRECISION', clean_sql, flags=re.IGNORECASE)
    
    return clean_sql, fk_matches

def migrate_db(sqlite_path, dbname):
    print(f"\n>>> Миграция {dbname}")
    sl_conn = sqlite3.connect(sqlite_path)
    sl_cur = sl_conn.cursor()
    
    pg_conn = psycopg2.connect(dbname=dbname, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
    pg_conn.autocommit = True
    pg_cur = pg_conn.cursor()

    sl_cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = sl_cur.fetchall()
    
    all_fks = []
    table_names_map = {t[0].lower(): t[0] for t in tables}

    # 1. Создаем таблицы без FK
    print("--- Шаг 1: Создание таблиц без связей ---")
    for t_name, t_sql in tables:
        clean_sql, fks = clean_sql_definition(t_sql, t_name)
        for fk in fks:
            all_fks.append((t_name, fk))
        
        pg_cur.execute(f'DROP TABLE IF EXISTS "{t_name}" CASCADE;')
        try:
            pg_cur.execute(clean_sql)
            print(f"  [OK] {t_name}")
        except Exception as e:
            print(f"  [ERR] {t_name}: {e}")

    # 2. Переносим данные
    print("--- Шаг 2: Перенос данных ---")
    pg_cur.execute("SET session_replication_role = 'replica';")
    for t_name, _ in tables:
        sl_cur.execute(f'SELECT * FROM "{t_name}";')
        rows = sl_cur.fetchall()
        if not rows: continue
        
        sl_cur.execute(f'PRAGMA table_info("{t_name}");')
        cols = [c[1] for c in sl_cur.fetchall()]
        
        col_names = ", ".join([f'"{c}"' for c in cols])
        placeholders = ", ".join(["%s"] * len(cols))
        insert_query = f'INSERT INTO "{t_name}" ({col_names}) VALUES ({placeholders});'
        
        formatted_rows = []
        for row in rows:
            r = list(row)
            if t_name == 'users':
                for i, col_name in enumerate(cols):
                    if col_name in ['active', 'is_superuser']: r[i] = bool(r[i]) if r[i] is not None else None
            formatted_rows.append(tuple(r))

        try:
            pg_cur.executemany(insert_query, formatted_rows)
            print(f"  [OK] {t_name} ({len(rows)} строк)")
        except Exception as e:
            print(f"  [ERR] {t_name}: {e}")

    # 3. Восстанавливаем FK
    print("--- Шаг 3: Восстановление связей (ALTER TABLE) ---")
    for t_name, fk in all_fks:
        # fk: (constraint_name, local_cols, ref_table, ref_cols, extra)
        constraint_name, local_cols, ref_table, ref_cols, extra = fk
        
        # Исправляем имя ссылочной таблицы (регистр)
        ref_table_clean = ref_table.strip('"').lower()
        if ref_table_clean in table_names_map:
            ref_table_real = table_names_map[ref_table_clean]
        else:
            ref_table_real = ref_table.strip('"')

        alter_sql = f'ALTER TABLE "{t_name}" ADD CONSTRAINT {constraint_name} FOREIGN KEY ({local_cols}) REFERENCES "{ref_table_real}" ({ref_cols}) {extra};'
        # Убираем возможные запятые в конце
        alter_sql = alter_sql.replace(',;', ';')
        
        try:
            pg_cur.execute(alter_sql)
            print(f"  [OK] FK: {t_name} -> {ref_table_real}")
        except Exception as e:
            print(f"  [SKIP] FK {t_name} -> {ref_table_real}: {e}")

    # 4. Sequences
    print("--- Шаг 4: Обновление Sequences ---")
    for t_name, _ in tables:
        sl_cur.execute(f'PRAGMA table_info("{t_name}");')
        for col in sl_cur.fetchall():
            if col[5]: # is PK
                try:
                    pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('\"{t_name}\"', '{col[1]}'), coalesce(max(\"{col[1]}\"), 1)) FROM \"{t_name}\";")
                except: pass

    pg_cur.execute("SET session_replication_role = 'origin';")
    sl_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate_db(os.path.join(basedir, 'instance', 'wwhypda.db'), MAIN_DB_NAME)
    migrate_db(os.path.join(basedir, 'instance', 'users_data.db'), USERS_DB_NAME)
    print("\n✅ МИГРАЦИЯ V5 ЗАВЕРШЕНА!")
