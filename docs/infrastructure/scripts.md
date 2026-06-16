# NPM Scripts and Utilities

This document provides a detailed catalog of the custom NPM scripts and utility files used in the Next.js application project.

## Development & Environment Lifecycle

- **`npm run dev:up`**: Runs `scripts/dev-up.sh`. This is the primary entry point for local development. It stops existing containers, cleans the environment, and starts the Next.js dev server.
- **`npm run dev:build`**: Runs `scripts/dev-build.sh`. Rebuilds the Docker containers (`dev.Dockerfile`). Use this after changing `package.json` or Docker configuration.
- **`npm run dev:down`**: Stops and removes all local Docker containers and volumes.
- **`npm run dev`**: Runs `next dev` directly on port 6767 with Turbopack. This is the command executed inside the `next` container.

## Maintenance & Code Quality

- **`npm run lint:changed`**: Runs `scripts/lint-changed.sh`. Uses `git diff` to identify and lint only the files changed in the current branch, significantly speeding up the linting process.
- **`npm run compile`**: Runs `tsc --noEmit`. Essential for verifying type safety across the entire project without generating output files.
- **`npm run icons`**: Automates the conversion of SVG files in `src/icons/svgs` into React components using `@svgr/cli` and ensures they are properly formatted.

## Logging & Debugging

- **`npm run log:view`**: Shows the last 500 lines of `log.txt`. The primary way to check for runtime errors.
- **`npm run log:follow`**: Real-time tailing of `log.txt`.
- **`npm run log:clear`**: Resets the `log.txt` file. **Always run this before testing a new feature.**
