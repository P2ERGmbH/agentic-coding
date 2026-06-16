---
name: review-pull-request
description: Extensively review a GitHub Pull Request using the GitHub MCP, ensuring strict adherence to project mandates and identifying cross-file issues. Automatically request changes or approve based on finding severity.
---
# GitHub Pull Request Review Workflow

This workflow guides you through an **extensive and in-depth** review of a GitHub Pull Request using the GitHub MCP integration. You act as an uncompromising senior architect and CI/CD gatekeeper.

## Trigger
Use this workflow when requested to "review pull request #X", "run a PR review", or when executing within a GitHub Actions review workflow.

---
## Phase 1: Isolated Git Worktree Setup (MANDATORY)

To ensure the review is conducted on the actual PR codebase with full lint, compile, and verification capabilities without polluting your main workspace, you MUST first set up an isolated Git Worktree:

1.  **Identify the PR Branch**: Fetch the PR branch name (`$PR_BRANCH` or `$HEAD_BRANCH`) using `mcp_github_get_pull_request`.
2.  **Create or Switch to Dedicated Worktree**:
    The dedicated worktree directory is `worktrees/pr-<PR_NUMBER>`.
    *   **If the worktree directory DOES NOT exist**:
        Create it by cloning/adding the PR branch into the dedicated worktree directory:
        ```bash
        git worktree add worktrees/pr-<PR_NUMBER> <PR_BRANCH>
        ```
        *Note: If the branch isn't available locally, fetch it from origin first:*
        ```bash
        git fetch origin pull/<PR_NUMBER>/head:<PR_BRANCH>
        git worktree add worktrees/pr-<PR_NUMBER> <PR_BRANCH>
        ```
    *   **If the worktree directory ALREADY exists**:
        Switch to the directory and pull the latest changes:
        ```bash
        cd worktrees/pr-<PR_NUMBER> && git pull
        ```
3.  **Copy Environment Configuration**:
    Copy the `.env` file from the root project directory into the worktree directory:
    ```bash
    cp .env worktrees/pr-<PR_NUMBER>/.env
    ```
4.  **Symlink Node Modules**:
    Symlink the `node_modules` directory from the root project directory to the worktree directory to avoid duplicate installation overhead:
    ```bash
    ln -s ../../node_modules worktrees/pr-<PR_NUMBER>/node_modules
    ```
5.  **Start the Review**:
    Execute all subsequent context-gathering (reading files, checking imports) and local linting/compiling inside the dedicated worktree directory `worktrees/pr-<PR_NUMBER>`.

---
## Phase 2: Context Gathering (The Comprehensive Scan)

1.  **Identify the Target**: Retrieve the PR number (`$PR_NUMBER`), repository owner (`$OWNER`), and repository name (`$REPO`).
2.  **Fetch PR Details**: Use `mcp_github_get_pull_request` to get the PR title, body, HEAD, and BASE branch information.
3.  **Identify Linked Issues**: Scan the PR body for references like `Fixes #X`, `Closes #X`, or `Resolves #X`. Use `mcp_github_get_issue` to fetch the details of these linked issues.
4.  **Fetch All Changed Files**: Use `mcp_github_get_pull_request_files`. **You must review EVERY changed file.** Do not skip files. A common failure is fixing an issue in File A but introducing a related issue in File B. You must catch these cross-file regressions.
5.  **Fetch Previous Reviews**: Use `mcp_github_get_pull_request_reviews` and `mcp_github_get_pull_request_comments` to understand previous feedback and check if old issues were resolved.
6.  **Read Mandates**: Refresh your memory on project rules from `docs/rules/` and `GEMINI.md`.

---

## Phase 3: Systematic Review Criteria

Meticulously evaluate the changes against these criteria:

### 0. Functional Completeness (Linked Issue Alignment)
*   **Feature Parity**: Does the implementation cover ALL requirements and success criteria defined in the linked issue(s)?
*   **Missing Logic**: Identify any "TODOs" or missing edge cases that were explicitly mentioned in the issue but are absent in the PR.

### 1. Project Mandate Compliance (GEMINI.md)

