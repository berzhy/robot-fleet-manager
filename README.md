This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 26 and npm. Initialize the local database before starting:

```bash
npm ci
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). SQLite persists the fleet in `data/fleet.sqlite`; set `DATABASE_PATH` to use another file. Run commands from the project root. Migrations are explicit and never run during requests or builds.

A new database starts empty. Newly added robots have unknown telemetry until their first report arrives. Use the outlined **Add robot** split button to add one robot, or its dropdown to add 10 or 100. The empty-state button adds one. Bulk additions use one transaction and succeed or roll back together. Metadata is generated without a form, including one of four required types: Cleaning robot, Security robot, Delivery robot, or Inspection robot. Generated manufacturer/type pairs use Samsung and iRobot for cleaning, LG for delivery, Ascento for security, and Boston Dynamics for inspection. The table groups manufacturer beneath the robot name and shows Type in its own column. Integration metadata is required: `ros2` (ROS 2), `vda5050` (VDA5050), or `vendor-api` (Vendor API), shown in the Integration column and details. Generated integrations are illustrative demo metadata, assigned independently of manufacturer; these labels do not claim vendor compatibility or implemented connectors. All telemetry still arrives through the simulator HTTP API. The Added column shows registration time, with newest robots first. Addition preserves the current page, so the new robot may be on another page. The table reloads automatically after creation or deletion; Retry is available if loading fails. Pagination defaults to 10 rows, with 10, 20, and 50 available in the native Rows per page selector. Changing the size returns to the first page. Rows open details with breadcrumbs. The trailing Actions menu supports deletion with confirmation, a pending state, and success/error notifications.

```bash
npm run db:generate  # Generate a migration after changing the schema
npm run db:migrate
```

During this POC, schema changes may replace migration history and discard development data. When that happens, stop the app and simulator, remove the configured SQLite file and its `-wal` and `-shm` sidecars, then run `npm run db:migrate` before restarting. Migrations run explicitly; the application does not populate or reset the fleet on startup.

## Robot API

- `GET /api/robots?page=0&pageSize=10`: `{ items, total, page, pageSize, summary, fleetTotal, filterOptions, evaluatedAt }`, ordered by creation time descending, then ID descending.
- `GET /api/robots/:id`: one robot, or 404.
- `POST /api/robots/batch`: accept `{ robots: [...] }` with 1–100 metadata records; return 201 with `{ items: [...] }`. All records are created in one transaction.
- `POST /api/robots`: create metadata from `name`, `manufacturer`, `site`, `type`, and `integrationType`; returns 201 with unknown telemetry.
- `DELETE /api/robots/:id`: permanently remove a robot and its latest telemetry; returns 204, or 404.

```bash
curl -X POST http://localhost:3000/api/robots -H 'Content-Type: application/json' -d '{"name":"Dara","manufacturer":"Boston Dynamics","site":"Hamburg","type":"inspection","integrationType":"vendor-api"}'
```

Name, manufacturer, and site are trimmed, required, and limited to 100 characters. Type is required and must be `cleaning`, `security`, `delivery`, or `inspection`; there is no unknown type. Errors use `{ error: { code, message } }`. The API is intended for local development or a single Node server with persistent disk. Authentication, a creation form, and telemetry history are deferred. Local SQLite is not a shared database for disposable serverless instances.

Run `npm test` for browser component tests and Node database/API tests. Database tests use isolated temporary files and real migrations. Run `npm run build`, `npm run lint`, `npm run format:check`, and `npm run knip` for the remaining checks.

Run `npm run test:e2e` for the Playwright browser journey. Local runs open the installed Google Chrome; CI runs headless with Playwright's Chromium (`npx playwright install --with-deps chromium`). The tests start their own server on port 3100 with a temporary database and send deterministic telemetry through the API. The development server and simulator on port 3000 can stay running. Use `npm run test:e2e -- --repeat-each=2` to check repeated runs.

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

Browser code calls feature API functions, which request thin Next.js HTTP routes. Routes call server operations with a database connection. Server-rendered details call those same operations directly. Server entry points are marked `server-only`; database factories remain usable by scripts and tests. Metadata and latest telemetry are separate tables. The separate simulator writes through the ingestion API. Robot controls store a latest target and revision separately from observed telemetry. The simulator applies new revisions and reports acknowledgment through telemetry.

The dashboard route is `src/app/(fleet-dashboard)/page.tsx`; its screen implementation is `src/features/fleet-dashboard/fleet-dashboard.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Material UI is configured with the Next.js App Router style cache and a shared theme in `src/theme/theme.ts`. It uses Geist and defaults to light mode. The top-right theme button switches modes and saves the selection locally. See [decisions.md](./decisions.md) for the current product direction and open questions.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Simulation and live updates

Run `npm run db:migrate`, then `npm run dev`. In a second terminal run `npm run simulator`. Set `SIMULATOR_API_URL` if the app is not at `http://localhost:3000`. Run exactly one simulator against a fleet; stop it with Ctrl+C. The simulator uses HTTP and does not access SQLite directly.

