# Deploying Ω-SIB

This guide covers local development, the supplied Docker image and Compose topology, environment configuration, health checks, recovery examples, and production hardening. Ω-SIB uses **SQLite for development** and **PostgreSQL for production** through the same SQLAlchemy models, selected by `DATABASE_URL`.

> **Important:** Commands are examples for a controlled development environment. Do not use demo credentials, default database passwords, unencrypted local disks, or an unreviewed AI provider configuration in production.

## Prerequisites

- Python **3.12** for backend development
- Node.js **22** and npm for frontend development
- Docker Engine with Docker Compose plugin for containerized development
- PostgreSQL for a non-SQLite deployment

## Local development

Run the API and frontend in separate terminals.

### Backend

```bash
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is then available at `http://localhost:8000`, health at `http://localhost:8000/api/health`, and FastAPI's interactive documentation at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Open the URL printed by Vite (normally `http://localhost:5173`). Ensure the frontend development configuration points API calls at the backend development address. The documented REST base path is `/api`.

### Development database

Use the backend's SQLite `DATABASE_URL` configuration for local, non-sensitive data. SQLite is convenient for development but does not remove the need to protect the host filesystem. Use a PostgreSQL URL to test production-like behavior before deployment.

## Configuration

Store local values in a non-committed `.env` file or inject them through your deployment platform. Never place live values in source control. The table below uses the current backend configuration keys. The default values in application configuration exist only to ease local startup; set secure environment-specific values before any production use.

| Key | Purpose | Local development example / notes |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy database connection URL. | SQLite for development; Compose illustrates `postgresql+psycopg://omega_sib:...@db:5432/omega_sib`. Match the dialect/driver installed by the backend. |
| `SECRET_KEY` | JWT signing secret. | Set a unique, high-entropy value for every non-local environment. The backend's development default must not be used in production. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT access-token lifetime in minutes. | Backend default: `720`; choose and review an environment-appropriate value. |
| `AI_BASE_URL` | Base URL of the optional OpenAI-compatible chat-completions provider. | Leave unset when using deterministic offline rules only. |
| `AI_API_KEY` | Credential for the optional AI provider. | Secret; never expose to the browser or commit. Leave unset for offline fallback. |
| `AI_MODEL` | Provider model identifier. | Required only when AI provider access is configured. |
| `AI_TIMEOUT_SECONDS` / `AI_MAX_OUTPUT_TOKENS` | Optional AI request timing and output limits. | Backend defaults: `45` seconds and `1600` tokens. |
| `SIB_ADAPTER` | SIB adapter mode. | `simulator` keeps work local; `http` requires `SIB_ADAPTER_URL` and protected `SIB_ADAPTER_TOKEN`. |
| `SIB_ADAPTER_URL` / `SIB_ADAPTER_TOKEN` | Future HTTP adapter endpoint and credential. | Leave unset for the simulator; do not commit the token. |
| `CORS_ORIGINS` | Comma-separated allowed browser origins. | Restrict to approved origins in production; the backend default is permissive for development. |
| `SERVE_FRONTEND` / `FRONTEND_DIST` | Whether FastAPI serves the built frontend and its directory. | Defaults to `true` and the repository's `frontend/dist`; Docker sets `FRONTEND_DIST=/app/frontend/dist`. |
| `SEED_DEMO_DATA` | Enables development seed data. | Default: `true`; disable for production. |
| `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Development bootstrap account configuration. | Defaults include `admin` / `admin123`; replace or disable outside local use. |
| `POSTGRES_DB` | Database name used by the Compose PostgreSQL service. | `omega_sib` |
| `POSTGRES_USER` | Database user used by the Compose PostgreSQL service. | `omega_sib` for local use only |
| `POSTGRES_PASSWORD` | Password used by the Compose PostgreSQL service. | Required by the supplied Compose file; set a unique value in `.env` or the shell. |

A minimal local example, with placeholder values only:

```dotenv
DATABASE_URL=sqlite:///./omega_sib.db
SECRET_KEY=set-a-unique-secret-in-your-local-environment
# AI_BASE_URL=
# AI_API_KEY=
# AI_MODEL=
```

## Docker image

The root `Dockerfile` has two stages:

1. A Node 22 stage installs the frontend dependencies and runs the Vite production build.
2. A Python 3.12 slim stage installs backend requirements, copies the FastAPI application, copies the built frontend to `/app/frontend/dist`, and runs `uvicorn app.main:app` on port 8000.

The FastAPI application is expected to mount the copied build as static frontend assets. The image itself contains no credentials. If the backend's static-file configuration uses a different build location, align that backend configuration with `/app/frontend/dist` before deploying.

Build and run the image directly:

```bash
docker build -t omega-sib:local .
docker run --rm \
  --name omega-sib \
  --publish 8000:8000 \
  --env DATABASE_URL='sqlite:///./omega_sib.db' \
  omega-sib:local
