# ProjectFlow — Project & Task Management App

ProjectFlow is a full-stack app where teams manage projects and tasks together. Each project gets its own real-time chat channel and video meeting room, and role-based access control decides who can see and change what.
It runs on a React + Vite frontend and a TypeScript/Express REST API backed by PostgreSQL and Redis. Calls to third-party services (Stream, ImageKit) go through a BullMQ retry queue in the background, and Jest unit and integration tests cover the backend.

---

## Table of Contents

1. [Technologies](#1-technologies)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Setup](#4-setup)
5. [Testing](#5-testing)
6. [Project Structure](#6-project-structure)
7. [API Reference](#7-api-reference)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Background Job Processing](#9-background-job-processing)
10. [Docker (Production Build)](#10-docker-production-build)
11. [Implementation Details](#11-implementation-details)

---

## 1. Technologies

Versions listed are the ones currently installed (see `package.json` / `package-lock.json` in each app).

### Runtime & Infrastructure

| Technology     | Version     | Purpose                                                      |
| -------------- | ----------- | ------------------------------------------------------------ |
| Node.js        | 22+         | JavaScript runtime (Docker images use `node:22-bookworm-slim`) |
| PostgreSQL     | 16          | Main relational database (the source of truth)               |
| Redis          | 7           | Rate limiting, token revocation, and BullMQ job queues       |
| Docker Compose | v2          | Local Redis plus the throwaway test database and test Redis  |

### Backend (`backend/`)

| Technology                     | Version  | Purpose                                        |
| ------------------------------ | -------- | ---------------------------------------------- |
| TypeScript                     | 7.0.2    | Type safety                                    |
| Express                        | 5.2.1    | HTTP server and REST API                       |
| Prisma ORM + `@prisma/adapter-pg` | 7.9.0 | Database schema, migrations, and queries       |
| pg (node-postgres)             | 8.22.0   | PostgreSQL driver used by the Prisma adapter   |
| ioredis                        | 6.0.0    | Redis client                                   |
| BullMQ                         | 6.3.4    | Background job queue and worker                |
| stream-chat                    | 9.52.0   | Server-side Stream Chat (project channels)     |
| @stream-io/node-sdk            | 0.8.4    | Server-side Stream Video (meeting tokens)      |
| imagekit                       | 6.0.0    | Avatar image storage and deletion              |
| Zod                            | 4.4.3    | Request and environment variable validation    |
| jsonwebtoken                   | 9.0.3    | JWT signing and verification                   |
| bcryptjs                       | 3.0.3    | Password hashing                               |
| Helmet                         | 8.3.0    | HTTP security headers                          |
| express-rate-limit + rate-limit-redis | 8.6.1 / 6.0.1 | Rate limiting backed by Redis          |
| cookie-parser / cors           | 1.4.7 / 2.8.6 | Cookie parsing and CORS                   |
| tsx                            | 4.23.1   | TypeScript dev server with watch mode          |

### Testing (`backend/`)

| Technology   | Version | Purpose                                                  |
| ------------ | ------- | -------------------------------------------------------- |
| Jest         | 30.4.2  | Test runner and assertions (unit + integration projects) |
| @swc/jest    | 0.2.39  | Fast TypeScript → JS transform for Jest (via `@swc/core` 1.15.47) |
| Supertest    | 7.3.1   | HTTP assertions (installed for the planned API-level tests) |
| dotenv-cli   | 11.0.0  | Loads `.env.test` before running Jest and Prisma commands |

### Frontend (`frontend/`)

| Technology                 | Version  | Purpose                                      |
| -------------------------- | -------- | -------------------------------------------- |
| React / React DOM          | 19.2.7   | UI library                                   |
| Vite                       | 8.1.5    | Dev server and production bundler            |
| React Router DOM           | 7.18.2   | Client-side routing with loaders and actions |
| TanStack React Query       | 5.101.4  | Fetching and caching server data             |
| Tailwind CSS               | 4.3.3    | Utility-first styling                        |
| Axios                      | 1.20.0   | HTTP client                                  |
| stream-chat-react          | 14.12.0  | Chat UI components                           |
| @stream-io/video-react-sdk | 1.42.0   | Video call UI components                     |
| @imagekit/javascript       | 5.4.1    | Avatar uploads from the browser              |
| React Toastify             | 11.1.0   | Toast notifications                          |
| ESLint                     | 10.7.0   | Linting                                      |

---

## 2. Features

### Current Features

- **User Authentication**: Register, log in, and log out. The JWT is stored in an HTTP-only cookie, and on logout the token is added to a Redis revocation list.
- **Project Management**: Create, update, delete, and list projects, with search, sorting, and pagination. Project names are unique per creator.
- **Task Management**: Create, update, delete, and list tasks, with filters for status and priority plus text search and pagination.
- **Team Collaboration**: Add or remove project members by email. Only the project creator or an admin can manage members.
- **Real-Time Chat**: Every project has its own Stream Chat channel. When a task is created, updated, or deleted, the app posts a message about it in that channel.
- **Video Meetings**: Every project has its own Stream Video call room, with a speaker layout and call controls.
- **User Profiles**: Update your name, email, avatar (uploaded to ImageKit), and password. Deleting your account requires your password.
- **Role-Based Access Control**: `ADMIN` can access every project. `MEMBER` can only access projects they belong to.
- **Rate Limiting**: Redis-backed limits at three levels: global, auth, and sensitive actions.
- **Resilient Third-Party Sync**: Data is written to the database first, then synced to Stream and ImageKit through a BullMQ queue that retries with exponential backoff.
- **Health Check**: An endpoint that reports the status of the service, the database, and Redis.
- **Automated Testing**: Jest unit and integration tests. The integration tests run against a real, isolated PostgreSQL and Redis started with Docker (see [Testing](#5-testing)).
- **Seed Data and Postman Collection**: A seed script creates sample accounts and projects, and a Postman collection is included for trying out the API.

### Planned Features (Roadmap)

- [ ] **API-level (HTTP) tests**: Add Supertest suites (`*.api.test.ts`) that test routes, middleware, and controllers end to end. The Jest config already has a slot for them.
- [ ] **Frontend tests**: Component and integration tests for the React app.
- [ ] **Continuous Integration**: Run linting, unit tests, and integration tests (with containers) on every push and pull request.

---

## 3. Architecture

![System Architecture: Database as Source of Truth with Sync Outward + Retry Queue](docs/architecture.png)

### Database as Source of Truth + Sync Outward + Retry Queue

The main design rule is that **PostgreSQL is always the source of truth.** The API writes to the database first and responds right away, so a request never waits on a third-party service. The changes are then **synced outward** to the external systems (Stream Chat, Stream Video, ImageKit) in the background through a **BullMQ job queue** backed by Redis.

If an external service is down, the data is still safe in the database, and BullMQ keeps retrying the sync with exponential backoff (up to 5 attempts). This means:

- A project is **always created** in the database, even if Stream can't be reached.
- A member is **always added** to the project, even if updating the chat channel fails.
- The user **always gets a fast response**, because nothing waits on slow third-party APIs.

### Modular Backend

The backend is split into **modules**, one per domain (auth, users, projects, tasks, stream, imagekit, health). Each module follows `routes → controllers → services`. Shared middlewares handle authentication, validation, rate limiting, and project access control.

---

## 4. Setup

### 4.1 Prerequisites

- **Node.js** 22 or newer, with npm
- **Docker** and **Docker Compose**: used for Redis and for the test database
- **PostgreSQL** for development: any reachable instance works, for example [Neon](https://neon.tech), a local install, or a Docker container
- A **Stream** account for chat and video: [getstream.io](https://getstream.io)
- An **ImageKit** account for avatar uploads: [imagekit.io](https://imagekit.io)

### 4.2 Clone and Install Dependencies

```bash
git clone https://github.com/Zsayaaad/task-management-app.git
cd task-management-app

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4.3 Configure Environment Variables

Create `backend/.env` by copying the example file:

```bash
cd backend
cp .env.example .env
```

Then fill in your own values:

| Variable                | Required | Default                  | Description                                    |
| ----------------------- | -------- | ------------------------ | ---------------------------------------------- |
| `PORT`                  | No       | `3001`                   | Port the backend server listens on             |
| `NODE_ENV`              | No       | `development`            | `development`, `production`, or `test`         |
| `DATABASE_URL`          | **Yes**  | —                        | PostgreSQL connection string                   |
| `JWT_SECRET`            | **Yes**  | —                        | Secret key used to sign JWTs                   |
| `JWT_EXPIRES_IN`        | No       | `7d`                     | How long a token stays valid                   |
| `STREAM_API_KEY`        | **Yes**  | —                        | Stream API key (from the Stream dashboard)     |
| `STREAM_API_SECRET`     | **Yes**  | —                        | Stream API secret                              |
| `IMAGEKIT_PUBLIC_KEY`   | **Yes**  | —                        | ImageKit public key                            |
| `IMAGEKIT_PRIVATE_KEY`  | **Yes**  | —                        | ImageKit private key                           |
| `IMAGEKIT_URL_ENDPOINT` | **Yes**  | —                        | ImageKit URL endpoint (must be a valid URL)    |
| `REDIS_URL`             | No       | `redis://localhost:6379` | Redis connection URL                           |
| `BCRYPT_SALT_ROUNDS`    | No       | `12`                     | bcrypt cost factor (the test env uses `4` for speed) |

> All variables are checked with Zod when the server starts. If anything is missing or invalid, the server stops immediately and prints an error explaining what's wrong.

### 4.4 Start Redis

From the project root:

```bash
docker compose up -d
```

This starts a Redis 7 container (`task-management-redis`) on port `6379` with persistent storage.

### 4.5 Set Up the Database

From `backend/`:

```bash
# Generate the Prisma client
npx prisma generate

# Apply all migrations in prisma/migrations
npx prisma migrate deploy

# (Optional) Reset the database and load sample data
npm run seed
```

The seed script creates these accounts, plus sample projects with tasks assigned across the members:

| Account      | Email                 | Password     | Role     |
| ------------ | --------------------- | ------------ | -------- |
| Admin User   | `admin@example.com`   | `Admin123!`  | `ADMIN`  |
| Alex Johnson | `member@example.com`  | `Member123!` | `MEMBER` |
| Sarah Smith  | `member2@example.com` | `Member123!` | `MEMBER` |
| David Chen   | `member3@example.com` | `Member123!` | `MEMBER` |

> [!WARNING]
> `npm run seed` **wipes the existing data** before adding the sample data. Never run it against a production database.

### 4.6 Run the App

```bash
# Terminal 1 — backend (from backend/)
npm run dev        # → http://localhost:3001

# Terminal 2 — frontend (from frontend/)
npm run dev        # → http://localhost:5173
```

In development, the Vite dev server forwards `/api` requests to `http://localhost:3001`. Production works the same way from the browser's point of view, because Express serves both the API and the built frontend.

### 4.7 Available Scripts

**Backend (`backend/`)**

| Script                    | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Start the API in watch mode with `tsx`                  |
| `npm run build`           | Compile TypeScript into `dist/`                         |
| `npm start`               | Run the compiled server (`node dist/index.js`)          |
| `npm run seed`            | Reset the database and load sample data                 |
| `npm run db:test:up`      | Start the test PostgreSQL and test Redis containers     |
| `npm run db:test:down`    | Stop and remove the test containers                     |
| `npm run db:test:migrate` | Apply migrations to the test database                   |
| `npm run db:test:reset`   | Drop the test database and re-run all migrations        |
| `npm test`                | Run all Jest tests (unit + integration)                 |
| `npm run test:unit`       | Run unit tests only                                     |
| `npm run test:int`        | Run integration tests only, one at a time (`--runInBand`) |
| `npm run test:cov`        | Run all tests and generate a coverage report            |
| `npm run test:watch`      | Re-run tests automatically when files change            |

**Frontend (`frontend/`)**

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Build the production bundle          |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

### 4.8 Postman Collection

Import `postman/projectflow.postman_collection.json` into Postman to try out every API endpoint.

---

## 5. Testing

The backend is tested with **Jest 30**, and TypeScript is compiled for Jest by **SWC**. There are two separate Jest projects, both defined in [`backend/jest.config.cjs`](backend/jest.config.cjs):

| Project         | File pattern                        | What it tests                                                                  | Needs Docker? |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| **unit**        | `*.test.ts`                         | Small pieces of code in isolation: middlewares, Zod schemas, utils, role helpers, custom errors. Dependencies are mocked. | No            |
| **integration** | `*.int.test.ts` (and `*.api.test.ts`) | Service-layer business logic running against a **real PostgreSQL and Redis**, including transactions, constraints, cascades, and queue jobs | Yes           |

### 5.1 Test Environment

Integration tests use their own throwaway infrastructure, defined in [`docker-compose.test.yml`](docker-compose.test.yml). It never touches your development data:

| Service                         | Image                | Host port | Notes                                         |
| ------------------------------- | -------------------- | --------- | --------------------------------------------- |
| `task-management-postgres-test` | `postgres:16-alpine` | `5433`    | Database `app_test`; data is kept in memory (`tmpfs`) |
| `task-management-redis-test`    | `redis:7-alpine`     | `6380`    | Nothing is saved to disk                      |

The settings for these containers are in [`backend/.env.test`](backend/.env.test), which is committed to the repo. It only contains **fake** Stream and ImageKit credentials, and sets `BCRYPT_SALT_ROUNDS=4` so password hashing is fast.

### 5.2 Running the Tests

From `backend/`:

```bash
# Unit tests only (no Docker needed)
npm run test:unit

# 1. Start the test PostgreSQL + Redis containers
npm run db:test:up

# 2. Run the integration tests (migrations are applied automatically)
npm run test:int

# Or run everything at once
npm test

# Generate a coverage report → backend/coverage/lcov-report/index.html
npm run test:cov

# 3. Stop the test containers when you're done
npm run db:test:down
```

### 5.3 How the Test Setup Works

| File                                                              | Role                                                                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`src/test/setupEnv.ts`](backend/src/test/setupEnv.ts)            | Loads `.env.test` before any app module is imported                                                                        |
| [`src/test/setup.ts`](backend/src/test/setup.ts)                  | Mocks every third-party boundary (Stream, ImageKit, the BullMQ queue, and the sync worker) so tests **never make network calls** |
| [`src/test/globalSetup.ts`](backend/src/test/globalSetup.ts)      | Integration only: runs the safety checks, then `prisma migrate deploy`. If the migration state is broken, it resets the test database automatically |
| [`src/test/setupIntegration.ts`](backend/src/test/setupIntegration.ts) | Integration only: empties every table and clears Redis **before each test**, then closes Prisma and Redis connections at the end |
| [`src/test/dbHelpers.ts`](backend/src/test/dbHelpers.ts)          | `resetDb()` finds all tables automatically and runs `TRUNCATE … RESTART IDENTITY CASCADE`. `flushRedis()` clears the test Redis |
| [`src/test/factories.ts`](backend/src/test/factories.ts)          | `createUser`, `createProject`, `createProjectMember`, `createTask` create test records with sensible defaults and unique values |
| [`src/test/smoke.int.test.ts`](backend/src/test/smoke.int.test.ts) | Smoke tests that check the database is reachable, resets work, the factories work, and the safety checks block non-test databases |

> [!IMPORTANT]
> **Safety guards:** destructive test helpers refuse to run unless `NODE_ENV=test`, `DATABASE_URL` points to `localhost` **and** uses the `app_test` database, and `REDIS_URL` points to `localhost`. This prevents a test run from accidentally wiping a real database.

### 5.4 What Is Covered

| Area                     | Unit tests                                                         | Integration tests                                                         |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Auth**                 | Register and login schemas, JWT auth middleware, JWT and cookie utils | Register, login, and token revocation in Redis                            |
| **Users**                | Profile, avatar, password, and account deletion schemas            | Avatar replacement (queues deletion of the old image), password changes, account deletion with cascading cleanup |
| **Projects**             | Project schemas, `checkProjectAccess` middleware                   | Creating a project and its membership in one transaction, duplicate-name conflicts, updates, deletes, member management, queued sync jobs |
| **Tasks**                | Task schemas (status, priority, filters, pagination)               | Creating, updating, and deleting tasks; assignee must be a project member; duplicate titles; permission rules (creator, assignee, admin); `stream.announce` jobs |
| **Cross-cutting**        | `validate` middleware, `errorHandler`, custom errors, role helpers, password hashing | Infrastructure smoke tests                                               |

Test files sit next to the code they test, inside `__tests__/` folders (for example `src/modules/projects/__tests__/`).

---

## 6. Project Structure

```
task-management-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (User, Project, ProjectMember, Task)
│   │   ├── migrations/            # Prisma migration history
│   │   └── seed.ts                # Seed script with sample data
│   ├── src/
│   │   ├── index.ts               # Express entry point, route registration, graceful shutdown
│   │   ├── modules/               # One folder per domain: routes → controllers → services
│   │   │   ├── auth/              # Register, login, logout
│   │   │   ├── users/             # Profile, avatar, password, account deletion
│   │   │   ├── projects/          # CRUD, member management
│   │   │   ├── tasks/             # CRUD with filtering and pagination
│   │   │   ├── stream/            # Stream token generation (chat + video)
│   │   │   ├── imagekit/          # ImageKit upload auth parameters
│   │   │   └── health/            # Health check (service, DB, Redis)
│   │   ├── middlewares/           # auth, checkProjectAccess, rateLimiters, validate, errorHandler
│   │   ├── lib/                   # Shared clients and config: Prisma, Redis, BullMQ, Stream, ImageKit, env, roles
│   │   ├── workers/
│   │   │   └── sync.worker.ts     # BullMQ worker for Stream + ImageKit background jobs
│   │   ├── utils/                 # JWT, hashing, cookie helpers
│   │   ├── errors/                # Custom error classes (NotFound, Unauthorized, …)
│   │   ├── test/                  # Jest setup, DB helpers, factories, smoke tests
│   │   └── types/                 # Express and Stream type augmentation
│   ├── .env.example               # Template for the development environment
│   ├── .env.test                  # Test environment (fake credentials, local containers)
│   ├── jest.config.cjs            # Jest config with "unit" and "integration" projects
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Router setup with loaders and actions
│   │   ├── pages/                 # Route pages (Register, Login, Dashboard, Projects, …)
│   │   ├── components/            # Reusable components (forms, pagination, containers)
│   │   ├── context/               # React contexts (Dashboard, Stream chat/video provider)
│   │   └── utils/                 # Axios instance, constants
│   ├── vite.config.js
│   └── package.json
├── docs/architecture.png          # System architecture diagram
├── postman/                       # Postman collection for trying out the API
├── Dockerfile                     # Multi-stage production build (frontend + API)
├── docker-compose.yml             # Redis for local development
└── docker-compose.test.yml        # PostgreSQL + Redis for integration tests
```

---

## 7. API Reference

All routes start with `/api/v1`. Protected routes require a valid JWT in the `token` cookie.

### Auth

| Method | Endpoint         | Auth | Description                     |
| ------ | ---------------- | ---- | ------------------------------- |
| `POST` | `/auth/register` | No   | Register a new user             |
| `POST` | `/auth/login`    | No   | Log in and receive a JWT cookie |
| `POST` | `/auth/logout`   | No   | Clear the auth cookie           |

### Users

| Method   | Endpoint                 | Auth | Description                                     |
| -------- | ------------------------ | ---- | ----------------------------------------------- |
| `GET`    | `/users/current-user`    | Yes  | Get the logged-in user                          |
| `PATCH`  | `/users/profile`         | Yes  | Update name and/or email                        |
| `PATCH`  | `/users/avatar`          | Yes  | Update avatar URL                               |
| `PATCH`  | `/users/change-password` | Yes  | Change password (requires current password)     |
| `DELETE` | `/users/account`         | Yes  | Delete account (requires password confirmation) |

### Projects

| Method   | Endpoint                               | Auth | Description                                |
| -------- | -------------------------------------- | ---- | ------------------------------------------ |
| `POST`   | `/projects`                            | Yes  | Create a new project                       |
| `GET`    | `/projects`                            | Yes  | List projects (search, sort, pagination)   |
| `GET`    | `/projects/:projectId`                 | Yes  | Get project details                        |
| `PATCH`  | `/projects/:projectId`                 | Yes  | Update project (creator/admin only)        |
| `DELETE` | `/projects/:projectId`                 | Yes  | Delete project (creator/admin only)        |
| `GET`    | `/projects/:projectId/members`         | Yes  | List project members                       |
| `POST`   | `/projects/:projectId/members`         | Yes  | Add a member by email (creator/admin only) |
| `DELETE` | `/projects/:projectId/members/:userId` | Yes  | Remove a member (creator/admin only)       |

### Tasks

| Method   | Endpoint                    | Auth | Description                                     |
| -------- | --------------------------- | ---- | ----------------------------------------------- |
| `POST`   | `/tasks/:projectId`         | Yes  | Create a task                                   |
| `GET`    | `/tasks/:projectId`         | Yes  | List tasks (filter by status, priority, search) |
| `GET`    | `/tasks/:projectId/:taskId` | Yes  | Get task details                                |
| `PATCH`  | `/tasks/:projectId/:taskId` | Yes  | Update a task                                   |
| `DELETE` | `/tasks/:projectId/:taskId` | Yes  | Delete a task (creator/admin only)              |

### Stream, ImageKit & Health

| Method | Endpoint         | Auth | Description                                   |
| ------ | ---------------- | ---- | --------------------------------------------- |
| `GET`  | `/stream/token`  | Yes  | Generate Stream chat and video tokens         |
| `GET`  | `/imagekit/auth` | Yes  | Get ImageKit upload authentication parameters |
| `GET`  | `/health`        | No   | Health check (service, DB, and Redis status)  |

---

## 8. Authentication & Authorization

- **JWT tokens** are stored in HTTP-only, secure cookies with `SameSite=Strict` and a 7-day expiry.
- On logout, the token is added to a **revocation list in Redis** so it can't be used again.
- The auth middleware verifies the JWT and checks whether it has been revoked. If Redis is down, the request is still allowed through (fail-open).
- **Roles:** `ADMIN` can access every project and do any operation. `MEMBER` can only access projects they are a member of.
- **Project rules:** you must be a member (or an admin) to view a project, and the creator (or an admin) to modify or delete it.
- **Task rules:** the task creator, the assignee, or an admin can update a task. Only the creator or an admin can delete it.

---

## 9. Background Job Processing

Calls to **Stream** and **ImageKit** happen in the background through a **BullMQ** sync queue backed by Redis:

- API responses never wait on slow third-party calls.
- Failed jobs are retried with exponential backoff, up to 5 attempts (2s → 4s → 8s → 16s → 32s).
- The worker processes up to 5 jobs at the same time.

| Job Name                | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `stream.channel.create` | Create a Stream chat channel for a new project          |
| `stream.channel.update` | Rename the channel when a project is renamed            |
| `stream.channel.delete` | Delete the channel when a project is deleted            |
| `stream.member.add`     | Add a user to a project's chat channel                  |
| `stream.member.remove`  | Remove a user from a project's chat channel             |
| `stream.announce`       | Post a silent message in a project's chat (task events) |
| `imagekit.delete`       | Delete an old avatar image from ImageKit                |

---

## 10. Docker (Production Build)

The root `Dockerfile` uses a multi-stage build to produce **one container** that serves both the API and the frontend:

```bash
docker build -t projectflow .
docker run -p 3001:3001 --env-file backend/.env projectflow
```

1. **frontend-build**: installs the frontend dependencies and runs `vite build`.
2. **backend-build**: installs the backend dependencies, generates the Prisma client, and compiles the TypeScript.
3. **runner**: installs production dependencies only, copies in the build output, and starts with `node dist/index.js`. Express serves the frontend's static files from `public/` and the API under `/api/v1`.

---

## 11. Implementation Details

- **Graceful Shutdown**: On `SIGTERM` or `SIGINT`, the server stops accepting new connections, lets in-flight requests finish, and closes the BullMQ worker and queue, Redis, and Prisma. If shutdown takes longer than 10 seconds, it force-exits.
- **Prisma Driver Adapter**: Uses `@prisma/adapter-pg` so Prisma talks to PostgreSQL directly through the `pg` driver.
- **Environment Validation**: Every environment variable is validated and typed with Zod when the server starts.
- **Request Validation**: Request bodies, query strings, and route params are validated against Zod schemas by a reusable `validate` middleware.
- **Rate Limiting** (Redis-backed, per IP):
  - **Global**: 300 requests / 15 min across the whole API.
  - **Auth**: 5 requests / 15 min for login and registration.
  - **Sensitive**: 10 requests / 15 min for creating projects, creating tasks, and image upload auth.
- **Stream Chat Sync**: Each project has exactly one Stream messaging channel (`project-<projectId>`). Task events are posted to it as silent messages.
- **React Query Caching**: Data stays fresh for 5 minutes by default. React Router actions mark cached queries as stale (invalidate them) after changes.
