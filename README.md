# Fleet Orchestrator

My take on the Olivaw engineering challenge: a robot simulator, a server that ingests and stores its telemetry, and the interface a fleet manager works in. I built all three parts so the interface runs against real behaviour (robots going offline, commands the robot has not applied yet, a server that disagrees with a stale screen), but most of the effort went into the frontend, its data flow and its structure.

## Run it

Use Node.js 26 and npm. From this directory:

```bash
npm ci
npm run db:setup
npm run dev
```

In a second terminal, start one simulator and leave it running:

```bash
npm run simulator
```

Open http://localhost:3000/robots. The fleet starts empty: add 1, 10 or 100 generated robots and watch them work, run low, report problems and drop offline. Data is stored in `data/fleet.sqlite`.

Checks: `npm test` (346 unit and integration tests), `npm run test:e2e` (23 Playwright tests, against their own server and database), `npm run lint`, `npm run knip`, and `npm run benchmark` (the queries at 100k robots, see [Scale](#scale)).

## What I built, and why

A fleet manager asks three questions, and the two screens answer them:

1. **Which robots need me now?** The Robots page opens on four counts (All, Needs attention, Offline, Low battery) that are also the filters. Below them, a searchable, filterable, paged table: connection, activity, battery, location, problems.
2. **What is this robot doing, and can I trust that?** The robot page shows its last report and labels values as _last reported_ once they may be out of date, with a map of where it is among the site's other robots.
3. **Can I act?** Start, Stop, Retry and Return to base, from the table or the robot page. Every action that is not available says why ("Battery too low to start", "Robot isn't connected", "Waiting for the robot…").

Trust in the data is the theme that runs through it. Telemetry arrives about once a second, but the screen polls; reports go missing; a command is accepted long before the robot applies it. So:

- **Connection is measured, not reported.** A robot is Online while its last report is at most 10 s old, Delayed up to 15 s, then Offline; Unknown before its first report, which the API sends as `null`. The server stamps when each report arrived, so the robot's clock does not matter, and each poll is evaluated at one instant (`evaluatedAt`), so every row on the screen agrees.
- **Failed refreshes are visible.** The last good data stays on screen, a warning says live updates stopped, and connection states are marked unverified. Actions still go through: the server checks each one against the latest report.
- **A command is a target, not an event.** Sending Stop stores the target and bumps a revision; the robot reads it from the registry and acknowledges the revision in its telemetry. Until it does, the control shows the command as queued. The server checks availability against the latest report (HTTP 409 with the reason), so a stale screen cannot send something the robot can no longer do.

## How the frontend is put together

### Who owns which state

| State                                                     | Owner                      | Why there                                                                                                                                              |
| --------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The list view: filters, search, page, page size           | The URL                    | Shareable, survives reload and Back. Built from the zod schemas the API validates with: a bad URL field falls back to its default, the API rejects it. |
| Server data: the list page, one robot                     | TanStack Query, polled     | One cache, shared by every component that reads it; polling, cancellation and placeholder data come from the library.                                  |
| Writes in flight                                          | TanStack Query's mutations | Each control shows its own write's pending state; no state of our own.                                                                                 |
| What the user is typing, dialogs, focus                   | The component              | Local by nature.                                                                                                                                       |
| Robots, their command target, the latest report per robot | SQLite                     | The source of truth.                                                                                                                                   |

### Data flow

URL → `useRobotListParams()` parses it → `useRobotList(params)` turns it into a query key and polls every 3 s. `RobotList` calls both once and gives each section (tiles, filters, table, footer) what it shows, so one file shows where the list's data goes.

Writes stay where they happen instead of being passed down: the filters write the URL themselves (`setRobotListFilters`), and a row or the robot page sends its own commands with `useRobotAction(robot)`. A write is finished when the server answers: its result goes straight into the cache and a refresh follows in the background. Requests sent before the write are cancelled first, so they cannot put old data back, and overlapping writes do not wait on each other's refresh.

### Business rules live in one place

The server works out what each robot's last report means at the poll's time (`evaluatedAt`) and sends it with the robot: its connection, its battery level, why each action it rules out is unavailable, and which actions it has yet to apply. `src/server/robots/robot-status.ts` is the only place those rules live, and the browser renders what it receives. `src/common` holds just the contract the server, the browser and the simulator share: types, enums, request schemas and labels.

The battery and offline rules must exist in SQL too, because the server counts the views. Rather than generate SQL from TypeScript, a test runs the real SQL views over every activity × battery × report age, boundaries included, and checks each robot lands in the views its own fields say.

### Writes don't lock each other

Each write shows its own pending state until the server answers, and a robot's control takes one command at a time. An accepted command then shows as queued until the robot reports applying it. Nothing else waits: commands to different robots, adds, deletes and paging run side by side. The server is the check, refusing a command the robot's latest report rules out.

### Live updates: polling

The list polls every 3 s and a robot page every 2 s; reports arrive every second. Polling was the right trade here: it is a few lines, it recovers from any failure on its own, and every response is a consistent snapshot at one instant. While a new filter or page loads, the previous rows stay on screen instead of flashing to skeletons.

## What I faked or left out

- **Robots.** The simulator is a Node process that drives simulated robots through work, return, charge and problem cycles and posts batched telemetry over HTTP. Real robots would talk to a broker (typically MQTT), not to the web server.
- **History.** Only the latest report per robot is stored. A fleet manager's first question is "what now", and history needs a different store (see below). The robot page's logs are a static sample to show where history would go.
- **The location map** is an illustrative floor plan per site; robots report an area name, not coordinates.
- **Skills and Integrations** are placeholders in the navigation.
- **Authentication, roles and an audit trail of commands.** Left out entirely; they are first in line for production.
- **One fixed locale and time zone** (English, Europe/Berlin), so the server render and the browser always agree.

## Scale

`npm run benchmark` seeds 100k robots into a temporary database and times the queries the screens run on every poll (median of 15 runs):

| Query                   | Before       | After         |
| ----------------------- | ------------ | ------------- |
| List, first page        | 201 ms       | 33 ms         |
| List, last page         | 522 ms       | 82 ms         |
| List, Offline view      | 341 ms       | 33 ms         |
| List, one site and type | 103 ms       | 43 ms         |
| List, search            | 199 ms       | 96 ms         |
| Robot page              | 121 ms, 2 MB | 37 ms, 0.5 KB |

What changed: an index for the list's only order (newest first); indexes on site and manufacturer, which also let SQLite list the filter options without reading every robot; the latest-report table keyed by robot (`WITHOUT ROWID`), so the counts reach each robot's report directly; and the robot page returning how many other robots are in each area instead of every one of them.

What breaks next, in order:

1. **Search** is a `LIKE '%…%'` scan: a full-text or trigram index.
2. **The counts** are recomputed over the whole fleet on every poll: keep them as counters updated on ingest, or cache them for a second on the server.
3. **Deep pages** use OFFSET: keyset paging on (created, id).
4. **Polling itself:** push the robots that changed over server-sent events and patch them into the query cache, with polling as the fallback.
5. **Ingestion:** a broker and a write path that batches upserts, and a time-series store (Postgres with TimescaleDB, or ClickHouse) for history. SQLite stays a fine choice for a single site.

## Testing

- **Unit and integration (Vitest):** the fleet rules as tables of cases; the server against a real SQLite file (ingestion order, command revisions, the views); components through Testing Library with the app's real providers, theme and query client, and `fetch` stubbed.
- **End to end (Playwright):** the flows a manager follows (filter, search, page, act, delete, go back), against a dev server with its own database. Tests post telemetry through the same endpoint the simulator uses, so they control exactly what each robot reports.
- **Races are pinned on purpose:** deleted robots never coming back from a cached page, a poll answering after a command, a search applied while a robot page is loading.

## How I worked

I used AI coding tools heavily: Claude Code as a pair, and Codex and Grok as independent reviewers of plans and diffs. Every change went through my review and was committed in small steps; the history is meant to be read. The decisions are mine, and I can walk through any of them, including the ones I tried and reverted.

## With more time, or in production

- Authentication and roles, and an audit log of who sent which command.
- Telemetry history and the views built on it: battery over time, problem frequency, uptime per robot.
- Push updates and the scale steps above.
- Command delivery that survives a restart: idempotency keys, expiry for a command the robot never applies, and notifying the manager when it lapses.
- Observability: ingestion lag, rejected reports by reason (the ingest endpoint already counts them), command round-trip time.
- Real coordinates on real floor plans.
