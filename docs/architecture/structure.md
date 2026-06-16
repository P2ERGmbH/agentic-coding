# Codebase Structure

This document provides a detailed overview of the Next.js application project structure and architectural patterns.

## Directory Overview

### `src/app`
Next.js App Router root. Contains pages, layouts, and route handlers.
- Nested folders represent URL segments.
- Page-specific components are located in a `components/` folder sibling to `page.tsx`.

### `src/actions`
Contains Server Actions. 
- Files must have `"use server"` at the top.
- Actions should handle authorization checks and then call backend services or data access logic.

### `src/components`
Shared UI components.
- `src/components/ui`: Atomic components (buttons, inputs, etc.) based on shadcn/ui.
- Page-specific components are kept local to the route (in `src/app/.../components`).

### `src/lib`
Core business logic and service integrations.
- `src/lib/services`: Core services, external API integration wrappers, and helper libraries.
- `src/lib/integrations`: Integrations with external APIs and mapping logic.
- `src/lib/auth`: Authentication logic (Auth.js/NextAuth configuration).

### `src/types`
Centralized TypeScript interfaces and types. 
- **Mandate**: All data structures must be strongly typed here. Never use `any`.

## Core Architectural Patterns

### 1. Next.js Middleware
- **File**: `src/proxy.ts`
- **Purpose**: This file serves as the official Next.js middleware for the project, handling canonical domain enforcement, asset rewrites, and security. Do not create `src/middleware.ts` as it will conflict with this implementation.

### 2. Internationalization (i18n)
- **Location**: `src/i18n`
- **Routing**: Always use utilities from `@/i18n/routing` for navigation.

### 3. Server-First Architecture
- Prefer Server Components.
- Use Client Components (`"use client"`) only for interactive leaf nodes.
- Use React Context only for cross-component state orchestration, not for global data storage.

### 4. Background Processing
- Utilizes the Next.js `after()` hook for non-blocking tasks (e.g., logging, background sync).
- Reference: `docs/infrastructure/background-processing.md`.
