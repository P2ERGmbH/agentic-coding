---
name: github-issue-solve
description: Resolve a GitHub issue locally, covering context setup, branching, planning, implementation, verification, and PR creation.
---
# GitHub Issue Workflow

This workflow guides you through resolving a GitHub issue locally. It is based on a robust, CLI-agnostic automation framework.

## Role & Persona
You are an expert software engineer and autonomous agent.

## Trigger
Use this workflow whenever the user asks to "handle," "solve," "resolve," or "work on" a GitHub issue.

---

## Phase 1: Context Setup & Identification

1.  **Identify Issue Number**: Check the current conversation and environment. 
    *   If the issue number is found (e.g., "#123"), proceed.
    *   If NOT found, **STOP** and ask the user: "Could you please provide the GitHub issue number you'd like me to work on?"
2.  **Fetch Details**: Once the issue number (referred to as `$ISSUE_NUMBER`) is known, run:
    ```bash
    gh issue view $ISSUE_NUMBER
    ```
3.  **Validate Requirements**: Analyze the issue description for a **CLEAR GOAL** and **SUCCESS CRITERIA**.
    *   **IF UNCLEAR**:
        1.  Comment on the issue: `gh issue comment $ISSUE_NUMBER --body "..."` asking for the missing Goal, Success Criteria, or Context.
        2.  Inform the user you are waiting for clarification and **STOP**.
    *   **IF CLEAR**: Proceed to Phase 2.
        1.  Assign yourself to the issue: `gh issue edit $ISSUE_NUMBER --add-assignee "@me"`.
        2.  Comment on the issue: `gh issue comment $ISSUE_NUMBER --body "..."` stating the start of work and what branch is being used.
