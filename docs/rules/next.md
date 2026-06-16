# Next.js Development Guidelines

## Pages and Components

- **Server Components**: Pages should always be server components unless interactivity is required. In that case, use the `"use client"` directive at the top of the file.
- **Metadata**: Every page should provide at least `title` and `description` metadata.
- **Async Params**: If `page.tsx` uses an async function to pass a `params` object, the interface should expect `params` to be a `Promise` and it must be awaited before use.

## Routing and Internationalization

- **I18n Utilities**: Always use `Link`, `useRouter`, `usePathname`, and `redirect` from `@/i18n/routing` (or the relevant `i18n` folder) to ensure consistent internationalization. **Never** use `next/link` or `next/navigation` directly for internal routing.
- **Link vs Router**: **Always** prioritize using the `Link` component from `@/i18n/routing` for internal navigation wherever possible instead of `router.push()`. Using `Link` ensures Next.js correctly resets the scroll position to the top, enables prefetching, and improves accessibility. Only use `router.push()` when navigation must be triggered programmatically (e.g., after a successful form submission).
- **Path Verification**: Before using a `Link` or `Router`, always check `routing.ts` for valid paths and parameters.
- **Configuration**: Always update the `pathnames` configuration in `src/i18n/routing.ts` whenever adding a new page or API route.
- **next-intl `usePathname` Gotcha**: Be aware that the `usePathname()` hook from `next-intl` (re-exported in `@/i18n/routing`) may return the unparsed Next.js template string (e.g., `/provider/[slug]/settings`) rather than the actual resolved URL path (e.g., `/provider/provider-1/settings`). When exact path matching is required (e.g., for active state highlighting in navigation), you must manually resolve the template path by injecting the values from `useParams()`.
- **Page Refresh**: 🟡 Using `window.location.reload()` forces a full page reload, which resets all client-side state. In Next.js App Router applications, it is recommended to use `router.refresh()` (from `useRouter` via `@/i18n/routing` or `next/navigation`) to re-fetch Server Components while preserving React and browser state.

## Client-Server Interaction

- **Server Actions**: Implement client-server interaction as actions in the `actions` directory.
- **Directives**: Action files must have the `"use server"` directive at the top.
- **Data Fetching**: Do not implement direct database calls or external data fetching inside Client Components. Always use Server Actions to orchestrate server-side data mutations and retrievals.

## Cache

- **Cache Components**: We are using `cacheComponents` mode.
- **Directives & Functions**: Utilize `"use cache"`, `cacheTag`, `cacheLife`, `revalidateTag`, and `revalidatePath`.
- **No React Cache**: **Never** use React `cache()`.
## Configuration and Middleware

- **Middleware**: In this project, middleware logic is centrally managed in `src/proxy.ts`. This file is the official Next.js middleware implementation. **Do NOT** create `src/middleware.ts` as it will conflict with `src/proxy.ts`.
- **Background Processing**: This project uses the Next.js `after()` hook for background tasks. See `docs/infrastructure/background-processing.md` for details on behavior and limits.

## Page Architecture & Cache Components (Next.js 16+)

- **Server-Side Structural Rendering**: Maximize server-side rendering for page structure and text. Use `getCachedTranslations` on the server instead of passing client translation hooks whenever possible.
- **Granular Client Components**: Do not make the entire page a single "Client Component". Instead, break interactive parts into small, granular leaf-node Client Components (e.g. `<SearchInput />`, `<MergeDialog />`).
- **Suspense Boundaries**: Only wrap components that _actually_ need to stream or perform asynchronous data fetching in a `<Suspense>` boundary. Avoid wrapping the entire page in a single `<Suspense>` unless the whole page is dynamically generated and blocks the static shell.
- **Context Orchestration**: Instead of lifting all state to the top-level page (which forces the page to be a Client Component), use React Contexts (e.g. `<FeatureContext>`) to orchestrate state between granular client components. Use a Context Hydrator if you need to pass initial server data into the context without making the provider a data-fetching client component.
- **Static Shell**: Ensure that the core layout (headers, titles, descriptions) is part of the static shell (prerendered) to take full advantage of Partial Prerendering (PPR) and the `cacheComponents` architecture.
