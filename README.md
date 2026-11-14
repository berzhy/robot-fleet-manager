This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The dashboard uses ten fictional robots and a mock query with a 1.5-second delay. Use **Demo state** to choose Success, Empty, or Error; **Reload** replays the selected scenario. Retry repeats an error until you select a different scenario. Pagination is fixed at 20 rows per page. Robot rows open a basic details page with breadcrumbs. The backend and live telemetry are intentionally deferred so this first slice focuses on the interface and its loading, empty, and failure behaviour.

Run `npm test` for unit and component tests. They cover the mock query, table states, stale responses, pagination with a larger test fixture, and basic details.

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
      fleet-demo-controls.tsx
      fleet-table/             # Table entry, rows, skeletons, and empty/error states
      robot-details/           # Details entry and presentation
      api/                     # Robot queries and current mock fixtures
      hooks/                   # React request lifecycle
      types/                   # Feature data contracts
      utils/                   # Feature-specific formatting helpers
```

Component images live in `src/assets/` and use static imports through Next.js Image. Reserve root `public/` for files requiring a fixed public URL; the favicon follows the `src/app/favicon.ico` convention.

Group code by feature, then by responsibility. A feature or composed component folder has a matching entry file, such as `fleet-table/fleet-table.tsx`. Tests live beside their subjects. Use direct imports; `@/` resolves to `src/`.

Future zones such as skills, integrations, producers, and admin belong beside `fleet-dashboard` under `features/`. Introduce focused `shared/` utilities or reusable `modules/` only when code is actually needed across features. Data access stays behind the feature's query functions so fixtures can later be replaced with backend requests.

The dashboard route is `src/app/(fleet-dashboard)/page.tsx`; its screen implementation is `src/features/fleet-dashboard/fleet-dashboard.tsx`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

Material UI is configured with the Next.js App Router style cache and a shared theme in `src/theme/theme.ts`. It uses Geist and defaults to the system light/dark preference. The top-right theme button switches modes and saves the selection locally. See [decisions.md](./decisions.md) for the current product direction and open questions.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
