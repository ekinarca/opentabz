# Contributing to OpenTabz

Thanks for wanting to help build the open notation and tablature workstation. This guide covers
everything you need to get productive.

## Ground rules

1. **No stubs.** A feature either fully works and is tested, or it is absent from the UI. No
   "coming soon", no disabled buttons for unimplemented features, no placeholder audio.
2. **Proof over claims.** A change is done when it is verified in a real browser and locked by
   tests: unit tests, Playwright E2E, visual snapshots, numeric audio assertions as applicable.
3. **Never weaken a test or disable a lint rule** to get green CI. Fix the cause.
4. **Legal hygiene.** Never commit copyrighted songs or tabs (fixtures are authored in alphaTex or
   come from permissively licensed sources). Do not copy code from license-incompatible projects.
   "Guitar Pro" may only be used descriptively. No Ultimate Guitar integration of any kind.
5. **Privacy is a feature.** No analytics, cookies, tracking or network calls beyond the app's
   own assets and sound packs a user explicitly downloads.

## Setup

Requirements: Node.js 24 (see `.nvmrc`) and pnpm via Corepack.

```bash
corepack enable pnpm
```

```bash
pnpm install
```

```bash
pnpm dev
```

The app runs at http://localhost:5173.

## Everyday commands

| Command                          | What it does                                                         |
| -------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                       | Start the web app with hot reload                                    |
| `pnpm check`                     | Typecheck, lint, format check and unit tests (run before every push) |
| `pnpm test`                      | Unit tests (Vitest) for all packages                                 |
| `pnpm test:e2e`                  | Playwright tests against a production build                          |
| `pnpm fixtures`                  | Regenerate generated fixtures from the alphaTex sources              |
| `pnpm build`                     | Production build of `apps/web`                                       |
| `node scripts/feature-matrix.ts` | Validate `docs/FEATURE_MATRIX.md`                                    |

## Repository map

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). In short: `apps/web` is the application,
`packages/core` is the zero-DOM engine library that runs in a worker, `packages/ui` is the design
system. Decisions live in [docs/DECISIONS.md](docs/DECISIONS.md), the feature inventory in
[docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md).

## Working on the engine (alphaTab)

OpenTabz pins `@coderline/alphatab` and patches it with `pnpm patch`. To change a patch:

```bash
pnpm patch @coderline/alphatab@1.8.4
```

Edit the files in the printed directory, then commit the patch with `pnpm patch-commit <dir>`.
Every patch needs a write-up in `docs/upstream/` describing the equivalent change to alphaTab's
TypeScript sources so it can be offered upstream.

## Fixtures

- `fixtures/alphatex/` — scores authored for OpenTabz in alphaTex (AGPL, original content).
- `fixtures/alphatab/` — feature test files from alphaTab's repository (MPL-2.0, unmodified).
- `fixtures/generated/` — files produced from the alphaTex sources by `pnpm fixtures`.
- `fixtures/private/` — your own real-world files; gitignored and never committed. Tests pick
  them up automatically when present.

## Commits and pull requests

- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `perf:`,
  `docs:`, `test:`, `refactor:`, `chore:`), small and focused.
- Update `docs/FEATURE_MATRIX.md` when a feature's status changes and `CHANGELOG.md` for
  user-visible changes.
- Fill in the pull request template, including proof (screenshots, measurements).

## Code style

TypeScript strict everywhere, no `any`. Prettier formats, ESLint (type-aware) lints. User-facing
strings belong in `apps/web/src/strings.ts`. Prefer small modules with unit tests over large
components; keep hot paths (rendering, playback, input) free of React re-renders.

By contributing you agree that your contributions are licensed under the AGPL-3.0-or-later.
