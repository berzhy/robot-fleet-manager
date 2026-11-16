# README

```
> Claude make a robot orchestaration dashboard, make it nice, and NO "AI slop"!  :)
```

## Intro

Hi, I had to build a useful user interface for the engineering challenge. I tried to stick to the tech stack you're using (Next.js, MUI, with a standard theme for now).

A small feature set makes the frontend easy, and there is little interface to show. As the product grows, the interface gets more complex, and the structure of the application has to change with it. I wanted enough real behaviour to plan that structure, and to have some interface decisions worth showing.

Given the time available, I focused on the interface, its behaviour, and the overall structure, making pragmatic decisions along the way. I used AI extensively throughout the implementation to move quickly and explore ideas. In a production setting, I'd spend more time reviewing the implementation, evaluating trade-offs, and refining the code.

Hope we can discuss more this week!

## Interface

The interace consists of 3 screens. Main one - Fleet Dashboard, while Skills and Integrations are placeholders. The Fleet screen answers four questions: which robots need attention and why, where they are, what they are doing, and how current the information is.

The interface starts in the standard light theme. A button switches between light and dark. The choice is kept in the browser.

The dashboard lists the robots, with tiles for All robots, Needs attention, Offline, and Low battery, plus filters and search. Choosing a tile, a filter, or a search adds a chip above the table, so you can see what the list is showing.

The table polls every 5 seconds. That was enough for this proof of concept.

Each row shows the robot's stable details and its current state, and offers actions. The list shows newest registered first, with pagination enabled. The other columns are not sortable. Those values can be filtered, and sorting by battery is not useful here.

The app starts empty. You can auto-magically(POC) create 1, 10, or 100 generated robots. The simulator picks each one up and starts tracking it.

It is possible to delete individual robot via row action or drop all of them via the action in the split button.

Clicking the robot row will open a details page about that robot. That includes commands, an illustrative location view, model data, and a static log sample.

## How to run

Use Node.js 26 and npm. From this directory:

```bash
npm ci
npm run db:setup
npm run dev
# second terminal
npm run simulator
```

Open http://localhost:3000. The fleet is stored in `data/fleet.sqlite`. Set `DATABASE_PATH` if you want a different file. A new database is empty. Nothing is seeded on startup, and the schema is created only when you run that command.

`npm run dev` and `npm run simulator` each need their own terminal. Rows stay on unknown telemetry until a report arrives. Leave the simulator running while you use the dashboard. If the app is not at http://localhost:3000, set `SIMULATOR_API_URL`.

## Simulator

The simulator is a separate process. It does not open the database. About once a second it loads the fleet over HTTP, picks up robots you add, and posts their telemetry back. Robots start Idle at Base, go to work, return when the battery is low, and charge. The row menu can start, stop, send a robot home, or retry. About one robot in five runs into a problem, and about one in five periodically stops reporting so the dashboard can show Offline. Only the latest report and the latest command are stored. Run one simulator. This is a local stand-in so the interface has something live to show.

## Checks

- `npm test` runs the Vitest unit and integration tests: component interactions, polling and error cases in jsdom, plus database contracts and simulation rules in Node.
- `npm run test:e2e` runs Playwright user journeys against its own temporary database, starting each test with an empty fleet. Local runs use visible Chrome; CI runs headless. Failure traces are saved in `test-results/`.
- `npm run lint` runs ESLint with the Next.js config, type-checked TypeScript, and the recommended accessibility rules.
- `npm run knip` flags unused files, exports, and dependencies.

CI runs these commands on every push.
