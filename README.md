# Fleet dashboard

```
> Claude make a robot orchestaration dashboard, make it nice, and NO "AI slop"!  :)
```

Hi, this is my take on the engineering challenge, using Next.js and MUI. I focused on the interface, its behaviour, and the overall structure. I used AI extensively to move quickly and explore ideas.

Hope we can discuss more this week!

## What to try

The fleet dashboard shows which robots need attention, where they are, and what they are doing. You can search and filter the fleet, add or delete robots, and open a robot's details to start, stop, send it home, or retry.

The app starts empty. Add 1, 10, or 100 generated robots and leave the simulator running to see activity, battery changes, problems, and robots going offline. The dashboard updates every five seconds.

The location view is illustrative and the logs are a static sample. Skills and Integrations are placeholders.

## How to run

Use Node.js 26 and npm. From this directory:

```bash
npm ci
npm run db:setup
npm run dev
```

In a second terminal:

```bash
npm run simulator
```

Open http://localhost:3000. Run one simulator and keep it running while trying the dashboard. Fleet data is saved locally in `data/fleet.sqlite`.

## Checks

```bash
npm test
npm run test:e2e
npm run lint
npm run knip
```
