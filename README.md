# README

```
> Claude make a robot orchestaration dashboard, make it nice, and make it look not like an AI slop.
```

(nah, not really)

## Intro

Hi, I had to build a useful user interface for the enigneering challenge. I tried to stick to the tech stack you are using (e.g. using Next.js, MUI, with a standard theme for now).

A small feature set makes the frontend easy, and there is little interface to show. As the product grows, the interface gets harder, and the structure of the application has to change with it. I wanted enough real behaviour to plan that structure, and to have some interface decisions worth showing.
Time was very short, so parts of this are AI-written, especially the simulator and the API. I have spent less time in those files than in the interface. In normal work I review that code before I keep it.

## Interface

Integrations are out of scope.

The interface starts in the standard light theme. A button switches between light and dark. On desktop it sits at the bottom of the sidebar, and on a small screen it sits in the header. The choice is kept in the browser.

The dashboard lists the robots, with summary tiles, filters, and search. Choosing a tile, a filter, or a search adds a chip above the table, so you can see what the list is showing.

The table polls every 5 seconds. That was enough for this proof of concept.

Each row shows the robot's stable details and its current state, and offers actions.

The app starts empty. You can auto-magically(POC) create 1, 10, or 100 generated robots. The simulator picks each one up and starts tracking it.

It is possible to delete individual robot or drop all of them via the action in the split button.

Clicking the robot row will open details page about that robot. That includes commands, positioning, model data, logs.

## How to run

Use Node.js 26 and npm. From this directory:

```bash
npm ci
npm run db:setup
npm run dev
```

Open http://localhost:3000. The fleet is stored in `data/fleet.sqlite`. Set `DATABASE_PATH` if you want a different file. A new database is empty. Nothing is seeded on startup, and the schema is created only when you run that command.

Rows stay on unknown telemetry until a report arrives. In a second terminal:

```bash
npm run simulator
```

Leave it running while you use the dashboard, and stop it with Ctrl+C. Run one simulator. If the app is not at http://localhost:3000, set `SIMULATOR_API_URL`.

## Simulator

The simulator is a separate process. It does not open the database. About once a second it loads the fleet over HTTP, picks up robots you add, and posts their telemetry back. Robots start Idle at Base, go to work, return when the battery is low, and charge. The row menu can start, stop, send a robot home, or retry. About one robot in five runs into a problem, and about one in five periodically stops reporting so the dashboard can show Offline. Only the latest report and the latest command are stored. Run one simulator. This is a local stand-in so the interface has something live to show.

## Checks

- `npm test` runs the Vitest unit tests: interface components in jsdom, and the server and simulator in Node.
- `npm run test:e2e` runs the Playwright browser journey against its own temporary database.
- `npm run lint` runs ESLint with the Next.js config, type-checked TypeScript, and the recommended accessibility rules.
- `npm run knip` flags unused files, exports, and dependencies.
