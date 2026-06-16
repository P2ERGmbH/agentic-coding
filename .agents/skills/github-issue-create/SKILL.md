---
name: github-issue-create
description: Create a detailed GitHub issue using the mandatory template for new features or complex changes.
---
# Create Agent Task Workflow

This workflow guides you through creating a detailed GitHub issue using the `gemini_agent_workflow.md` template. This is the mandatory first step when a user requests a new feature or complex change.

## Trigger
Use this workflow when the user asks to "create a task," "plan a feature," "spec out a ticket," or "create a workflow issue."

---

## Phase 1: Deep Research & Analysis (Using Subagent)

1.  **Analyze User Request**: Identify the core goal and any implicit requirements.
2.  **Delegate to Subagent**: ALWAYS use the `codebase_investigator` subagent to perform the deep research. Pass it the user's objective and ask it to:
    *   Walk through the feature as a user and define the **Browser Click Path** (relevant routes, exact steps).
    *   Investigate Schema & Database: Check project configuration (`package.json` under `"agents"` key, or `docs/project.json`) for `paths.db` and `paths.types`. If configured, use those paths to search for database/migration files and types/data models. If not configured, dynamically search for directories named `db`, `prisma`, `database`, or `types` using codebase search tools.
    *   Identify all relevant files (Page components, API routes, Service logic) that need modification to ensure complete coverage.
3.  **Review Subagent Report**: Use the structured report provided by the `codebase_investigator` to inform the implementation plan.

---

## Phase 2: Formulate & Refine Implementation Plan (Subagent-Driven)

Before creating any issue on GitHub, the implementation plan must be drafted, scrutinized by a subagent, and interactively approved by the user.

1.  **Draft Initial Plan**:
    *   Synthesize the research and draft an initial implementation plan.
    *   Break down the work into logical, atomic steps with precise reasons for each step.
    *   Fill out all template fields (Proposed Changes, Testing Strategy, Browser Click Path, i18n/translations, Performance/Edge cases).

2.  **Subagent Grilling & Refinement**:
    *   **Mandatory**: ALWAYS delegate the initial plan to a specialized `general-purpose` subagent to grill it.
    *   Instruct the subagent to locate potential architectural flaws, edge cases, missing translations, verification gaps, and project-rule violations (`docs/rules/`).
    *   The subagent **MUST** perform all plan refinements, producing a highly secure, detailed, and polished version of the plan.

3.  **Present Refined Plan and In-Depth Reasoning to User**:
    *   Print the refined plan to the user in the CLI.
    *   Provide explicit, in-depth explanations for the design decisions and why certain edge-case protections were introduced by the subagent.

4.  **Interactive User Feedback & Refinement Loop**:
    *   Use the `ask_user_question` tool to ask the user if they agree with the plan, need more explanation, or want to request changes.
    *   If the user requests changes or asks questions:
        - Delegate the feedback back to the `general-purpose` subagent to refine the plan accordingly.
        - Present the updated plan and reasoning back to the user and prompt again.
    *   Only proceed to Phase 3 when the user has explicitly approved the plan via the interactive question interface.

---

## Phase 3: Create the GitHub Issue

1.  **Construct Content**: Map your approved research and plan to the sections in `.github/ISSUE_TEMPLATE/gemini_agent_workflow.md`.
2.  **Execute Issue Creation**:
    ```bash
    gh issue create \
      --title "[Agent] <Descriptive Title>" \
      --body "[Full Markdown Body Constructed from Research and Approved Plan]"
    ```
    *Ensure the body follows the template structure exactly. Do NOT include the user's original instructions or communications in this body.*
3.  **Capture Original Context**: Create a separate markdown file containing the user's initial prompt and any related communication/requirements.
4.  **Post Context as Comment**: Add the captured context as a comment to the newly created issue:
    ```bash
    gh issue comment <issue-number> --body-file <path-to-context-file>
    ```

---

## Phase 4: Branching & Asset Management

1.  **Create Branch**: Create a new branch for the issue using the standard naming convention: `feat/<issue-number>-by-cli-agent-<short-kebab-case-description>`.
    ```bash
    git checkout main
    git pull origin main
    git checkout -b feat/<issue-number>-by-cli-agent-<short-kebab-case-description>
    ```
2.  **Manage Assets**: If there are any provided files (e.g., in `.tmp/`), move them to a dedicated issue asset folder:
    ```bash
    mkdir -p .github/assets/issue-<issue-number>
    mv .tmp/* .github/assets/issue-<issue-number>/
    ```
3.  **Commit Assets**: Add and commit the assets to the new branch:
    ```bash
    git add .github/assets/issue-<issue-number>/
    git commit -m "docs: add issue assets for #<issue-number>"
    git push -u origin feat/<issue-number>-by-cli-agent-<short-kebab-case-description>
    ```

---

## Phase 5: Confirmation & Display

1.  **Verify**: Confirm the issue was created and provide the link to the user.
2.  **Double Check**: Ensure all required information is included in the issue description. if the currently used model name includes "flash" then verify 2 more times that the goal of the issue is fully described in the github issue. Enhance the issue description if necessary.
3.  **Technical & Edge Case Refinement**: Improve the issue's technical depth by explicitly defining edge cases, error handling UI/logic, state management updates, translations/i18n needs, and performance considerations. Ensure the plan strictly adheres to `docs/rules` (e.g., placing DB logic in the configured database directory `paths.db`, and placing Server Actions in `paths.actions` or their corresponding configured paths).
4.  **Actionability & Testing Refinement**: Improve the issue's actionability by breaking down any large, ambiguous steps into small, atomic tasks. Add precise, binary (pass/fail) Acceptance Criteria and verify that the Testing Strategy explicitly covers both unit tests (e.g., Vitest) and manual UI verification steps.
5.  **Display Issue Body**: You **MUST** output the full Markdown body of the created (or updated) issue in your final response to the user. This ensures the user can read exactly what was planned directly in the terminal, allowing them to easily identify and resolve any misunderstood goals.
6.  **Next Steps**: Ask the user to review the displayed issue body and if they would like you to start working on the issue immediately (switching to the `github-issue-solve` workflow).
7.  **STOP** do not start implementing the issue.