The simulator discovers additions, deletions, and changed controls through one registry snapshot per loop. It reports roughly once a second in batches of at most 100. New robots first report Idle at Base with a deterministic 50–100% starting battery, then start after seven seconds. Work drains 0.1 percentage points per second; at 20% the robot returns for ten seconds before charging at 0.5 percentage points per second to 90%. Automatic charging ends with a seven-second idle delay before work resumes. Idle and blocked robots retain battery for this accelerated demo.

The row menu offers Start work, Stop activity, Return to base, Retry activity, and Delete. Unavailable actions explain why in a tooltip. Manual Stop holds Idle in place; manual Return holds at Base after charging if needed. Start releases either hold on the next simulator tick. Operational requests require recent Online telemetry; server-side validation handles stale menus. Notifications confirm requests, while telemetry confirms activity. Delete only removes the simulated robot; it is not a physical stop command.

About 20% of robots, chosen deterministically by ID, encounter Path blocked after 2–40 accumulated working minutes. Charging and idle periods do not reset that timer. Needs attention shows the reason; Retry clears the simulated obstacle and resumes work with a new interval. Other robots keep cycling. There are no additional fault scenarios or administrative availability flags.

`POST /api/robots/:robotId/actions` accepts `{ action: "start" | "stop" | "return-to-base" | "retry" }`, returning 202 for a recorded request, 400 for invalid input, 404 for a missing robot, or 409 when unavailable. Each robot stores only its latest work/stop/base target and revision; latest intent wins. Registry snapshots carry these fields; telemetry includes `appliedControlRevision` and nullable `problemCode` (`path-blocked`). There is no command history or progress UI.

Restart restores activity, battery, area, the blockage, and manual intent from persisted telemetry and controls. Short countdowns and fault scheduling restart; downtime is not simulated. Known local state and applied revisions survive request failures while the process runs. Each elapsed simulation step is capped at five seconds to prevent catch-up jumps. Use one simulator process. These are local POC guarantees, not an exactly-once hardware command protocol.

- `GET /api/robots/registry`: `{ items: Robot[] }`, a complete snapshot for this small local simulator. UI pagination continues to use the existing list endpoint.
- `POST /api/telemetry/batch`: `{ reports: [...] }`, 1–100 records containing `robotId`, `activity`, `batteryPercent`, nullable `area`, and ISO `observedAt`. Returns 204. Invalid batches return 400 without writes; unknown/deleted IDs and non-newer observations are ignored. Times are normalized to UTC; reports over five seconds ahead are rejected.

Only latest telemetry is stored. `lastTelemetryAt` is observation time; `lastReceivedAt` is server receipt time. Connection is derived: Online up to 10 seconds, Delayed through 15 seconds, Offline thereafter, Unknown before the first report. Offline means no recent reports, not powered off or disabled. Old telemetry remains visible as last known.

Dashboard and detail views poll quietly every five seconds, retaining rows during refresh. Failed background requests show a warning and unverified connection labels until recovery. Hidden tabs stop polling and refresh on return. Row menus, filter dropdowns, delete dialogs, and mutations pause dashboard updates without shifting the layout to preserve interaction focus. Addition/deletion refetch the current page, correcting it if it no longer exists; new records may shift page composition.

This targets one local Node server with persistent SQLite. There is no guaranteed real-time latency, history, authentication, SSE/WebSockets, broker, or command queue. Filters run before pagination, and live membership is recomputed on every refresh.

Online robots show a stable connection label; report age is shown only for Delayed and Offline robots. The simulator still produces telemetry approximately once a second.

## Fleet filters

Four tiles select All robots, Needs attention, Offline, or Low battery. Location (assigned site), Manufacturer, Type, and Integration dropdowns combine with the tile using AND. Removing an operational chip selects All robots and preserves dropdowns; Clear filters resets all selections. Filter changes return to page one; refresh and mutations preserve filters and correct invalid pages. Added robots may fall outside the selected filters.

The list API accepts optional `site`, `manufacturer`, `integrationType` (`ros2`, `vda5050`, `vendor-api`), `type` (`cleaning`, `security`, `delivery`, `inspection`), and `view` (`all`, `needs-attention`, `offline`, `low-battery`) query parameters. Summary counts respect dropdowns but ignore the tile. Dropdown options describe the full fleet. Rows, counts and dashboard connection classification share the response evaluation time; report-age text may continue ticking. Failed background refresh retains that snapshot.

Offline means more than 15 seconds since receipt; no reports means Unknown. Low battery means a last-reported level ≤20%, excluding Charging and Returning. Needs attention includes Offline, a reported problem, or Low battery; robots are counted once per tile. Categories overlap. Search narrows this same scope, including tile counts. It matches name, ID, manufacturer, type, integration, site and area using case-insensitive literal substrings, including displayed type/integration labels. It applies after a 300 ms pause at two or more characters (maximum 100); shorter input means no search. Search resets pagination, combines with other filters, and can be removed through its chip or Clear filters. The API accepts an optional `search` query parameter.
