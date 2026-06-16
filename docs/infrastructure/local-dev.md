# Local Development Environment

This document explains how to set up and manage the local development environment for the Next.js application.

## Docker Architecture
The local environment is fully containerized using Docker for development consistency.

### Core Files
- `dev.Dockerfile`: The Dockerfile for the Next.js development server.
- `docker-compose.dev.yml`: Orchestrates the Next.js container.
- `.env`: Environment variables for the application.

### Services
1. **`next`**: The Next.js application running in development mode (with Hot Module Replacement).

## Common Workflows

### Starting the Environment
Always use the helper scripts to ensure a clean start:
```bash
npm run dev:up
```
This script stops any existing containers and starts the environment in the foreground.

### Rebuilding Containers
If `package.json` or the Dockerfiles change:
```bash
npm run dev:build
```

## Networking
- **Next.js App**: http://localhost:3000
