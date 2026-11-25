# Metrispot backend

NestJS modular monolith for the Metrispot application. The Next.js app remains the frontend; this service owns persistent data, authentication, authorization, provider integrations, and background work.

## Requirements

- Node.js 20 or later
- PostgreSQL
- Redis

## Local setup

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
npm run start:dev
```

Set local PostgreSQL and Redis credentials in `.env` before running the local migration. The API listens on port 4100 by default (override with `PORT`), uses the `/api/v1` prefix, and serves the OpenAPI UI at `/docs`.

`GET /api/v1/health` is a process health check. It does not yet verify database or Redis connectivity. The data model is an initial schema proposal; migrations should be created after review of the domain and retention requirements.
