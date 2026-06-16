---
name: github-issue-complete
description: End-to-end automation for the full GitHub issue lifecycle. Use this when the user provides a feature request or bug report and wants to go from zero to a reviewed and refined Pull Request in one autonomous process.
---
# GitHub Issue Complete Workflow (Full Auto)

This skill provides a "one-stop shop" for the entire software development lifecycle on GitHub. It implements a dual-issue strategy: a **Main Issue** (human-facing) for project management and a **Sub-Issue** (agent-facing) for implementation.

## 📋 Mandatory Task List (task.md)

At the very beginning of Phase 1, the agent **MUST** initialize and maintain a local `task.md` file in the workspace containing all steps of the workflow. The agent must update the progress (`[ ]` to `[/]` to `[x]`) continuously and print the updated plan explicitly to the user.

### Mandatory `task.md` Template:
```markdown
- [ ] Phase 1: Initialization & Strategy
  - [ ] Determine/Fetch Main Issue
  - [ ] Create/Prepare Human-Facing Main Issue with assignments (read from `package.json` `"agents"` block or fallback `docs/project.json` stakeholders)
  - [ ] Create Agent Issue (Sub-Issue, title prefix `[Agent]`) and link natively via helper script or fallback
  - [ ] Link Agent Issue inside Main Issue checklist
- [ ] Phase 2: Implementation & Validation
  - [ ] Set up Git Worktree and copy `.env` configuration
  - [ ] Implement features and refactorings
  - [ ] Perform Code Verification (Unit tests, TypeScript compile check, ESLint verification)
  - [ ] Perform Local Code Review (utilizing `review-code` skill inside a generalist subagent)
  - [ ] Create Pull Request (Title: `feat: ...`, body resolves Agent Issue, references Main Issue)
- [ ] Phase 3: Quality Gate & Review
  - [ ] Trigger remote PR review via `review-pull-request` skill
  - [ ] Resolve any review findings via `resolve-review` skill
- [ ] Phase 4: Finalization & Handover
  - [ ] Update Main Issue checklist to complete
  - [ ] Add `test` label to Main Issue
  - [ ] Post Browser Click Path and testing instructions comments on Main Issue
  - [ ] Ask user to test locally and confirm task completion BEFORE running cleanup
  - [ ] Run `npm run log:clear` to clean temporary log files
  - [ ] Present final summary with links to Main Issue, Agent Issue, and Pull Request
```

---

## Phase 1: Initialization & Strategy

1.  **Analyze User Input**: Extract the core objective, any constraints, and relevant context.
2.  **Initialize Task List**: Create `task.md` with the template above and print the plan to the user.
3.  **Determine Main Issue**:
    *   Ask the user: "Should I create a new Main Issue for this request, or use an existing one as a reference?"
    *   **YOLO Mode / No Response**: If the user is in YOLO mode or provides no specific issue, default to creating a **new** Main Issue.
    *   If using an existing issue, fetch its details: `gh issue view <issue-number>`.

4.  **Create/Prepare Main Issue (Human-Facing)**:
    *   **Goal**: This issue tracks the high-level requirement and is used by project managers and testers.
    *   **Content**: Must include the user's initial prompt and all relevant information passed to the agent.
    *   **Assignment**: Assign the Product Manager and Senior Developer usernames retrieved from `package.json` `"agents"` block or fallback `docs/project.json` stakeholders (e.g. `productManager` and `seniorDeveloper`). If neither is present, default to `@me`.
    *   **Sub-Task Checklist**: Add a section `## Implementation Progress` with a checkbox for the sub-issue: `- [ ] Agent Issue #<TBD>: [Short Description]`.
    *   **Action**:
        - If new: `gh issue create --title "[Feature/Bug] <Title>" --body "<Content>" --assignee "pm-username,dev-username"`
        - If existing: Update the body to include the new requirement and the checklist.

5.  **Create and Link Agent Issue (Sub-Issue)**:
    *   **Goal**: This is the technical implementation ticket for the agent, natively linked as a GitHub sub-issue.
    *   **Action**:
        - Activate the `github-issue-create` skill to construct and create the implementation issue (Prefix: `[Agent]`).
        - Extract the created sub-issue's sequential issue number (e.g., `#<Sub-Issue-Number>`).
        - Natively link the sub-issue to the Main Issue using the **foolproof helper script** (which resolves the database ID and handles markdown fallbacks automatically):
          ```bash
          npx node .agents/skills/github-sub-issue-add/scripts/github-sub-issue-helper.js add --parent <Main-Issue-Number> --sub <Sub-Issue-Number>
          ```
        - Activate the `github-issue-refine` skill on the sub-issue to ensure it's implementation-ready.
        - Update the Main Issue: Replace `#<TBD>` in the Main Issue's checklist with the actual Agent Issue number.

---

## Phase 2: Implementation & Validation

1.  **Solve the Agent Issue**: Activate the `github-issue-solve` skill.
    *   **CRITICAL**: Pass the **Agent Issue Number** to `github-issue-solve`.
    *   Follow its workflow for implementation, testing (Vitest, Browser + Logs), and internal review.
2.  **Perform Local Code Review (CRITICAL)**: Activate the `review-code` skill.
    *   You MUST run the `review-code` skill inside a generalist/research subagent to evaluate local changes objectively.
    *   Meticulously check for compliance with `AGENTS.md`, `docs/rules/`, and look out for critical bugs or code quality issues.
    *   Any `🔴 Critical` or `🟠 High` findings must be resolved before proceeding.
3.  **Create Pull Request**: The PR should be created as part of the `github-issue-solve` workflow.
    *   Ensure the PR body says `Resolves #<Agent-Issue-Number>` and `Part of #<Main-Issue-Number>`.

---

## Phase 3: Quality Gate & Review

1.  **PR Review**: Activate the `review-pull-request` skill to review the remote PR.
2.  **Resolution**: Activate `resolve-review` if changes are requested.

---

## Phase 4: Finalization & Handover

1.  **Update Main Issue**:
    *   **Label**: Add the `test` label to the Main Issue.
    *   **Click Path**: Post a comment on the **Main Issue** with the **Browser Click Path** for testing (using the PR deployment URL).
    *   **Checklist**: Update the checklist in the Main Issue body to mark the sub-issue as complete: `- [x] Agent Issue #<Agent-Issue-Number>`.
2.  **Request Local Testing & Confirmation (MANDATORY)**:
    *   Stop executing automated steps.
    *   Explicitly present your final implementation details, screenshots/click-paths, and the URL/port of your local running instance.
    *   Ask the user to test the changes locally in their browser.
    *   Seek explicit, written user confirmation that the task is fully complete and that you are authorized to run cleanup.
3.  **Cleanup (Only after confirmation)**:
    *   Remove any isolated git worktrees if applicable.
    *   Run `npm run log:clear` to clean temporary log files.
4.  **Final Summary**:
    *   Inform the user that the sub-issue is complete and the Main Issue is ready for testing.
    *   Provide links to the Main Issue, Agent Issue, and Pull Request.
