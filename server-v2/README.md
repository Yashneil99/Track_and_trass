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
│   └── migrations/      numbered SQL files and the runner
├── tests/
│   ├── unit/            pure logic, no database
│   ├── integration/     SQL and database rules, against a real Postgres
│   ├── api/             endpoints end to end (supertest)
│   └── fixtures/        seed and sample data
```

API testing by hand is done in Swagger UI at `/api-docs` (added in Phase 1), not Postman.

## Module layout

Every folder in `src/modules/` has the same files, added when that module is built:

| File | Job |
|---|---|
| `<name>.routes.js` | URLs and which middleware each uses |
| `<name>.controller.js` | reads the request, calls the service, sends the response |
| `<name>.service.js` | business rules |
| `<name>.repository.js` | SQL only |
| `<name>.schema.js` | Zod validation, also the source of the Swagger docs |
| `<name>.test.js` | tests for this module |

Modules: `auth`, `users`, `locations`, `gardens`, `stn`, `bags`, `outward`, `process`, `alerts`.

## Rules

- JavaScript (CommonJS), Node 20, Express 5, plain SQL (no ORM), Zod, pino, Jest.
- Keep the response shape `{ status, message, data }`.
- No secrets in the repo. Settings come from `.env`, checked at startup.
- Real STN files are not committed (`tests/fixtures/stn-real/` is ignored). Use sample files with invented data.
- Port 5001 and database `hul_track_v2`, so the old server keeps working.

## Phases

| Phase | Content |
|---|---|
| 0 | This folder structure |
| 1 | Foundation: config, core, logging, auth middleware, database helper, health, Swagger, Jest, CI |
| 2 | Database: migrations, new schema, seed data, conversion of the old data |
| 3 | Access and master data: auth, users, locations and bin stock, gardens, processes |
| 4 | STN upload, lots, slots, allocation |
| 5 | Bag flows: receiving, tags, putaway, damaged |
| 6 | Outward to production, delivery, expiry edits |
| 7 | Realtime and admin alerts |
| 8 | Scale: background jobs, load tests |
| 9 | New client, Docker and nginx, cutover |
