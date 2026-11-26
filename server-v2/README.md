# server-v2

The new API for HUL Tea Bag Track N Trace. The old `server/` is not changed; it stays as a reference while this is built one module at a time.

Design documents (read these first):

- `../BUSINESS_RULES.md`: what the system must do.
- `../DATA_MODELING.md`: tables, keys, indexes and data flows.
- `../docs/API_INVENTORY.md`: the old server's endpoints, used as a feature checklist.

## Folder structure

```
server-v2/
├── server.js            starts the app (added in Phase 1)
├── src/
│   ├── app.js           builds Express: middleware, routes (Phase 1)
│   ├── config/          validated settings, database and Redis setup
│   ├── core/            ApiResponse, AppError, error handler, logger
│   ├── middlewares/     authenticate, authorize, rate limit, request id
│   ├── shared/          helpers used by many modules (withTransaction, ...)
│   ├── modules/         one folder per feature (see below)
│   ├── realtime/        Socket.IO setup, rooms, events
│   ├── migrations/      runner.js, cli.js and sql/ (numbered SQL files)
│   └── seeds/           test data for development
├── tests/
│   ├── unit/            pure logic, no database
│   ├── integration/     SQL and database rules, against a real Postgres
│   ├── api/             endpoints end to end (supertest)
│   └── fixtures/        seed and sample data
```

API testing by hand is done in Swagger UI at `/api-docs` (added in Phase 1), not Postman.

## Database

Set `DB_*` in `.env` (see `.env.example`) and create an empty database first, e.g. `CREATE DATABASE hul_track_v2;`.

| Command                  | What it does                                                         |
| ------------------------ | -------------------------------------------------------------------- |
| `npm run migrate`        | Applies every SQL file in `src/migrations/sql/` that has not run yet |
| `npm run migrate:status` | Shows which migrations have run                                      |
| `npm run seed`           | Loads test users, gardens, bins and tags. Safe to run again          |

- Migrations are numbered (`001_access.sql`, `002_...`) and run in order, each in its own transaction.
- **Never edit a migration that has already run** (the runner refuses and tells you). Add a new numbered file instead.
- `npm run seed` prints the test users' password once. Set `SEED_PASSWORD` to choose it. It refuses to run when `NODE_ENV=production`.
- Tests wipe and rebuild their own database (`hul_track_v2_test`), so create it once. The test helper refuses to wipe any database whose name does not end in `_test`.

## Module layout

Every folder in `src/modules/` has the same files, added when that module is built:

| File                   | Job                                                      |
| ---------------------- | -------------------------------------------------------- |
| `<name>.routes.js`     | URLs and which middleware each uses                      |
| `<name>.controller.js` | reads the request, calls the service, sends the response |
| `<name>.service.js`    | business rules                                           |
| `<name>.repository.js` | SQL only                                                 |
| `<name>.schema.js`     | Zod validation, also the source of the Swagger docs      |
| `<name>.test.js`       | tests for this module                                    |

Modules: `auth`, `users`, `locations`, `gardens`, `stn`, `bags`, `outward`, `process`, `alerts`.

## API (Phase 3, built in sub-phases)

All routes are under `/api/v1` and are documented in Swagger (`/api-docs`). Log in first, then press **Authorize** and paste the `accessToken`.

| Sub-phase | Module      | Routes                                                                                                         | Status |
| --------- | ----------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| 3a        | `auth`      | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`; `GET /auth/me` | done   |
| 3b        | `users`     | admin: list, create, edit, enable or disable, reset password                                                   | done   |
| 3c        | `process`   | production processes                                                                                           |        |
| 3d        | `locations` | warehouse tree, bin capacity                                                                                   |        |
| 3e        | `gardens`   | gardens, aliases, merge                                                                                        |        |

How auth behaves:

- Register creates an account that is switched off (role operator). An admin activates it with `PATCH /users/:userId/status`.
- Tokens come back in the body (handheld, Swagger) and as httpOnly cookies (web).
- A refresh token works once. Using an old one again ends all of that user's logins.
- 5 wrong passwords lock an account for 15 minutes.
- Changing the password ends every login of that user.

## Rules

- JavaScript (CommonJS), Node 24, Express 5, plain SQL (no ORM), Zod, pino, Jest.
- Keep the response shape `{ status, message, data }`.
- No secrets in the repo. Settings come from `.env`, checked at startup.
- Real STN files are not committed (`tests/fixtures/stn-real/` is ignored). Use sample files with invented data.
- Port 5001 and database `hul_track_v2`, so the old server keeps working.

## Phases

| Phase | Content                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------- |
| 0     | This folder structure                                                                          |
| 1     | Foundation: config, core, logging, auth middleware, database helper, health, Swagger, Jest, CI |
| 2     | Database: migrations, new schema, seed data (done); conversion of the old data (next)          |
| 3     | Access and master data, in sub-phases 3a to 3e: auth, users, processes, locations, gardens     |
| 4     | STN upload, lots, slots, allocation                                                            |
| 5     | Bag flows: receiving, tags, putaway, damaged                                                   |
| 6     | Outward to production, delivery, expiry edits                                                  |
| 7     | Realtime and admin alerts                                                                      |
| 8     | Scale: background jobs, load tests                                                             |
| 9     | New client, Docker and nginx, cutover                                                          |
