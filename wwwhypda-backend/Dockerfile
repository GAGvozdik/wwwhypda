FROM python:3.11.9-slim

ENV APP_ENV=production

# создаём пользователя
RUN addgroup --system app && adduser --system --ingroup app app

# работаем из корня (как у тебя было)
WORKDIR /

# системные зависимости для psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# зависимости
COPY wwwhypda-backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# копируем файлы (сразу с нужным владельцем)
COPY --chown=app:app common /common
COPY --chown=app:app wwwhypda-backend/ .

# переключаемся на non-root
USER app

# запуск
CMD ["gunicorn", "--config", "/gunicorn.conf.py", "mainApp:app"]