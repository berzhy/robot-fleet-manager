Pay extra attention to architecture, structure, code cleanlines and code quality! No "AI slop" please!

## Where styles go

- **Theme (`src/theme/theme.ts`)**: palette, typography and shape tokens, and looks shared across components (focus ring, accessible text colours). Each entry carries a one-line comment saying why it exists.
- **Component props first**: dedicated MUI props (`spacing`, `align`, `variant`, `color`) and native props (SVG `opacity`) before `sx`.
- **Component `sx`**: layout, and looks that belong to that one component. Use palette keys (`"text.secondary"`), never colour literals.
- **Shared `sx` constant**: a recipe repeated across files (`src/theme/illustration.ts`). Promote to the theme only when it becomes an app-wide rule.
- **Theme values in code**: `theme.vars.palette` (CSS variables are always on; tests render with the app theme through `@/query/test-utils`).

## Code quality bar

Readability is the top priority: the author walks reviewers through this code line by line, so it must read clearly on the first pass.

- Use what TanStack Query, Next.js, React and MUI already provide before writing custom machinery; custom code needs a one-sentence reason.
- Full-word names; booleans read as questions (`isPending`, `hasFilters`); `onX` props and `handleX` handlers; one concept keeps one name across the codebase.
- No magic values: meaningful numbers and strings become named module constants with units in the name (`pollIntervalMs`).
- Blank lines between logical groups (hooks, derived values, handlers, render). File order: imports, types, constants, main export, private helpers.
- One job per component or hook. More than about seven props means the boundary is wrong. No mode flags (`null` meaning "all", behaviour-switching booleans).
- Derive types from zod schemas and `as const` arrays; `as` casts only at I/O boundaries.
- Comments explain why, never what. No dead code or speculative abstractions. Prefer changes that delete code.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