```

For production, pass a PostgreSQL `DATABASE_URL`, a secure `SECRET_KEY`, and optional AI variables through protected runtime configuration—not through the Dockerfile or image build arguments.

## Docker Compose

The supplied `docker-compose.yml` starts:

| Service | Purpose | Exposure |
|---|---|---|
| `api` | Ω-SIB FastAPI process plus built static frontend. It is built from the root Dockerfile. | Host port `8000:8000` |
| `db` | PostgreSQL 16 Alpine with a named persistent data volume and readiness health check. | Internal Docker network only by default |

Start the local stack:

```bash
export POSTGRES_PASSWORD='choose-a-local-development-password'
docker compose up --build
```

Run it in the background:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

Stop it without deleting the PostgreSQL data volume:

```bash
docker compose down
```

To remove the local stack **and its named database volume**, which permanently removes local Compose data:

```bash
docker compose down --volumes
```

The Compose file shows a commented-out API-data volume. Enable it only if the chosen backend configuration stores local files that must survive container recreation; PostgreSQL state already uses the `postgres_data` named volume.

## Health checks and verification

The database's Compose health check uses `pg_isready`; the API waits for that check before starting. Verify the application after startup:

```bash
curl --fail http://localhost:8000/api/health
curl --fail http://localhost:8000/openapi.json > /dev/null
```

An HTTP response from `/api/health` confirms that the API process is reachable. It does not, by itself, prove that all clinical workflows, database permissions, external adapters, or AI provider connectivity are ready. Add platform-level health checks and monitoring appropriate to production.

## Backup and restore

The commands below target the Compose database and are appropriate as local operational examples. Use encrypted storage, controlled credentials, retention rules, and tested procedures in production.

### Logical backup

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-omega_sib}" -d "${POSTGRES_DB:-omega_sib}" \
  --format=custom > "backups/omega-sib-$(date +%F).dump"
```

### Restore into the Compose database

> Restoring overwrites or modifies database contents. Stop application writes, verify the target database, and test the procedure against an isolated copy before a real recovery.

```bash
cat backups/omega-sib-YYYY-MM-DD.dump | \
  docker compose exec -T db pg_restore -U "${POSTGRES_USER:-omega_sib}" \
  -d "${POSTGRES_DB:-omega_sib}" --clean --if-exists --no-owner
```

For a production PostgreSQL service, run `pg_dump` and `pg_restore` from a secured administrative environment or managed backup system rather than relying on ad hoc container access. Regularly perform a complete restore test, including application configuration and schema/migration compatibility.

## Production hardening checklist

- [ ] Use managed PostgreSQL or encrypted persistent volumes; restrict database network access and use a least-privilege database account.
- [ ] Enforce TLS from browser to ingress and for external provider/adapter traffic. Configure secure HTTP headers and an explicit trusted-proxy policy at the reverse proxy/application boundary.
- [ ] Supply secrets through a secret manager or protected runtime environment; use a unique, high-entropy JWT signing secret and rotate exposed values.
- [ ] Use a production ASGI process/worker strategy appropriate to the host and expected concurrency; do not rely on `--reload`.
- [ ] Limit CORS origins to approved frontend origins and apply rate limiting at the intended API/edge layer.
- [ ] Protect logs, backups, audit exports, and observability systems from clinical data and credentials.
- [ ] Monitor `/api/health`, database availability, failed sync items, authentication anomalies, and backup jobs; define alert owners and incident procedures.
- [ ] Test disaster recovery, PostgreSQL restore, authorization boundaries, audit-log integrity, and rollback procedures before go-live.
- [ ] Keep the host, container base images, Python packages, Node dependencies, and database image patched through a controlled release process.
- [ ] Do not connect a live SIB system, laboratory, imaging system, notification provider, or AI provider until contracts, authorization, data minimization, and failure/reconciliation procedures have been approved.

For data-protection expectations, see [Security](SECURITY.md). For the API contract, see [API](API.md).
