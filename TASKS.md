# Список задач для Исполнителя

Данный файл содержит технические задания по переходу на Vite, синхронизации Docker-окружения и настройке безопасности (CORS/CSP).

---

## [2026-04-06] Задача 1: Синхронизация Docker и Nginx под Vite

### Архитектурное решение:
1. Переключить сборку фронтенда на использование папки `dist/` вместо `build/`.
2. Исправить пути к исходному коду фронтенда во всех конфигурационных файлах.
3. Обеспечить корректную работу проксирования в Nginx.

---

### Подзадачи для Исполнителя:

#### 1. Исправление Dockerfile фронтенда (`wwwhypda-frontendV2/Dockerfile`)
- [x] Изменить путь в команде копирования результата сборки: заменить `/app/build` на `/app/dist`.
- [x] Убедиться, что `EXPOSE 3000` соответствует порту, на котором слушает внутренний Nginx в контейнере.

#### 2. Исправление Docker Compose (`docker-compose.yml`)
- [x] В сервисе `frontend` изменить `context` с `./wwwhypda-frontend` на `./wwwhypda-frontendV2`.
- [x] В сервисе `frontend` исправить путь к `env_file`: заменить `./wwwhypda-frontend/.env.production` на `./wwwhypda-frontendV2/.env.production`.

#### 3. Проверка корневого Nginx (`nginx.conf`)
- [x] Убедиться, что `proxy_pass http://frontend:3000/` корректно перенаправляет запросы на сервис фронтенда, так как в Dockerfile фронтенда порт 3000.

---

## [2026-04-06] Задача 2: Универсализация CORS и CSP (`mainApp.py`)

### Архитектурное решение:
Вынести список разрешенных доменов (Origins) в переменные окружения, чтобы бэкенд автоматически адаптировался к среде исполнения (dev/prod).

---

### Подзадачи для Исполнителя:

#### 2.1 Настройка переменных окружения
- [x] В `env.dev` и `env.prod` добавить переменную `ALLOWED_ORIGINS` (например, `http://localhost:5173,http://localhost:8080,http://30.30.20.20`).

#### 2.2 Модификация `wwwhypda-backend/mainApp.py`
- [x] Реализовать чтение `ALLOWED_ORIGINS` из окружения и преобразование строки в список.
- [x] В настройках **CORS** заменить жестко заданный список `origins` на полученный из переменной окружения.
- [x] В настройках **CSP (Talisman)**:
    - В `connect-src` заменить жестко заданные URL на список из `ALLOWED_ORIGINS`.
    - Добавить `https://www.google.com` и `https://stats.g.doubleclick.net` в `connect-src` для корректной работы reCAPTCHA.
- [x] Настроить динамическое переключение `JWT_COOKIE_SECURE`: установить `True`, если `ENV == 'production'`, иначе `False`.

#### 2.3 Валидация
- [x] Запустить бэкенд локально через `python mainApp.py` и проверить, что фронтенд (Vite на 5173) получает доступ (Проверено через Swagger редирект на 5000).
---

## [2026-04-07] Задача 3: Исправление сборки фронтенда на Alpine (Vite/Rolldown Fix)

### Архитектурное решение:
Проблема вызвана использованием устаревшего `package-lock.json` (от CRA), который конфликтует с Vite и не содержит нативных привязок для Linux/musl (Alpine). 

Решение:
1. Очистить проект от старых артефактов зависимостей.
2. Скорректировать `package.json` до стабильных версий.
3. В Dockerfile обеспечить установку зависимостей «с нуля» под целевую платформу (Alpine).

---

### Подзадачи для Исполнителя:

#### 3.1 Очистка и коррекция манифеста (`wwwhypda-frontendV2/`)
- [x] **Удалить** файл `package-lock.json` в папке фронтенда (он несовместим с Vite).
- [x] В `package.json` исправить версию Vite: заменить `"vite": "^8.0.1"` на `"vite": "^6.0.0"` (или актуальную стабильную v6).
- [x] Проверить остальные зависимости на предмет явных несоответствий (например, `anpm` — возможно, опечатка от `npm` или `npm-run-all`?).

#### 3.2 Модификация `wwwhypda-frontendV2/Dockerfile`
- [x] Оставить базовый образ `node:22-alpine AS builder`.
- [x] Добавить установку необходимых для сборки нативных модулей библиотек (иногда Rolldown/Vite требуют `libc6-compat` на Alpine):
  `RUN apk add --no-cache libc6-compat`
- [x] Заменить `RUN npm ci` на `RUN npm install`. Это позволит npm создать правильное дерево зависимостей под Linux/musl внутри контейнера.

#### 3.3 Регенерация лок-файла
- [x] После успешной сборки в Docker, Исполнителю рекомендуется запустить `npm install` локально (на Windows), чтобы обновить `package-lock.json` до актуального состояния, но уже для Vite.

