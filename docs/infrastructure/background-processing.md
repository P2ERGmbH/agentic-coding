# Background Processing with after()

This project uses the Next.js `after()` hook for background tasks, primarily for data synchronization (upserts) after searches.

## Key Findings & Limits

- **Execution Timing**: `after()` callbacks execute strictly *after* the primary response has been flushed to the client.
- **Parallelism**: Multiple `after()` hooks registered during a single request run in parallel.
- **Duration**: Verified support for tasks running at least 30 seconds.
- **Context Access**: `after()` has access to the original request context.
  - In **Route Handlers** and **Server Functions**, you can call `cookies()` and `headers()` directly inside the callback.
  - In **Server Components**, you **cannot** call them inside `after()`; read them during rendering and pass the values in.
- **Error Handling**: Errors within `after()` are caught and logged by the Next.js runtime; they do not affect the client response.
- **Concurrency**: Verified handling of 50+ concurrent background tasks from a single request without issues in the development environment.
- **Self-Hosting (Docker)**: `after()` is fully supported in standalone mode. Graceful shutdown (SIGTERM) waits for pending `after()` callbacks to complete (default Docker timeout is 10s, consider increasing to 30s for heavy background work).

## Implementation Pattern

Always wrap background work in a `try-catch` block inside `after()` and use a throttling mechanism (like `'use cache'`) to avoid redundant work:

```typescript
import { after } from 'next/server';
import { cacheTag, cacheLife } from 'next/cache';

after(async () => {
  try {
    await throttledBackgroundTask(data);
  } catch (err) {
    console.error('Background task failed:', err);
  }
});

async function throttledBackgroundTask(data) {
  'use cache';
  cacheTag(`task-${data.id}`);
  cacheLife('days');
  // ... side effects ...
}
```
