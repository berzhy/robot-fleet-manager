This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 26 and npm. Initialize the local database before starting:

```bash
npm ci
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite persists the fleet in `data/fleet.sqlite`; set `DATABASE_PATH` to use another file. Run commands from the project root. Migrations are explicit and never run during requests or builds.

A new database starts empty. Newly added robots have unknown telemetry until ingestion is implemented. Use the outlined **Add robot** split button to add one robot, or its dropdown to add 10 or 100. The empty-state button adds one. Bulk additions use one transaction and succeed or roll back together. Metadata is generated without a form. The Added column shows registration time, with newest robots first. Addition preserves the current page, so the new robot may be on another page. The table reloads automatically after creation or deletion; Retry is available if loading fails. Pagination defaults to 20 rows, with 10, 20, and 100 available in the native Rows per page selector. Changing the size returns to the first page. Rows open details with breadcrumbs. The trailing Actions menu supports deletion with confirmation, a pending state, and success/error notifications.

```bash
npm run db:generate  # Generate a migration after changing the schema
npm run db:migrate
```

Migrations run explicitly; the application does not populate or reset the fleet on startup.

## Robot API

- `GET /api/robots?page=0&pageSize=20`: `{ items, total, page, pageSize }`, ordered by creation time descending, then ID descending.
- `GET /api/robots/:id`: one robot, or 404.
- `POST /api/robots/batch`: accept `{ robots: [...] }` with 1–100 metadata records; return 201 with `{ items: [...] }`. All records are created in one transaction.
- `POST /api/robots`: create metadata from `name`, `manufacturer`, and `site`; returns 201 with unknown telemetry.
- `DELETE /api/robots/:id`: permanently remove a robot and its latest telemetry; returns 204, or 404.

```bash
curl -X POST http://localhost:3000/api/robots -H 'Content-Type: application/json' -d '{"name":"Dara","manufacturer":"Nova Automation","site":"Hamburg"}'
```

Input fields are trimmed, required, and limited to 100 characters. Errors use `{ error: { code, message } }`. The API is intended for local development or a single Node server with persistent disk. Authentication, a creation form, ingestion, simulator, command handling, and telemetry history are deferred. Local SQLite is not a shared database for disposable serverless instances.

Run `npm test` for browser component tests and Node database/API tests. Database tests use isolated temporary files and real migrations. Run `npm run build`, `npm run lint`, `npm run format:check`, and `npm run knip` for the remaining checks.

## Project organization

Application code lives under `src/`, while configuration remains at the project root:

```text
src/
  app/                         # Thin Next.js routes, metadata, and route boundaries
    (fleet-dashboard)/         # Groups overview and details without changing URLs
  assets/                      # Images imported by components
  app-shell/                   # Header, main content area, and viewport layout
  theme/                       # Theme configuration, provider, and toggle
  features/
    fleet-dashboard/
      fleet-dashboard.tsx      # Feature entry component
      fleet-table/             # Table entry, rows, skeletons, and empty/error states
      robot-details/           # Details entry and presentation
      api/                     # Browser HTTP requests
      hooks/                   # React request lifecycle
      types/                   # UI request state
      utils/                   # Feature-specific formatting helpers
  modules/robots/              # Shared contracts and input validation
  server/
    db/                        # SQLite connection and Drizzle schema
    robots/                    # Operations and HTTP response handling
scripts/                       # Database migration command
drizzle/                       # Versioned SQL migrations
data/                          # Ignored local SQLite database
```

Component images live in `src/assets/` and use static imports through Next.js Image. Reserve root `public/` for files requiring a fixed public URL; the favicon follows the `src/app/favicon.ico` convention.

Group code by feature, then by responsibility. A feature or composed component folder has a matching entry file, such as `fleet-table/fleet-table.tsx`. Tests live beside their subjects. Use direct imports; `@/` resolves to `src/`.

Future zones such as skills, integrations, producers, and admin belong beside `fleet-dashboard` under `features/`. Add matching domain contracts in `modules/` and backend operations in `server/` only when needed. Modules contain shared domain code; features contain frontend screens. Use focused shared UI/utilities only when multiple features need them.

Browser code calls feature API functions, which request thin Next.js HTTP routes. Routes call server operations with a database connection. Server-rendered details call those same operations directly. Server entry points are marked `server-only`; database factories remain usable by scripts and tests. Metadata and latest telemetry are separate tables. Future simulation can write through an ingestion API, while future commands should track requests and acknowledgments separately from observed activity.

The dashboard route is `src/app/(fleet-dashboard)/page.tsx`; its screen implementation is `src/features/fleet-dashboard/fleet-dashboard.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Material UI is configured with the Next.js App Router style cache and a shared theme in `src/theme/theme.ts`. It uses Geist and defaults to the system light/dark preference. The top-right theme button switches modes and saves the selection locally. See [decisions.md](./decisions.md) for the current product direction and open questions.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
