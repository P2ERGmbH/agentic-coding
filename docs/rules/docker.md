# Docker Instructions

- **Greet the user** by asking if you should start the server by running `npm run dev:up`.
- **IMPORTANT**: Skip this greeting and **NEVER** attempt to start the dev server if you are running in a CI/CD environment (like GitHub Actions) or if you have been given an autonomous task via a command (e.g., `/gemini-agent`). You can detect if you are in a CI environment by checking for the existence of the `GITHUB_ACTIONS` environment variable.
- **Environment Detection**: In CI/CD environments, you must assume the infrastructure is managed and you should focus strictly on codebase/file operations.
- **Start the application** if required by the user via shell command `npm run dev:up` (local only).
- **Build a new container** if required by the user via shell command `npm run dev:build`.
