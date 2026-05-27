# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

Nx plugins (written in TypeScript) that integrate PHP/Composer projects into an Nx workspace. The published packages are `@nx-php/composer`, `@nx-php/phpstan`, and the umbrella `nx-php`. End-user docs live in `README.md`; this file is for working *on* the plugins.

## Common commands

Run from the repo root (Node 20+, uses `npm ci --legacy-peer-deps` in CI):

- Build all plugins: `npx nx run-many -t build`
- Lint + test + build (what CI runs): `npx nx run-many -t lint test build`
- Test a single package: `npx nx test composer` (or `phpstan`, `nx-php`)
- Run a single Jest test file: `npx nx test composer --testFile=project-discovery.spec.ts`
- Lint one package: `npx nx lint composer`
- Build one package: `npx nx build composer` (outputs to `dist/<pkg>`)
- End-to-end test: `npx nx run nx-php-e2e:e2e` — spins up a Verdaccio local registry, publishes the freshly built plugins as `@e2e`, scaffolds a temp Nx workspace, and installs them. Slow; do not run casually.

There is no top-level `npm` script — everything goes through `nx`.

## Architecture

Three publishable packages under `packages/`, plus an e2e harness:

- **`packages/composer`** — discovers any `composer.json` in the workspace via an Nx `CreateNodesV2` plugin (`src/project-discovery.ts`). For each `composer.json` it derives a project name (from `name` field), `projectType` (`project` → `application`, else `library`), `sourceRoot` (first PSR-4 directory), and tags (`composer:<type>`, `keyword:<kw>`). Also ships a generator (`generators.json` → `src/generators/project`) for scaffolding new Composer projects with default `install`/`test` targets.
- **`packages/phpstan`** — `CreateNodesV2` plugin matching `phpstan.neon{,.dist}` / `phpstan.json{,.dist}` / `phpstan.php{,.dist}`. Adds a cached `phpstan` target running `vendor/bin/phpstan analyze --configuration=<file>` with inputs scoped to project PHP sources and composer manifests.
- **`packages/nx-php`** — umbrella package that re-exports both plugins.
- **`packages/nx-php-e2e`** — Jest-based e2e that depends implicitly on `nx-php` and `composer`; tests run via the Verdaccio flow described above.

Plugins are wired into a consumer workspace by adding `"@nx-php/composer"` (and/or `"@nx-php/phpstan"`) to the `plugins` array in that workspace's `nx.json`. The plugins do not register themselves — `createNodesV2` is exported from the package entry point and Nx invokes it.

## Conventions

- TypeScript strict; built with `@nx/js:tsc`. Tests use Jest via `@nx/jest:jest`.
- Project discovery code uses `@nx/devkit` types (`CreateNodesV2`, `ProjectConfiguration`, `TargetConfiguration`, `logger`). Failures must be logged and swallowed — return an empty result for that config file rather than throwing, so one bad `composer.json` doesn't break the whole graph.
- Project roots in `createNodesV2` are relative to `context.workspaceRoot`; do not assume absolute paths.
- Release: `npx nx release` (driven by `nx.json` `release.version.preVersionCommand` which builds all packages first). Each package's `project.json` declares `release.version.manifestRootsToUpdate` pointing at `dist/<pkg>`.

## Things to know

- `npm install` requires `--legacy-peer-deps` (matches CI).
- Generated dist artifacts under `dist/` are `.gitignore`d build output — don't edit them; edit `packages/<pkg>/src` and rebuild.
