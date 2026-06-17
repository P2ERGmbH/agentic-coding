---
name: review-performance
description: Perform performance testing and review of specific pages, identifying and fixing bottlenecks.
---
# Performance Review Workflow

This workflow guides you through standardizing the performance testing and review of specific pages in the application.

## Role & Persona
You are an expert performance engineer and autonomous agent.

## Trigger
Use this workflow whenever the user asks to "run the review-performance workflow", "review performance for [URL]", or as a subsequent step during the `github-issue-test` workflow.

---

## Phase 1: URL Selection and Route Resolution

1.  **URL Identification**:
    *   If a URL is provided by the user (e.g., `https://www.your-domain.com/de/product/some-product` or `http://localhost:6767/de/provider/...`), use it.
    *   If NO URL is provided, fetch `http://localhost:6767/sitemap.xml`, parse it, and pick a random URL from the sitemap to test.
2.  **Route Pattern Matching**:
    *   Extract the locale (e.g., `de`, `en`, `fr`) and the remaining path from the selected URL.
    *   Map the path to the corresponding route pattern. Inspect the configuration for `paths.src` (e.g. `src/` or `.`) and search for any i18n pathnames files (`paths.src/i18n/pathnames.ts` or equivalent i18n configurations). If i18n configurations do not exist, map directly to the route segments.
    *   Example: `.../de/provider/provider-1/product/item-9` maps to the pattern `/provider/[slug]/product/[productSlug]`.
3.  **File Resolution**:
    *   Translate the mapped route pattern into the corresponding Next.js file path within the configured app pages directory (e.g. `paths.app` or `src/app`).
    *   Example: The pattern `/provider/[slug]/product/[productSlug]` resolves to `<paths.app>/[locale]/provider/[slug]/product/[productSlug]/page.tsx` (or `<paths.app>/provider/[slug]/product/[productSlug]/page.tsx` if non-localized).
    *   Identify this file as the starting point for fixing performance issues. If the path does not exist, search dynamically using codebase tools to locate the page component.

---

## Phase 2: Automated Performance Analysis

1.  **Initialize Browser & Trace**:
    *   Ensure the `chrome-devtools` MCP is available.
    *   Use `navigate_page` to go to the target URL.
    *   Wait for the page to visually stabilize.
    *   Use `performance_start_trace` with `reload: true` to begin capturing frontend performance issues, Core Web Vitals (LCP, INP, CLS), and page load speed.
2.  **Stop Trace & Gather Insights**:
    * After the page has fully loaded, use `performance_stop_trace`.
    * Analyze the generated trace file. Look for specific Performance Insights returned by the DevTools.
    * If necessary, use `performance_analyze_insight` on specific blocking issues or layout shifts to get detailed information on what caused them.
    * **Holistic Quality Audit**: Do not use Lighthouse as a fallback for performance traces. Instead, use `lighthouse_audit` as a complementary check to generate a structured report specifically targeting Accessibility (a11y), SEO, and web Best Practices regressions.

---

## Phase 3: Issue Identification & Fixing

1.  **Identify Blocking Issues**:
    *   Correlate the findings from the performance trace (e.g., large layout shifts, long main thread tasks, unoptimized images, slow server response times) with the components rendered on the page.
2.  **Locate Source Code**:
    *   Start at the `page.tsx` file resolved in Phase 1.
    *   Trace the performance bottlenecks down the component tree (using `list_code_definition_names`, `search_files`, and `read_file` as needed).
3.  **Implement Fixes**:
    *   Apply performance optimizations. Common Next.js/React fixes include:
        *   Implementing dynamic imports (`next/dynamic`) for heavy, non-critical components.
        *   Optimizing images with `next/image` (e.g., adding `priority` to LCP images, fixing sizing).
        *   Adding Suspense boundaries for localized data fetching.
        *   Memoizing expensive calculations or components.
    *   Use `replace_in_file` to implement the fixes in the codebase.

---

## Phase 4: Verification and Reporting

1.  **Re-Test Performance**:
    *   Run another `performance_start_trace` / `performance_stop_trace` cycle to verify the optimizations have improved the metrics (e.g., reduced LCP or CLS).
2.  **Document Results & Issue Management**:
    *   **Contextual Run (Inside another workflow)**: If the performance review was invoked in the context of an existing issue (e.g., during a code review or the `github-issue-test` workflow), document the performance findings and actionable improvements as a comment in the existing GitHub issue using the `add_issue_comment` tool.
    *   **Standalone Run (No existing issue)**: If the performance review was invoked standalone (not tied to an existing issue):
        1. Use the `.agents/skills/github-issue-create` skill to create a new issue documenting the performance bottlenecks found for the tested page.
        2. Assign yourself or fix the performance problems starting at the resolved `page.tsx`.
        3. Once the issue is successfully completed and fixed, refine it using the `.agents/skills/github-issue-refine` skill.
    *   Provide a comprehensive summary to the user detailing:
        *   The tested URL and the resolved Next.js route path.
        *   The initial performance bottlenecks discovered.
        *   The specific files and components modified.
        *   The optimizations implemented.
        *   The results of the post-optimization trace.
3.  **Cleanup Browser Session**:
    *   To prevent accumulating orphaned browser tabs, use `mcp_chrome-devtools_list_pages` and `mcp_chrome-devtools_close_page` to close the pages opened during the performance tests.
