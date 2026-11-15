This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 26 and npm. Initialize the local database before starting:

```bash
npm ci
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite persists the fleet in `data/fleet.sqlite`; set `DATABASE_PATH` to use another file. Run commands from the project root. Migrations are explicit and never run during requests or builds.

A new database starts empty. Newly added robots have unknown telemetry until their first report arrives. Use the outlined **Add robot** split button to add one robot, or its dropdown to add 10 or 100. The empty-state button adds one. Bulk additions use one transaction and succeed or roll back together. Metadata is generated without a form, including one of four required types: Cleaning robot, Security robot, Delivery robot, or Inspection robot. Generated manufacturer/type pairs use Samsung and iRobot for cleaning, LG for delivery, Ascento for security, and Boston Dynamics for inspection. The table groups manufacturer beneath the robot name and shows Type in its own column. Integration metadata is required: `ros2` (ROS 2), `vda5050` (VDA5050), or `vendor-api` (Vendor API), shown in the Integration column and details. Generated integrations are illustrative demo metadata, assigned independently of manufacturer; these labels do not claim vendor compatibility or implemented connectors. All telemetry still arrives through the simulator HTTP API. The Added column shows registration time, with newest robots first. Addition preserves the current page, so the new robot may be on another page. The table reloads automatically after creation or deletion; Retry is available if loading fails. Pagination defaults to 20 rows, with 10, 20, and 100 available in the native Rows per page selector. Changing the size returns to the first page. Rows open details with breadcrumbs. The trailing Actions menu supports deletion with confirmation, a pending state, and success/error notifications.

```bash
npm run db:generate  # Generate a migration after changing the schema
npm run db:migrate
```

During this POC, schema changes may replace migration history and discard development data. When that happens, stop the app and simulator, remove the configured SQLite file and its `-wal` and `-shm` sidecars, then run `npm run db:migrate` before restarting. Migrations run explicitly; the application does not populate or reset the fleet on startup.

## Robot API

- `GET /api/robots?page=0&pageSize=20`: `{ items, total, page, pageSize }`, ordered by creation time descending, then ID descending.
- `GET /api/robots/:id`: one robot, or 404.
- `POST /api/robots/batch`: accept `{ robots: [...] }` with 1–100 metadata records; return 201 with `{ items: [...] }`. All records are created in one transaction.
- `POST /api/robots`: create metadata from `name`, `manufacturer`, `site`, `type`, and `integrationType`; returns 201 with unknown telemetry.
- `DELETE /api/robots/:id`: permanently remove a robot and its latest telemetry; returns 204, or 404.

```bash
curl -X POST http://localhost:3000/api/robots -H 'Content-Type: application/json' -d '{"name":"Dara","manufacturer":"Boston Dynamics","site":"Hamburg","type":"inspection","integrationType":"vendor-api"}'
```

Name, manufacturer, and site are trimmed, required, and limited to 100 characters. Type is required and must be `cleaning`, `security`, `delivery`, or `inspection`; there is no unknown type. Errors use `{ error: { code, message } }`. The API is intended for local development or a single Node server with persistent disk. Authentication, a creation form, command handling, and telemetry history are deferred. Local SQLite is not a shared database for disposable serverless instances.

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
  modules/robots/              # Shared robot contracts and input validation
  modules/telemetry/           # Report validation and freshness rules
  simulator/                   # Standalone HTTP producer and simulation behaviour
  server/
    db/                        # SQLite connection and Drizzle schema
    robots/                    # Operations and HTTP response handling
    telemetry/                 # Latest-report ingestion
scripts/                       # Database migration and simulator commands
drizzle/                       # Versioned SQL migrations
data/                          # Ignored local SQLite database
```

Component images live in `src/assets/` and use static imports through Next.js Image. Reserve root `public/` for files requiring a fixed public URL; the favicon follows the `src/app/favicon.ico` convention.

Group code by feature, then by responsibility. A feature or composed component folder has a matching entry file, such as `fleet-table/fleet-table.tsx`. Tests live beside their subjects. Use direct imports; `@/` resolves to `src/`.

Future zones such as skills, integrations, producers, and admin belong beside `fleet-dashboard` under `features/`. Add matching domain contracts in `modules/` and backend operations in `server/` only when needed. Modules contain shared domain code; features contain frontend screens. Use focused shared UI/utilities only when multiple features need them.

Browser code calls feature API functions, which request thin Next.js HTTP routes. Routes call server operations with a database connection. Server-rendered details call those same operations directly. Server entry points are marked `server-only`; database factories remain usable by scripts and tests. Metadata and latest telemetry are separate tables. The separate simulator writes through the ingestion API. Future commands should track requests and acknowledgments separately from observed activity.

The dashboard route is `src/app/(fleet-dashboard)/page.tsx`; its screen implementation is `src/features/fleet-dashboard/fleet-dashboard.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Material UI is configured with the Next.js App Router style cache and a shared theme in `src/theme/theme.ts`. It uses Geist and defaults to the system light/dark preference. The top-right theme button switches modes and saves the selection locally. See [decisions.md](./decisions.md) for the current product direction and open questions.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Simulation and live updates

Run `npm run db:migrate`, then `npm run dev`. In a second terminal run `npm run simulator`. Set `SIMULATOR_API_URL` if the app is not at `http://localhost:3000`. Run exactly one simulator against a fleet; stop it with Ctrl+C. The simulator uses HTTP and does not access SQLite directly.

The simulator discovers added/deleted robots and reports approximately once a second, in batches of at most 100. It restores usable persisted values on restart without simulating downtime. Initial battery is deterministically 30–95%; working drains 0.1 percentage points per second, charging adds 0.5. Robots charge at 20% and resume work at 90%. Areas rotate every 30 seconds; charging reports Dock. These are accelerated demonstration rules, not a physical model. Faults and scenario presets remain deferred.

- `GET /api/robots/registry`: `{ items: Robot[] }`, a complete snapshot for this small local simulator. UI pagination continues to use the existing list endpoint.
- `POST /api/telemetry/batch`: `{ reports: [...] }`, 1–100 records containing `robotId`, `activity`, `batteryPercent`, nullable `area`, and ISO `observedAt`. Returns 204. Invalid batches return 400 without writes; unknown/deleted IDs and non-newer observations are ignored. Times are normalized to UTC; reports over five seconds ahead are rejected.

Only latest telemetry is stored. `lastTelemetryAt` is observation time; `lastReceivedAt` is server receipt time. Connection is derived: Online up to 10 seconds, Delayed through 15 seconds, Offline thereafter, Unknown before the first report. Offline means no recent reports, not powered off or disabled. Old telemetry remains visible as last known.

Dashboard and detail views poll quietly every five seconds, retaining rows during refresh. Failed background requests show a warning and unverified connection labels until recovery. Hidden tabs stop polling and refresh on return. Row menus, delete dialogs, and mutations pause dashboard updates without shifting the layout to preserve interaction focus. Addition/deletion refetch the current page, correcting it if it no longer exists; new records may shift page composition.

This targets one local Node server with persistent SQLite. There is no guaranteed real-time latency, history, authentication, SSE/WebSockets, broker, or command queue. Future filters must run before pagination and return matching totals; live filtered membership behaviour is still undecided.

Online robots show a stable connection label; report age is shown only for Delayed and Offline robots. The simulator still produces telemetry approximately once a second.