#### 3.4 Проверка
- [x] Запустить `docker-compose build frontend`.
- [x] Убедиться, что команда `npm run build` отрабатывает без ошибок `MODULE_NOT_FOUND`.

---

## [2026-04-07] Задача 4: Устранение 502 Bad Gateway (Connection Refused)

### Архитектурное решение:
Ошибка `Connection refused` при обращении к `frontend:3000` означает, что Nginx внутри контейнера `frontend` не запустился или слушает не тот порт. 

1. Проверить `wwwhypda-frontendV2/nginx.conf`: директива `include /etc/nginx/extra-conf.d/*.conf;` может вызывать ошибку, если папка пуста или отсутствует в Alpine-образе.
2. Убедиться, что в `docker-compose.yml` сервис `frontend` не завершается с ошибкой (`Exited (1)`).
3. Проверить соответствие путей копирования в `Dockerfile` фронтенда.

---

### Подзадачи для Исполнителя:

#### 4.1 Исправление внутреннего Nginx (`wwwhypda-frontendV2/nginx.conf`)
- [x] Закомментировать или удалить строку `include /etc/nginx/extra-conf.d/*.conf;`, если в проекте нет дополнительных файлов конфигурации. Это предотвратит падение Nginx при старте.
- [x] Убедиться, что `listen 3000;` указан корректно.

#### 4.2 Проверка Docker рантайма
- [x] Выполнить `docker-compose up -d`.
- [x] Выполнить `docker-compose ps` и убедиться, что все три сервиса (`nginx`, `frontend`, `backend`) имеют статус `Up`.
- [x] Если `frontend` не в статусе `Up`, посмотреть логи: `docker-compose logs frontend`.

#### 4.3 Фикс путей в `Dockerfile` фронтенда
- [x] Убедиться, что `COPY nginx.conf /etc/nginx/conf.d/default.conf` копирует именно тот файл, который находится в корне `wwwhypda-frontendV2`.

---

## [2026-04-07] Задача 5: Финальная проверка интеграции

- [ ] Открыть `http://localhost:8080` в браузере.
- [ ] Проверить сетевые запросы (F12 -> Network): запросы к `/api/...` должны возвращать корректные данные (например, статус авторизации или данные с бэкенда).
- [ ] Убедиться, что в консоли браузера нет ошибок `Content-Security-Policy`.

---

## [2026-04-07] Задача 6: Отключение AG Grid Enterprise и регистрация Community модулей

### Архитектурное решение:
Для исключения ошибок лицензирования и сборки необходимо **закомментировать** (не удалять!) все упоминания `ag-grid-enterprise` в коде. Функциональность будет обеспечиваться бесплатной версией `ag-grid-community`.

---

### Подзадачи для Исполнителя:

#### 6.1 Изоляция Enterprise-кода (СТРОГО ЗАКОММЕНТИРОВАТЬ)
- [x] Во всех файлах проекта (особенно `src/main.tsx`, `measurementSample.tsx`, `measurements.tsx`) найти и **закомментировать** импорты из `ag-grid-enterprise`.
- [x] Закомментировать любую логику, которая обращается к платным модулям (например, `ModuleRegistry.registerModules(AllEnterpriseModules)`).

#### 6.2 Регистрация Community модулей в `src/main.tsx`
- [x] Настроить регистрацию модулей только из `ag-grid-community`, чтобы заработала пагинация.

*Пример кода для Исполнителя:*
```typescript
import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule, PaginationModule, ValidationModule } from 'ag-grid-community';

// СТРОГО ЗАКОММЕНТИРОВАНО:
// import { AllEnterpriseModules } from 'ag-grid-enterprise';
// ModuleRegistry.registerModules(AllEnterpriseModules);

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    PaginationModule,
    ValidationModule
]);
```

#### 6.3 Проверка
- [ ] Убедиться, что ошибка `TS2724` (про AllEnterpriseModules) исчезла при сборке.
- [ ] Убедиться, что ошибка `PaginationModule is not registered` в консоли браузера исчезла.
- [ ] Проверить, что таблицы работают в режиме Community (без водяных знаков и платных функций).

---

## [2026-04-07] Задача 8: Исправление конфигурации AG Grid (Warning #95)

### Архитектурное решение:
В AG Grid v31+ при использовании пагинации необходимо явно указывать доступные варианты размеров страницы, и текущий `paginationPageSize` должен входить в этот список.

---

### Подзадачи для Исполнителя:

#### 8.1 Модификация компонентов с AG Grid
Во всех файлах, где используется `<AgGridReact pagination={true} ... />` (например, `dataTable.tsx`, `userSuggestions.tsx`, `measurementSample.tsx` и др.):
- [ ] Добавить проп `paginationPageSizeSelector={[10, 20, 50, 100]}`.
- [ ] Убедиться, что `paginationPageSize={10}` (или другое значение) присутствует в этом массиве.

---

## [2026-04-07] Задача 9: Исправление ошибки reCAPTCHA (Invalid site key)

