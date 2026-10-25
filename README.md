# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions)

Интегрируйте работу агентов в GitHub проект. Практическая часть — сервис
бронирования календаря звонков, перенесённый из проекта
[386](https://github.com/Sergey-Demo-27/ai-for-developers-project-386).

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

Бэкенд:

- **Node.js** v24 (Active LTS), ESM (`"type": "module"`)
- **Express** 5 — HTTP-сервер
- **SQLite** через встроенный модуль `node:sqlite` (без внешних сервисов)
- Тесты — встроенный `node:test`

Каркас использует только возможности платформы Node.js и одну зависимость
(Express): dev-режим через `node --watch`, переменные окружения через
`--env-file-if-exists`, тесты через `node --test`.

Фронтенд:

- **Vite** 8 — сборка и dev-сервер
- **React** 19 + **TypeScript** 6
- **Mantine** 9 — UI-библиотека (`@mantine/core`, `@mantine/hooks`,
  `@mantine/form`, `@mantine/dates`, `@mantine/notifications`,
  `@mantine/modals`)
- **PostCSS** с `postcss-preset-mantine` (конфиг `client/postcss.config.cjs`)
- Линтер — **oxlint**
- Тесты — **Vitest** (окружение jsdom + Testing Library)

Контракт API:

- **TypeSpec** 1.17 — описание эндпоинтов, моделей и ошибок (`api/`)
- **OpenAPI** 3.0 — генерируется эмиттером `@typespec/openapi3`
  в `api/openapi/openapi.yaml`

> Примечание: API `node:sqlite` синхронный и в Node 24 помечен как
> experimental, поэтому при работе может выводиться соответствующее
> предупреждение. Для учебного проекта это осознанный компромисс.

## Структура проекта

```text
.
├── server/          # бэкенд (Node.js + Express) — самодостаточный проект
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── .env.example
├── client/          # фронтенд (Vite + React + TypeScript) — отдельный проект
│   ├── src/
│   │   ├── app/     # провайдеры, тема, маршруты, глобальные стили
│   │   ├── pages/   # landing, booking, bookings, event-types, not-found
│   │   ├── widgets/ # самостоятельные UI-блоки (header)
│   │   └── main.tsx # точка входа Vite
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── api/             # контракт API — отдельный проект на TypeSpec
│   ├── main.tsp     # сервис, префикс /api, теги
│   ├── models/      # модели данных и конверт ошибки
│   ├── routes/      # эндпоинты
│   ├── openapi/     # openapi.yaml — генерируется, руками не правится
│   ├── tspconfig.yaml
│   └── package.json
├── .agents/         # навыки для агентов
├── docs/            # спецификация, ADR, правила работы агентов
├── AGENTS.md        # инструкции для агентов
├── Dockerfile       # образ бэкенда: при запуске сервер стартует сам
├── .dockerignore
└── README.md
```

Бэкенд, фронтенд и контракт API — три независимых npm-проекта. Фронтенд во время
разработки ходит к API через dev-прокси Vite (`/api` → `http://localhost:3000`),
поэтому CORS настраивать не нужно.

Фронтенд разложен по методологии
[Feature-Sliced Design](https://feature-sliced.design/): слои
`app → pages → widgets → shared`. Слайс импортирует только слои ниже и только
через свой публичный API (`index.ts`). Слои и слайсы появляются по мере
необходимости, без пустых заготовок.

## Установка

Нужен Node.js v24. Если используете nvm: `nvm use`.

Бэкенд:

```bash
git clone https://github.com/Sergey-Demo-27/ai-for-developers-project-387.git
cd ai-for-developers-project-387/server
npm install
cp .env.example .env
npm run migrate
```

Фронтенд (при необходимости — отдельно):

```bash
cd ai-for-developers-project-387/client
npm install
```

Переменные окружения (см. `server/.env.example`):

- `PORT` — порт HTTP-сервера (по умолчанию `3000`)
- `DB_PATH` — путь к файлу базы SQLite (по умолчанию `./data/dev.db`)
- `NODE_ENV` — окружение: `development` | `production` | `test`

## Использование

Из корня репозитория — единая команда генерации по всему контракту:

```bash
npm run generate:api        # api → openapi.yaml → server/src/generated + client/src/shared/api/generated
npm run generate:api:check  # то же + проверка, что сгенерированное закоммичено
```

Бэкенд — команды из папки `server/`:

```bash
npm run dev     # запуск с автоперезапуском (node --watch)
npm start       # обычный запуск
npm test        # тесты (node --test)
npm run lint    # линтер oxlint
npm run smoke   # дымовой тест: сервер поднимается и отвечает на /health
npm run generate:api  # пересобрать серверные артефакты из ../api/openapi/openapi.yaml
npm run coverage
```

Приложение отдаёт `GET /health` → `200 { "status": "ok" }`. Дымовой тест
поднимает реальный сервер и ждёт ответа этого эндпоинта.

В CI (`.github/workflows/ci.yml`) на каждый push и pull request запускаются
пять job-ов: `server` (`npm ci` → `lint` → проверка, что серверные артефакты
не устарели → `test` → `migrate` → `smoke`),
`client` (`npm ci` → `lint` → `test` → `build` → проверка, что клиентский SDK
не устарел), `api` (`npm ci` → `lint` → `build` → проверка, что `openapi.yaml`
не устарел), `docker` (`docker build` → запуск контейнера → ожидание `/health`)
и `commitlint` (проверка сообщений коммитов).

Фронтенд — команды из папки `client/`:

```bash
npm run dev      # dev-сервер Vite (http://localhost:5173) с HMR
npm run build    # production-сборка (tsc -b && vite build) в dist/
npm run preview  # локальный предпросмотр production-сборки
npm run lint     # линтер oxlint
npm test         # тесты Vitest (разовый прогон)
npm run test:watch  # тесты в watch-режиме
npm run coverage    # тесты с отчётом покрытия (папка coverage/)
npm run generate:api  # пересобрать клиентский SDK из api/openapi/openapi.yaml
```

Для разработки запустите оба проекта: бэкенд на `:3000`, фронтенд на `:5173`.
Запросы фронтенда к `/api/...` проксируются на бэкенд.

## API-контракт

Контракт API описан на **TypeSpec** в `api/` и из него генерируется
OpenAPI-спецификация `api/openapi/openapi.yaml`. Спецификация закоммичена, чтобы
дифф контракта был виден в пул-реквестах, и **не редактируется руками**: правки
вносятся в `.tsp`, после чего файл пересобирается.

Команды из папки `api/`:

```bash
npm install
npm run build    # пересобрать openapi/openapi.yaml из .tsp
npm run lint     # формат .tsp (tsp format --check) + компиляция без записи файлов
```

Разбор контракта по решениям и правилам (почему 409, а не 422, как считается
занятость, что значит «свободный слот») — в [docs/spec.md](./docs/spec.md).
`docs/spec.md` остаётся источником правды по «почему», `api/` — по «что».

Технический `GET /health` — проба готовности вне `/api`, в контракт он не входит
и единый конверт ошибки на него не распространяется.

Проверить сгенерированный файл сторонним линтером можно так (в CI не запускается,
чтобы не тянуть лишнюю зависимость):

```bash
npx @redocly/cli lint api/openapi/openapi.yaml
```

Он валиден; остаются четыре осознанных предупреждения: нет поля `license`
(лицензии у проекта пока нет), сервер указывает на `localhost`, и у двух
GET-списков нет 4XX-ответа — по контракту его там и не бывает.

### Единая команда генерации

Всю цепочку — сборку `openapi.yaml` из `.tsp` и пересборку серверных артефактов
и клиентского SDK — можно повторить одной командой из корня репозитория:

```bash
npm run generate:api        # api → openapi.yaml → server/src/generated + client/src/shared/api/generated
npm run generate:api:check  # то же + проверка, что сгенерированное закоммичено
```

Команда по очереди вызывает скрипты трёх проектов
(`npm --prefix api run build`, затем `server` и `client`), поэтому порядок шагов
зафиксирован: оба генератора читают уже собранный `openapi.yaml`. Перед первым
запуском нужны зависимости во всех трёх проектах — `npm ci` в `api/`, `server/`
и `client/`; корневой `node_modules` для этого не требуется.

### Клиентский SDK

Из той же спецификации генерируется клиентский SDK: `@hey-api/openapi-ts`
читает `api/openapi/openapi.yaml` и создаёт типы и методы на каждую операцию
(`eventTypesList`, `bookingsCreate`, …) в `client/src/shared/api/generated/`.

```bash
cd client
npm run generate:api   # пересобрать SDK из ../api/openapi/openapi.yaml
```

(Всю цепочку целиком — из корня: `npm run generate:api`, см.
[«Единая команда генерации»](#единая-команда-генерации).)

Сгенерированный код закоммичен и **не редактируется руками** — правка начинается
с `.tsp`. Изменили контракт — пересоберите `openapi.yaml` (в `api/`) и SDK
(в `client/`) и закоммитьте оба файла: job `client` в CI падает, если SDK
разошёлся со спецификацией.

Работать с SDK принято через публичный API слоя —
`client/src/shared/api/index.ts`: он отдаёт настроенный клиент (базовый адрес
берётся из `origin` страницы, переопределяется `VITE_API_BASE_URL`) и методы
операций. Тесты `client/src/shared/api/index.test.ts` с замоканным `fetch`
проверяют, что фронтенд действительно ходит в `/api/...` через сгенерированные
методы. Экраны `/booking`, `/bookings` и `/event-types` используют этот слой.

### Серверные артефакты

Из той же спецификации генерируются и серверные артефакты — типы, проверка
запросов и заготовки маршрутов. Скрипт `server/scripts/generate-api.mjs` читает
`api/openapi/openapi.yaml` и пишет в `server/src/generated/`:

- `spec.js` — схемы `components.schemas` и список операций;
- `types.js` — JSDoc-типы на каждую схему контракта;
- `routes.js` — фабрика `createApiRouter(handlers)`: маршруты и валидация по контракту, реализация — по `operationId`.

```bash
cd server
npm run generate:api   # пересобрать src/generated из ../api/openapi/openapi.yaml
```

(Всю цепочку целиком — из корня: `npm run generate:api`, см.
[«Единая команда генерации»](#единая-команда-генерации).)

Сгенерированный код закоммичен и **не редактируется руками** — правка начинается
с `.tsp`. Изменили контракт — пересоберите `openapi.yaml` (в `api/`), серверные
артефакты (в `server/`) и клиентский SDK (в `client/`) и закоммитьте всё: job
`server` в CI падает, если `src/generated` разошёлся со спецификацией.

**Проверка запросов** — `server/src/middleware/validate.js`: тела запросов
проверяются по схемам из `spec.js` через Ajv, а ошибка собирается в единый
конверт `400 validation_error` с `details` по всем невалидным полям сразу.
Правила уровня схемы (обязательные поля, типы, длины, границы, форматы) приходят
из контракта; смысловые правила, которые в схему не выражаются (trim, окно
записи, реальность слота), остаются в обработчиках.

**Маршруты** из `routes.js` собираются фабрикой `createApiRouter(handlers)`
и монтируются в `server/src/app.js`. Пути и валидация тел приходят из
контракта; реализация — из `server/src/routes/index.js` по `operationId`
(`{ EventTypes_list, EventTypes_create, … }`). Операции без обработчика
отвечают `501 not_implemented`, поэтому частично реализованный API честно
сообщает, что ещё не написано.

## Docker

Бэкенд упакован в образ: при запуске контейнера сервер стартует сам — сначала
применяется идемпотентная схема БД, затем поднимается Express. В образ входит
только `server/`; фронтенд хостится отдельно.

Сборка из корня репозитория (контекст — корень, поэтому в `Dockerfile` пути
начинаются с `server/`):

```bash
docker build -t call-calendar .
```

Запуск. Том для SQLite именованный: без него база живёт в слое контейнера и
теряется при его удалении.

```bash
docker run --rm -p 3000:3000 -v call-calendar-data:/app/data call-calendar
# → http://localhost:3000/health  →  { "status": "ok" }
```

Переменные окружения (`PORT`, `DB_PATH`, `NODE_ENV`) задаются при запуске,
например `-e PORT=8080 -p 8080:8080`. Образ объявляет `HEALTHCHECK` на
`/health` — тот же эндпоинт, что использует `npm run smoke`; его же проверяет
job `docker` в CI.

## Деплой

Приложение опубликовано на Render:

- API — <https://call-calendar-387-api.onrender.com>, проверка живости:
  [`/health`](https://call-calendar-387-api.onrender.com/health);
- клиент — <https://call-calendar-387-client.onrender.com>.

В репозитории лежит blueprint [`render.yaml`](./render.yaml) с двумя сервисами —
Docker Web Service для API и Static Site для клиента. Если Render добавит к
именам суффиксы, адрес бэкенда в rewrite-правиле `/api/*` нужно обновить на
фактический URL API.

Бэкенд выкатывается Docker-образом из корневого `Dockerfile`; порт приложение
берёт из переменной окружения `PORT`, которую Render передаёт сервису
автоматически (см. раздел [Docker](#docker)). Клиент — Static Site: запросы к
`/api/...` уходят на бэкенд rewrite-правилом того же origin, поэтому CORS не
нужен.

На free-плане инстанс засыпает после простоя: первый запрос после паузы может
занимать до минуты. Файловая система Render эфемерна, поэтому SQLite
пересоздаётся пустой при каждом деплое и рестарте.

## Плановый аудит

[`.github/workflows/scheduled-audit.yml`](./.github/workflows/scheduled-audit.yml)
запускается раз в сутки по cron `17 3 * * *` (UTC) и вручную через
`workflow_dispatch`. Workflow:

1. проверяет, что задана переменная репозитория `APP_URL`, и «будит» Render;
2. запускает Lighthouse CLI по публичному адресу клиента;
3. сохраняет JSON, HTML и сводку артефактом `lighthouse-report`;
4. отдаёт сводку агенту `audit` из [`opencode.json`](./opencode.json), который
   пишет разбор в `report/analysis.md`;
5. создаёт issue с меткой `lighthouse-audit` по самой серьёзной находке и не
   дублирует уже открытую; отчёт также попадает в Job Summary.

Адрес приложения не хранится в workflow. Задайте его один раз:
**Settings → Secrets and variables → Actions → Variables → New repository
variable**, имя `APP_URL`, значение — URL клиента. Ручной запуск:

```bash
gh workflow run scheduled-audit.yml --ref main
```

Артефакт лежит на странице прогона во вкладке **Actions** в блоке
**Artifacts**. Находки — в issue с меткой `lighthouse-audit`.

## Агентская интеграция

Слой работы агентов перенесён из проекта 386 и живёт рядом с приложением:

- [`AGENTS.md`](./AGENTS.md) — команды, правила проекта и ограничения, которые
  не видны в коде;
- [`.agents/skills/`](./.agents) и [`skills-lock.json`](./skills-lock.json) —
  набор навыков для агентов;
- [`docs/agents/`](./docs/agents) — работа с issue tracker, triage-метками и
  доменной документацией;
- [`opencode.json`](./opencode.json) — конфигурация MCP-серверов (Render MCP
  читает `RENDER_API_KEY` из окружения) и агента `audit` с ограниченными
  правами для плановой проверки.

### Как позвать агента

Команда одна — `/oc`. Её можно оставить в issue, в общем комментарии к PR или
в комментарии к строке diff. `/opencode` больше не поддерживается: набор
команд задан явно в `mentions`, чтобы он не расширялся вместе с дефолтом
действия.

Позвать агента может не каждый комментатор: job запускается только для
`OWNER`, `MEMBER` и `COLLABORATOR`. Комментарии ботов, в том числе ответы
`opencode-agent[bot]`, отсекаются — иначе ответ агента запускал бы его снова.
GitHub всё равно создаёт run на каждый комментарий, но у чужих и ботовых
событий job сразу получает статус `skipped`: агент не вызывается, минуты не
тратятся.

### Воркфлоу проекта

| Воркфлоу | Событие | Модель / агент | Назначение | Права в workflow | Где смотреть |
| --- | --- | --- | --- | --- | --- |
| [`opencode.yml`](./.github/workflows/opencode.yml) | `issue_comment`, `pull_request_review_comment`; команда `/oc`; автор — OWNER/MEMBER/COLLABORATOR; не бот | `opencode/deepseek-v4.1-flash`, агент по умолчанию | выполняет задачу из issue, правит PR по замечаниям, создаёт коммиты и PR | `contents: read`, `id-token: write` | [Actions → opencode](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions/workflows/opencode.yml) |
| [`opencode-triage.yml`](./.github/workflows/opencode-triage.yml) | `issues: opened`; issue не от бота | `opencode/deepseek-v4.1-flash` | разбор новой issue и комментарий с планом; код не меняет | `contents: read`, `id-token: write` | [Actions → Issue triage](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions/workflows/opencode-triage.yml) |
| [`opencode-review.yml`](./.github/workflows/opencode-review.yml) | `pull_request`: `opened`, `synchronize`, `reopened`, `ready_for_review`; не draft, не форк, не посторонний бот | `opencode/deepseek-v4.1-flash` | авторевью PR, один общий комментарий; не одобряет и не мержит | `contents: read`, `id-token: write` | [Actions → opencode-review](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions/workflows/opencode-review.yml) |
| [`scheduled-audit.yml`](./.github/workflows/scheduled-audit.yml) | `schedule` (`17 3 * * *` UTC), `workflow_dispatch`; dispatch не от бота | `opencode/deepseek-v4.1-flash`, агент `audit` | Lighthouse, разбор отчёта, issue с меткой `lighthouse-audit` | `contents: read`, `id-token: write`, `issues: write`, `pull-requests: write` | [Actions → Scheduled Lighthouse audit](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/actions/workflows/scheduled-audit.yml) |

Ссылку на конкретный прогон агент добавляет в свой комментарий (`github run`).
Логи и артефакты — на странице нужного workflow во вкладке **Actions**.

### Права и токены

Права выданы отдельно в каждом воркфлоу, а не наследуются от настроек
репозитория:

- во всех интерактивных воркфлоу `GITHUB_TOKEN` только читает;
- `id-token: write` — это не право писать в репозиторий, а обмен OIDC на
  короткоживущий токен OpenCode App. Именно им агент создаёт комментарии,
  коммиты и PR;
- `contents: write`, `pull-requests: write` и `issues: write` в интерактивных
  воркфлоу поэтому не нужны;
- `id-token: write` есть и у планового аудита: правило «id-token везде»
  действует для всех агентских воркфлоу, даже если текущий `audit` работает
  через `OPENCODE_API_KEY`, а не через OpenCode App;
- единственное место с записью через `GITHUB_TOKEN` — `scheduled-audit.yml`:
  `issues: write` нужен шагу, который создаёт или обновляет issue;
  `pull-requests: write` оставлен как право на создание PR, если плановый
  агент будет его открывать (сейчас он создаёт только issue). Сам агент
  `audit` пишет только в `report/` и в GitHub не ходит.

### Модель и расходы

Во всех воркфлоу используется `opencode/deepseek-v4.1-flash` — дешёвая модель
с достаточным качеством. Для триажа и аудита этого хватает, а реализация и
ревью работают по существующему коду и не требуют более дорогой модели.

Параметр `variant` (уровень рассуждений) сейчас не задан: в используемой
версии действия он не пробрасывается в запуск. Если понадобится, сначала
нужно проверить поддержку, затем включать `low` для триажа и аудита,
`high`/`max` для реализации.

### Публикация сессий (`share`)

Репозиторий публичный, поэтому по умолчанию действие расшарило бы сессию
агента по ссылке вместе со всем контекстом. Принято решение `share: false`:
в контекст попадают обсуждения issue/PR, промежуточные рассуждения и код до
мержа, а постоянная публичная ссылка для учебного проекта не нужна. Если
мейнтейнер захочет публиковать логи, он меняет `share` осознанно, а не
получает это по умолчанию.

### Самооценка работы с агентом

- С первого прохода: тестовая [#9](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/9)
  (ответ на `/oc`) и автотриаж [#10](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/10)
  (корректно распознал дубликат #5).
- Кодовых задач с первого прохода пока нет: #5 (PR #12) — единственная задача,
  которую агент вёл, и ей потребовались итерации.
- Итерации по #5: авторевью нашло два замечания (заголовок PR не по
  Conventional Commits, `activeSlot` брался из устаревшего снимка), а
  `commitlint` упал на длине строки тела коммита. После двух дополнительных
  `/oc` замечания закрыты, финальное ревью чистое, PR смержен.
- Авторевью PR #14 и #17 — без блокирующих замечаний. На PR #11 первый прогон
  упал на `Duplicate header: Authorization`; лечится `persist-credentials:
  false`.
- Задачи #2 и #3 с меткой `ready-for-agent` пока не брались.

## План развития

Ближайшие фичи и баги собраны в [ROADMAP.md](./ROADMAP.md) и заведены как
GitHub Issues с меткой `ready-for-agent`: [#2](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/2),
[#3](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/3),
[#4](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/4),
[#5](https://github.com/Sergey-Demo-27/ai-for-developers-project-387/issues/5).

## Соглашение о коммитах

Сообщения коммитов следуют спецификации
[Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/)
(`feat:`, `fix:`, `docs:` и т.д.). Формат проверяется автоматически: локально —
`commit-msg` хуком, в CI — job `commitlint`. Полное описание формата, список
типов и областей — в [CONTRIBUTING.md](./CONTRIBUTING.md).

Инструменты проверки живут в корневом `package.json` (отдельно от `server/`,
`client/` и `api/`):

```bash
npm install          # ставит commitlint/husky и активирует хук commit-msg
npm run lint:last    # проверить сообщение последнего коммита
```

Схема базы данных лежит в `server/src/db/schema.sql` и наполняется по мере
реализации: сейчас есть таблицы `event_types` и `bookings`; остальные появятся
вместе с функционалом проекта.

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
