# Общие правила проекта

- Корень приложения — wwwhypda; docs находится внутри него. Старые родительские ролевые файлы — только указатели. Новые задачи не записывать в TASKS.md.
- Стек: React + TypeScript + Vite, MUI, AG Grid Community, SCSS Modules, Axios, существующий Redux; backend Flask; локальный запуск Docker Compose.
- Ответы и рабочая документация на русском; UI сохраняет текущий английский язык. Пользовательское прямое указание языка отдельного документа имеет приоритет.
- Не читать current_todo_list.md, env-файлы и секреты: в том числе корневые .env*, frontend .env.development/.env.production, backend env.dev/env.prod. Имена настроек искать в коде и документации. Docker может использовать env без вывода содержимого. Не запускать printenv или раскрывающий значения docker compose config.
- Не удалять существующие комментарии, закомментированные imports, TSX, SCSS и временно отключённый код без прямого требования пользователя.
- Не терять измерения, черновики, ссылки дерева и локальное состояние; миграции схем требуют явного плана сохранения данных.
- Не менять несвязанные файлы, backend, Redux, тему, Docker/Nginx или API ради попутного улучшения. Сначала git status; чужие изменения сохранить.
- Не переносить из neurobaza FastAPI, MyRuda, маршруты, billing, API-ключи, LLM proxy, SSE, пагинацию и структуру приложения. Там заимствован процесс и общие принципы, не спецификация wwwhypda.
- Не выполнять VPS, DNS, реальные почтовые отправки, commit/push без соответствующего поручения. Текущий пользовательский запрет на VPS сохраняется.

## Важные пути

- docker-compose.yml — dev; nginx.dev.conf — локальный Nginx.
- docker-compose.prod.yml и nginx.conf — приватные локальные prod-конфиги, игнорируются Git. Не считать git pull их доставкой.
- wwwhypda-frontendV2/Dockerfile; wwwhypda-backend/Dockerfile.
- wwwhypda-backend/mainApp.py — Flask entry point, CORS/CSP и blueprints.
- wwwhypda-frontendV2/src/components/api.tsx — Axios instance.
- wwwhypda-frontendV2/src/components/menu.module.scss — палитра и размеры шрифтов.
- wwwhypda-frontendV2/src/redux/store.ts и actions.ts; src/common/types.ts — существующие состояние и типы.

Наличие пути не означает разрешения его прочитать, если это файл секретов. Работать с действующим кодом и README, не считать старые наблюдения неизменными фактами.