*   **JSDoc**: Does every new or modified exported function/class have detailed JSDoc explaining *why* it exists?
*   **Theme & Styling**: Are custom shadow variables (`shadow-100` to `shadow-500`) and theme colors being used instead of arbitrary Tailwind values (like `shadow-sm` or `text-green-600`)?
*   **I18n Routing**: Are `Link`, `useRouter`, `usePathname`, and `redirect` imported from `@/i18n/routing` (or the relevant `i18n` folder)? Never use `next/link` or `next/navigation`.
*   **File Length**: Does any modified file now exceed 300/500/1000 lines? If >500, recommend splitting. If >1000, demand splitting.

### 2. Architectural Integrity & Database
*   **Logic Placement**: Is database logic strictly in the configured database directory (e.g. `paths.db` or `src/lib/db`)? Are UI actions in the configured actions directory (e.g. `paths.actions` or `actions/`)?
*   **SQL Queries**: Are queries efficient? Use `connection.query` or `connection.execute` appropriately (e.g., `execute` for prepared statements without `LIMIT` dynamic binding issues).
*   **Redundancy**: Is this code duplicating functionality that already exists?

### 3. Correctness, Security, & Performance
*   **Types**: Is `any` used? (It must be avoided or explicitly disabled via eslint).
*   **Server Components**: Is `"use client"` used only when interactivity is required?
*   **Error Handling**: Are edge cases (null API responses, empty lists) handled gracefully?
*   **Memoization**: Are `useMemo` and `useCallback` used correctly for expensive operations?

---


## Phase 4: Finding Classification & Resolution Logic

Classify each identified issue by severity:
*   `🔴 Critical / High`: Security risks, breaking bugs, blatant `GEMINI.md` violations (e.g., **missing** JSDoc, direct SQL in UI, wrong i18n imports).
*   `🟡 Medium`: Style inconsistencies (e.g., wrong shadow/color), minor UI deviations, file length warnings (e.g., file > 500 lines).
*   `🟢 Low`: Suggestions for better readability, minor optimizations, **incomplete or poor** JSDoc.

**Review Decision Logic:**
*   If there is **≥ 1 High/Critical issue** ➔ `REQUEST_CHANGES`
*   If there are **≥ 2 Medium issues** ➔ `REQUEST_CHANGES`
*   If there is **1 Medium issue** or **only Low severity issues** ➔ `APPROVE` (but include the findings as inline review comments so the user can decide what to address).
*   **Re-Review Resolution**: If a previous review requested changes, verify if the previously identified critical/high issues were resolved. 
    *   If they are resolved and no *new* critical/high issues were introduced, change the status to `APPROVE` even if multiple `🟢 Low` or a single `🟡 Medium` issue remains from the previous iteration. We prioritize pragmatic progress on subsequent iterations.


---

## Phase 5: Submitting the Real Review

Do not just write a summary comment. You MUST use the `mcp_github_create_pull_request_review` tool to submit a formal GitHub Pull Request Review.

**CRITICAL MANDATE: Under no circumstances should you attempt to modify files, stage changes, commit, or push code during the review process. Your role is strictly analytical and advisory. Use inline review comments with ```suggestion``` blocks to propose fixes, but do not apply them yourself.**

1.  **Draft Inline Comments**: For every specific issue found, create an inline comment targeted at the exact file path and line number/position in the diff.
    *   Format your inline comment body clearly, stating the severity (e.g., `🔴 Critical:` or `🟡 Medium:`) and providing a ```suggestion``` block if possible.
2.  **Determine the Event**: Set the `event` parameter based on the Review Decision Logic (`APPROVE` or `REQUEST_CHANGES`).
3.  **Draft the Main Body**: Create a comprehensive summary for the `body` parameter. It should include:
    *   A high-level summary of the review.
    *   A bulleted list of the High/Critical/Medium issues found.
    *   A clear statement of the final decision and why it was made.
4.  **Execute**: Call `mcp_github_create_pull_request_review` with the `owner`, `repo`, `pull_number`, `body`, `event`, and the array of inline `comments`.