### Архитектурное решение:
Ошибка `Invalid site key` вызвана использованием невалидного ключа-заглушки. Ключ должен передаваться через переменные окружения Vite.

---

### Подзадачи для Исполнителя:

#### 9.1 Настройка переменных окружения
- [ ] В файлах `.env.development` и `.env.production` фронтенда проверить значение `VITE_RECAPTCHA_SITE_KEY`.
- [ ] Если используется заглушка `grdg54ghrtrgtrRv2nOE3pkt4`, заменить её на корректный Site Key от Google (v3).

#### 9.2 Проверка CSP (Backend)
- [x] Убедиться, что в `wwwhypda-backend/mainApp.py` (Задача 2) в политику CSP включены домены.

---

## [2026-04-07] Задача 10: Диагностика пустого ответа API (Search Data Fix)

### Архитектурное решение:
Запрос `GET /api/rocks/samples/0/5` возвращает `200 OK` с пустым телом `[]`. Это означает, что маршрут работает, но данные в БД не найдены. Необходимо проверить наличие связей `RockType (id=0) -> Sample -> Measure (param=5)`.

---

### Подзадачи для Исполнителя:

#### 10.1 Скрипт диагностики БД
- [ ] Создать в корне бэкенда файл `check_db.py` со следующим содержимым для проверки наполненности таблиц:
```python
from mainApp import app
from common_defenitions import db
from rocks.rocks_models import RockType, Sample, Measure, Parameter

with app.app_context():
    print(f"RockTypes: {db.session.query(RockType).count()}")
    print(f"Samples: {db.session.query(Sample).count()}")
    print(f"Measures: {db.session.query(Measure).count()}")
    print(f"Parameters: {db.session.query(Parameter).count()}")
    
    # Проверка конкретного запроса
    rt_id, p_id = 0, 5
    samples = db.session.query(Sample).filter_by(key_rt=rt_id).all()
    print(f"Samples for rt_id={rt_id}: {len(samples)}")
    if samples:
        s_ids = [s.id_Sample for s in samples]
        measures = db.session.query(Measure).filter(Measure.id_smpl.in_(s_ids), Measure.id_par_msr == p_id).count()
        print(f"Measures for rt_id={rt_id} and param_id={p_id}: {measures}")
```
- [ ] Запустить скрипт внутри контейнера или локально: `python check_db.py`.

#### 10.2 Проверка логики фронтенда (`Search.tsx`)
- [ ] Убедиться, что `rt_id` и `selectedValue` (ID параметра) передаются корректно и не являются значениями по умолчанию (0), если в базе ID начинаются с 1.
- [ ] Добавить в UI фронтенда уведомление "No data found for this selection", если ответ от API пуст.

#### 10.3 Исправление (если БД пуста)
- [ ] Если таблицы пусты, Исполнителю необходимо импортировать начальные данные или проверить пути к файлам `.db` в `mainApp.py` (возможно, используется пустая база в `instance/`).

---

## [2026-04-07] Задача 11: Исправление выбора типа породы в дереве (Redux Sync)

### Архитектурное решение:
Проблема, когда заголовок "Search in..." не меняется, вызвана тем, что выбор в компоненте `SimpleTreeView` (MUI) не синхронизирован с Redux. Использование `onClick` внутри `TreeItem` ненадежно. Необходимо перенести логику обновления стейта на уровень `SimpleTreeView`.

---

### Подзадачи для Исполнителя:

#### 11.1 Синхронизация ID в `ModelsTreeDrawer.tsx`
- [ ] В функции `buildTree` заменить `itemId={name}` на `itemId={node.rt_id.toString()}` для компонента `CustomTreeItem`. Это сделает ID узлов уникальными и соответствующими базе данных.

#### 11.2 Централизованная обработка выбора
- [ ] В компоненте `ModelsTreeDrawer` добавить обработчик `onItemClick` или `onSelectedItemsChange` для `SimpleTreeView`.
- [ ] Внутри обработчика:
    1. Получить `itemId` выбранного узла.
    2. Найти соответствующий объект породы в `treeData` по этому ID.
    3. Диспатчить экшены `UpdateRTID(selectedId)` и `UpdateRTName(selectedName)` в Redux.

#### 11.3 Очистка `CustomTreeItem.tsx`
- [ ] Удалить `useDispatch`, локальные стейты `localRTID/localRTName` и функцию `toggleTheme` из `CustomTreeItem`.
- [ ] Убрать `onClick={toggleTheme}` из компонента `TreeItem`. Теперь за выбор отвечает родительское дерево.

#### 11.4 Проверка
- [ ] Убедиться, что при клике на любую породу в дереве заголовок в компоненте Search меняется с "generic earth material" на имя выбранной породы.
- [ ] Проверить, что запрос к API в логах теперь содержит правильный ID (например, `/api/rocks/samples/5/10` вместо `/0/5`).




