---
name: github-issue-refine
description: Refine an existing GitHub issue to improve clarity, technical implementation details, and alignment with project rules.
---
# GitHub Issue Refinement Workflow

This workflow guides you through refining an existing GitHub issue to improve its clarity, technical implementation details, and alignment with project rules.

## Trigger
Use this workflow when the user asks to "refine an issue," "improve a ticket," "groom a task," or "update the issue description."

---

## Phase 1: Research & Validation

1.  **Fetch Issue Details**:
    *   Retrieve the issue details: `gh issue view $ISSUE_NUMBER`
2.  **Analyze Current State**:
    *   Identify the core goal and success criteria.
    *   Assess if the current implementation plan is specific enough.
    *   Check for missing contexts (UI constraints, etc.).
3.  **Cross-Reference docs/rules**:
    *   Verify that the proposed solution aligns with:
        *   `next.md`: Are Server Actions and Client/Server component rules followed?
        *   `ui.md` & `icons.md`: Is the component and icon usage correct?
        *   `testing.md`: Is there a clear strategy for Vitest?
        *   `figma.md`: Explicitly read this file to ensure Figma implementations adhere to the parsing rules, cleanup requirements, and master component references.

---

## Phase 2: Technical Refinement

1.  **Improve Implementation Steps**:
    *   Refine generic steps into specific actions tied to concrete files and functions.
    *   Ensure every step has a "Reason" explaining *WHY* it's necessary.
2.  **Add Additional Context**:
    *   **Examples**: Provide snippets of expected data structures or code patterns.
    *   **Diagrams**: Use Mermaid syntax for complex state transitions or data flows.
    *   **Documentation**: Reference specific documentation paths (e.g., from `nextjs_docs`) relevant to the implementation.
3.  **Deep File Investigation**:
    *   Use `list_code_definition_names` or `search_files` to find related logic that might be affected but wasn't mentioned in the original issue.
4.  **Visual Context & Attachments**:
    *   **Current State**: If possible, use browser automation tools to take a screenshot of the current state of the application (the "before" state). Ensure you clean up your browser session afterward by closing the opened pages using `mcp_chrome-devtools_list_pages` and `mcp_chrome-devtools_close_page`.
    *   **Figma Design**: If a Figma layout link is provided in the issue, use the Figma MCP tool to download an image of the Figma frame to visually demonstrate what the design should be (the "after" state).
    *   **Issue Update & Image Hosting**: Because `gh` CLI cannot directly upload images to issues, create a new branch named `assets/issue-$ISSUE_NUMBER`. Push the downloaded images to `.github/assets/issue-$ISSUE_NUMBER/` on that branch. Then, update the issue description with standard Markdown image links using the GitHub blob URL with `?raw=true` (e.g., `![alt](https://github.com/OWNER/REPO/blob/assets/issue-$ISSUE_NUMBER/.github/assets/issue-$ISSUE_NUMBER/image.png?raw=true)`). This ensures the images render correctly even in private repositories.

---

## Phase 3: Quality, Performance & Accessibility Refinement

1.  **Refine Acceptance Criteria**:
    *   Ensure ACs are atomic, binary (pass/fail), and measurable.
2.  **Web Accessibility & Best Practices (German Standards)**:
    *   Verify the implementation plan adheres to strict web accessibility guidelines (e.g., BITV 2.0 / WCAG 2.1 AA+ standards typical for German requirements).
    *   Ensure proper ARIA attributes, keyboard navigation, and semantic HTML are explicitly required in the issue.
3.  **Performance & Page Speed**:
    *   Embed requirements for optimal performance (e.g., optimized image loading, lazy loading, minimal main-thread blocking).
    *   Add a verification step to test affected pages using tools like [PageSpeed Insights (https://pagespeed.web.dev/)](https://pagespeed.web.dev/) and specify a target score if applicable.
4.  **Define Edge Cases**:
    *   Identify potential failure points (e.g., empty states, network errors, invalid inputs).
    *   Add specific ACs or implementation notes for handling these edge cases.
5.  **Wording & Structure**:
    *   Improve the clarity of the description and context sections.
    *   Ensure consistent use of markdown headers and lists for scannability.
6.  **Translations & Internationalization**:
    *   Identify all strings that need translation in the affected files.
    *   Ensure that every implementation step requiring UI text includes the use of translation keys.
    *   Mandate that all used translations are configured in the respective `messages/*.json` files (e.g., `de.json`, `en.json`, `fr.json`).
7.  **Next.js 16 & Config Awareness**:
    *   Ensure the implementation plan fully leverages Next.js 16 features and aligns with the current `next.config.ts` setup.
    *   Specifically, facilitate the use of [Cache Components](https://nextjs.org/docs/app/getting-started/cache-components) if applicable, as they are enabled in the project.
    *   Verify compatibility with available modules and the project structure derived from `package.json`.
8.  **Testing Strategy**:
    *   Explicitly define what should be covered by unit tests (Vitest) vs. manual verification.
    *   Update the "Verification Steps" to include logs check (`npm run log:view`) and build check (`npm run compile`).

---

## Phase 4: Issue Update

1.  **Construct Refined Body**:
    *   Combine your research and improvements into a comprehensive markdown body following the structure of `.github/ISSUE_TEMPLATE/gemini_agent_workflow.md`.
2.  **Execute Update**:
    ```bash
    gh issue edit $ISSUE_NUMBER --body "[Refined Markdown Body]"
    ```
3.  **Notify the User**:
    *   Summarize the key refinements made (e.g., "Added edge cases for database errors," "Aligned with Next.js 16 caching rules").
    *   Provide a link to the updated issue.
4.  **Final Check**:
    *   If the model name includes "flash", double-check the refined issue 2 more times for precision and completeness.