4.  **Internalize rules**: read all docs/rules/*.md files and apply the rules defined there to the following steps
5.  **Figma Designs**: If the issue description contains a link to a Figma design, you MUST activate the `figma-implement` skill using `activate_skill` to get instructions on how to handle Figma to code conversion.

---

## Phase 2: Initialization & Branching

1.  **Sync with Main First**: Ensure you are starting from the latest state:
    *   `git checkout main`
    *   `git pull origin main`
2.  **Define Branch**: Target branch name is `feat/$ISSUE_NUMBER-by-cli-agent-<short-description>`. 
    *   Replace `<short-description>` with a brief, kebab-case summary of the issue (e.g., `feat/811-by-cli-agent-improve-x-and-y`).
3.  **Check/Switch Branch**:
    *   Check if it exists: `git branch --list "*$ISSUE_NUMBER*"`
    *   If it exists, checkout: `git checkout [matching-branch-name]`
    *   If NOT, create it from the updated main: `git checkout -b feat/$ISSUE_NUMBER-by-cli-agent-<short-description>`

---

## Phase 3: Planning & User Communication

1.  **Research**: Explore the codebase relevant to the issue.
2.  **Create Task Plan**: Generate a markdown plan file at `.tmp/tasks/issue-$ISSUE_NUMBER.md`. 
    *   Include a `## Costs` section at the end of the file.
3.  **External Update**: 
    *   Update the `## Costs` section in `.tmp/tasks/issue-$ISSUE_NUMBER.md` with the initialization cost (e.g., `- Initialization: $0.05`).
    *   Update/add a `**Total Costs**` field that sums up all costs in the section.
    *   Post a comment on the GitHub issue with:
         *   The branch name.
         *   The content of your task plan.
         *   The estimated token cost for the initialization phase and the total costs as recorded in the task file.
         *   Example: `gh issue comment $ISSUE_NUMBER --body "Plan initialized on branch feat/123-by-cli-agent-fix-login-bug... [Plan]... Estimated cost: $0.05 (Total: $0.05)"`

---

## Phase 4: Execution & Local Verification

For each atomic step in your plan:
1.  **Implement**: Make the necessary code changes.
    *   **Figma Designs**: If the issue involves implementing a Figma design and references downloaded Figma JSON files, use the `figma-implement` skill's script to parse the JSON. This script translates Figma styles into Tailwind CSS utility classes using the local Tailwind configuration and variables. Example usage: `node .agents/skills/figma-implement/scripts/parse-figma-vars.mjs .tmp/figma-xxxx.json`.
2.  **Verify**: Run tests and workspace standards to confirm the success of the specific change and ensure no regressions were introduced.
    *   Run `npm run lint -- --cache` and `npm run compile` (if applicable).
    *   Run existing tests before opening a pull request and if possible add vitest tests for new business logic.
    *   **Browser Check**: If UI is affected, you MUST always start or restart the dev server by running `npm run dev:up` (as a background process) before starting a local test. This ensures the cache is cleared, old builds are removed, and the latest local code is being served correctly. **Always use `http://localhost:6767` for local verification.** You MUST use the `chrome-devtools` MCP tools (e.g., `mcp_chrome-devtools_navigate_page`, `mcp_chrome-devtools_take_snapshot`) to actually open the affected page(s) and wait for the page to load, then take a snapshot to verify the component rendered correctly. Do NOT use `browser_eval` or any playwright-based tools from `next-devtools`.
    *   **Log Check**: ALWAYS check the application logs using `npm run log:view` *after* the browser test has concluded and *before* closing the browser tab/window. This is critical to identify implementation problems, server-side rendering errors, missing translations, hydration mismatches, or backend errors that might not be caught by linting or visual browser checks.
    *   **Iterative Fixing**: If the browser check fails (e.g. 500 error page) or if the `npm run log:view` output contains runtime errors, you MUST fix the code, restart the server if necessary, and repeat the Browser Check and Log Check until the page renders cleanly with no errors. Do not proceed to commit until the implementation is fully functional.
    *   **Browser Cleanup**: Once verification is complete, use `mcp_chrome-devtools_list_pages` and `mcp_chrome-devtools_close_page` to close your active session and prevent orphaned browser tabs.
3.  **Cleanup & Audit**: 
    *   **Review Changes**: Read all files that were added or modified in this step.
    *   **Strict Type Checking**: Scan the implemented/modified code for the introduction of any `any` types. You must NOT simply disable linter rules for `any`. Furthermore, if you encounter any rogue `any` types or generic `Record` assignments (e.g., `Record<string, any>`) that were used to avoid passing concrete type interfaces, you must try to replace them with specific interfaces. Start by inspecting the project configuration for `paths.types` (e.g., `src/types` or `types/`). Search that configured types folder for an applicable existing project type. If no suitable type exists, you MUST create a new, strongly-typed definition in the configured types directory and use it. Strong typing is mandatory. If lookup or paths fail multiple times, dynamically update the configuration with the correct types folder path.
    *   **Remove Helpers**: Identify and delete any helper files, temporary scripts, or debugging artifacts that were not intended to be part of the final Pull Request.
    *   **JSDoc Verification**: For all modified or new files, verify that every function and class has JSDoc documentation that meets the standards defined in `docs/rules/general.md`. If JSDoc is missing or incomplete, add it.
4.  **Commit**: 
    *   `git add .`
    *   `git commit -m "#IssueNumber type(scope): subject"` as defined in docs/rules/commit.md
5.  **Push**: 
    *   `git push` (Verify the push is successful).

---

## Phase 5: Finalization & Review

1.  **Sync before PR**: To avoid merge conflicts, fetch and merge the latest `main` branch:
    *   `git fetch origin`
    *   `git merge origin/main`
2.  **Test Execution**: Run all project tests using `npm run test` and fix any failures before starting the internal review.
3.  **Internal Code Review (Mandatory)**: Before creating a PR, you MUST ensure the code meets project rules (like adding JSDoc, correct types, etc.).
    *   Invoke the `generalist` subagent to perform the code review.
    *   Instruct the subagent to **first read the markdown files in the `docs/rules` directory** to get a firm grasp of the project rules.
    *   Instruct the subagent to act as a **senior software architect** and run an in-depth review using the `review-code` skill.
    *   If the review identifies any issues or missing project rules, fix them, commit, and push the fixes BEFORE proceeding to open the pull request.
3.  **Build**: run `npm run compile` to ensure the build is successful after the merge and any review fixes.
4.  **Create/Update Pull Request**:
    *   If creating new:
        ```bash
        gh pr create --title "feat: Resolve issue #$ISSUE_NUMBER" --body "Resolves #$ISSUE_NUMBER. [Summary of changes]"
        ```
    *   If the PR is already open and you are updating it with new commits, you MUST also merge `origin/main` as described in step 1 to ensure integration.
5.  **Final Report**:
    *   Update the `## Costs` section in `.tmp/tasks/issue-$ISSUE_NUMBER.md` with the final session costs (e.g., `- Finalization: $0.15`).
    *   Update the `**Total Costs**` field to reflect the sum of all costs.
    *   Comment on the issue stating the PR has been created with a link to the Pull Request.
    *   **Affected Pages**: Comment on the issue all affected pages with examples and how to test/verify if they still work or how to test the new implementation.
    *   **Click Path**: Include a click path for a test user to verify the changes. You MUST check the project configuration (`package.json` under `"agents"` key, or fallback `docs/project.json`) for `environments.prPreview`.
        *   If `environments.prPreview` is configured and not empty, use that template as the base URL, replacing the `[PR-SLOT]` placeholder with the actual pull request number (e.g., if `https://[PR-SLOT].your-domain.com/` is configured and the PR is `#12`, use `https://pr-12.your-domain.com/`).
        *   If `environments.prPreview` is NOT configured or is empty, fallback to the configured `environments.development` URL. If that is also not configured, use `environments.production`.
        *   **CRITICAL**: Never use local URLs (e.g., `http://localhost:6767` or any custom local ports) in the final report on the GitHub issue, as these are not accessible externally.
    *   Report the final session cost and the final total estimated cost as recorded in the task file.
6.  **Local Testing & Confirmation (MANDATORY)**: Before executing any final cleanup steps (like removing git worktrees or deleting temporary/log files), you **MUST** ask the user to test the changes locally and confirm that they are satisfied with the task completion.
7.  **Cleanup**: Once confirmed, verify all changes are pushed, any temporary worktrees are deleted, and the task file in `.tmp/tasks/` is updated to reflect completion.
8.  **View PR**: Open the pull request in the browser using `gh pr view --web`.
