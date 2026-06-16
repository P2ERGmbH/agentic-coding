---
name: resolve-review
description: Resolve review findings from local code reviews or remote Pull Request comments sequentially, ensuring comprehensive resolution through root-cause analysis and local pre-review inside an isolated Git Worktree.
---
# Resolve Review Workflow

This workflow guides you through resolving review findings (either local reviews or remote Pull Request comments) inside an isolated Git Worktree using an efficient orchestrator-worker pattern. It keeps the main conversation context clean and focused on user-approved planning, while delegating heavy file-parsing and code-modification tasks to specialized subagents.

## Trigger
Use this workflow whenever the user asks to "resolve review", "fix review comments", or "address feedback" from a code review.

> [!IMPORTANT]
> **Fresh Fetch Mandate (MANDATORY)**: When this skill is invoked, the agent **MUST ALWAYS** fetch/refresh the review comments directly from the live GitHub API as the very first action. Under no circumstances may the agent reuse old, cached, or existing threads or analysis files. A fresh unique query file (e.g. `.tmp/pr_threads_<PR_NUMBER>_<TIMESTAMP>.json`) must be created, and a fresh query must be executed. Relying on cached comment data is strictly prohibited.

---

## 🤖 Orchestration & Delegation Mandate
The primary agent **MUST** act as the orchestrator of the review resolution workflow. To prevent context clutter and manage token usage, the orchestrator:
1.  **Orchestrates**: Handles user approval, high-level task planning, git worktree setup, and final GitHub PR interactions (posting comments and resolving threads).
2.  **Delegates**: Spawns specialized subagents for token-heavy phases (gathering/analyzing findings and implementing specific code fixes), keeping the main chat clear of raw compiler output, lint logs, and long JSON payloads.

---

## 🌳 Isolated Git Worktree Mandate
To prevent conflicts with ongoing local work and avoid workspace pollution, the agent **MUST** operate within an isolated Git Worktree:
1.  **Create Git Worktree**:
    Create an isolated worktree under a designated, git-ignored `/worktrees/pr-<PR_NUMBER>` directory.
    - **If the branch already exists** (e.g., the PR's feature branch): checkout the existing branch directly:
      ```bash
      git worktree add worktrees/pr-<PR_NUMBER> <existing_branch_name>
      ```
    - **If creating a new branch**: use the `-b` flag:
      ```bash
      git worktree add -b <new_branch_name> worktrees/pr-<PR_NUMBER> origin/main
      ```
    - **IMPORTANT**: Always use the **existing PR branch** when resolving review comments. Do NOT create a new `fix/` branch.
2.  **Environment Setup**:
    *   Copy the `.env` file from the root project directory to the worktree directory: `cp .env worktrees/pr-<PR_NUMBER>/.env`.
    *   Symlink the `node_modules` directory from the root project directory to the worktree directory to avoid duplicate installation overhead:
        ```bash
        ln -s ../../node_modules worktrees/pr-<PR_NUMBER>/node_modules
        ```
3.  **Scoped Operations**:
    All subsequent terminal commands, local testing, code modifications, linting, compiling, and git pushes **MUST** be executed inside the worktree directory.

---

## 🧭 Step-by-Step Resolution Process

### Phase 1: Gathering Findings & Analysis (Delegated to Review Analyst Subagent)

1.  **Launch Analyst**:
    Spawn a specialized `Review Analyst` subagent to parse the PR findings in the background.
2.  **Scrape Comments & Code (Fresh Fetch)**:
    The subagent **MUST** run the GraphQL query to extract unresolved threads directly from GitHub API and save them to a uniquely named file `.tmp/pr_threads_<PR_NUMBER>_<TIMESTAMP>.json`:
    ```bash
    mkdir -p .tmp && gh api graphql -f query='query($o:String!,$r:String!,$p:Int!){repository(owner:$o,name:$r){pullRequest(number:$p){reviewThreads(first:100){nodes{id,isResolved,comments(first:50){nodes{databaseId,body,author{login}}}}}}}}' -f o="<OWNER>" -f r="<REPO>" -F p=<PR_NUMBER> > .tmp/pr_threads_<PR_NUMBER>_\$(date +%s).json
    ```
    The subagent reads the referenced files around the reported line numbers, maps their imports, and investigates the root cause of each finding.
3.  **Produce Technical Analysis**:
    The subagent compiles its findings into a highly structured markdown report at `.tmp/review_analysis.md` summarizing:
    *   **The Finding**: Thread ID, author comment, file path, and lines.
    *   **The Technical Problem**: Detailed root-cause analysis.
    *   **The Recommended Fix**: Specific changes or type declarations to implement.

---

### Phase 2: Planning & User Approval (Main Agent / Orchestrator)

1.  **Initialize Task Plan (`task.md`)**:
    *   **MANDATORY**: Create both the local `task.md` in the workspace root and the artifact at `<appDataDir>/brain/<conversation-id>/task.md`.
    *   **Essential Checklists**: For *each* review finding or comment thread, you MUST define a dedicated 5-step checklist so that no critical operation is skipped.
    *   **Required Format**:
        ```markdown
        # Phase 2: Fix Issues & Refactor

        - [ ] Thread <DATABASE_ID> / <GRAPHQL_ID> (by <AUTHOR>): <BRIEF_DESCRIPTION> in `<FILE_PATH>`
          - [ ] Implement code fix in worktree
          - [ ] Compile check & lint locally inside worktree
          - [ ] Commit fix & push
          - [ ] Post reply to comment on GitHub
          - [ ] Resolve thread via GitHub API

        # Phase 3: Post-Fix Validation & Hyper-Intense Local Review
        - [ ] Run hyper-intense local code review (`review-code` skill) on the worktree to ensure zero new regressions
          - [ ] Run TypeScript compiler check (`npm run check`)
          - [ ] Run project linter (`npm run lint -- --cache`)
          - [ ] Fix any new findings or secondary bugs identified (re-run review if edits are made)
        ```
        This detailed structure guarantees that every thread receives a dedicated code modification, verification, commit, reply, and explicit resolution. No thread or step can be marked as complete until all 5 checkboxes are checked.

2.  **Generate Polished Plan**:
    Read `.tmp/review_analysis.md` and generate the concise, user-friendly task plan using the required 5-step format.
3.  **Obtain Explicit User Approval**:
    *   **MANDATORY (Plan Printing Mandate)**: You MUST print the complete task plan / implementation plan in the chat interface to the user. Do not hide or summarize it.
    *   **MANDATORY (Ask Question Approval)**: You MUST request approval for this plan by invoking the `ask_question` tool, presenting the user with an interactive modal to approve or request adjustments to the task plan.
    *   Wait for the user's explicit approval before proceeding to any code modifications.
4.  **Post Plan to PR**:
    Post the "Phase 2: Fix Issues & Refactor" part of the approved task plan along with the associated technical reasoning/root-cause analysis as a PR comment with hidden HTML comment marker `<!-- CI_REVIEW_RESOLVE_TASK_PLAN -->` at the top of the comment. This clearly informs human reviewers about the agent's intent and reasoning.
    *   **Mandatory Helper Script**: To avoid shell expansion, escaping, or syntax errors, do NOT use inline echo with `sed` or `grep`. Instead, execute this inline Node.js script using `npx node -e` to programmatically extract and write both the technical analysis and the Phase 2 section safely:
        ```bash
        npx node -e "
        const fs = require('fs');
        const analysis = fs.existsSync('.tmp/review_analysis.md') ? fs.readFileSync('.tmp/review_analysis.md', 'utf8') : '';
        const content = fs.readFileSync('task.md', 'utf8');
        const lines = content.split('\n');
        let inside = false;
        const result = ['<!-- CI_REVIEW_RESOLVE_TASK_PLAN -->', ''];
        if (analysis) {
          result.push('# 🎯 Root-Cause Analysis & Technical Reasoning', '', analysis, '');
        }
        result.push('# 📋 Planned Fixes & Refactoring', '');
        for (const line of lines) {
          if (line.includes('Phase 2: Fix Issues & Refactor')) { inside = true; continue; }
          if (line.includes('Phase 3')) { inside = false; }
          if (inside) { result.push(line); }
        }
        fs.mkdirSync('.tmp', { recursive: true });
        fs.writeFileSync('.tmp/initial_comment.md', result.join('\n').trim() + '\n');
        "
        ```
    *   Post the comment to GitHub using:
        ```bash
        gh pr comment <PR_NUMBER> --body-file .tmp/initial_comment.md
        rm .tmp/initial_comment.md
        ```

---

### Phase 3: Targeted Fixes & Local Verification (Delegated to Worker Subagents)

For **each** approved finding in the task plan, perform the following:

1.  **Launch Developer Worker**:
    Spawn a short-lived worker subagent to implement the specific fix inside the worktree directory.
2.  **Implement Fix**:
    The worker subagent applies the changes surgically. Code must follow strict types, robust error handling, and JSDoc standards.
3.  **Verify & Commit**:
    The worker runs compile check (`npm run compile`) and linting (`npm run lint -- --cache`) inside the worktree directory.
    Upon pristine validation, the worker creates a dedicated commit matching the commit rules: `#<ISSUE_NUMBER> fix(<scope>): <message>` and pushes it to remote.
    The worker returns a clean, concise diff and verification summary to the orchestrator.
4.  **Update Progress**:
    Mark the corresponding `Implement code fix`, `Compile check & lint`, and `Commit fix & push` sub-tasks as completed (`[x]`) in `task.md` (both locally and in the artifact).

---

### Phase 4: Reply, Resolve & Final Update (Main Agent / Orchestrator)

For **each** resolved comment thread, the orchestrator MUST execute the following reply and resolution steps without skipping them:

1.  **Reply & Resolve Conversation Thread**:
    For each resolved finding, the orchestrator posts the reply to the comment thread on GitHub (referencing the commit) and resolves the conversation thread:
    ```bash
    # Post reply (via file)
    gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<COMMENT_DATABASE_ID>/replies -F body=@.tmp/comment_<COMMENT_DATABASE_ID>_$(date +%s).md
    # Resolve thread
    gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="<THREAD_GRAPHQL_ID>"
    ```
2.  **Mark Tasks Completed**:
    Mark the corresponding `Post reply to comment` and `Resolve thread via GitHub API` sub-tasks as completed (`[x]`) in `task.md`.
3.  **Local Pre-Review & Regression Mitigation**:
    *   After all comment threads have been fixed, committed, and pushed, you **MUST** execute a hyper-intense local code review (`review-code` skill) inside an isolated subagent context on the worktree.
    *   This is a critical quality gate. Double check if any of the implemented fixes introduced new bugs, type safety gaps, unhandled nulls, React state updates issues, missing JSDocs/examples, or other regressions that could fail subsequent reviews.
    *   If any new issues (Critical, High, or Medium) are discovered, they **MUST** be immediately fixed, verified, committed, and pushed. Repeat this local review cycle until the codebase is 100% clean and compliant.
4.  **Post Resolution Summary**:
    Post a detailed "Resolution Summary" comment on the PR detailing all fixes and commit references.
5.  **Update Task Plan Comment**:
    Retrieve the initial task plan comment ID:
    ```bash
    gh api repos/<OWNER>/<REPO>/issues/<PR_NUMBER>/comments --paginate -q '.[] | select(.body | contains("<!-- CI_REVIEW_RESOLVE_TASK_PLAN -->")) | .id' > .tmp/task_comment_id_$(date +%s).txt
    ```
    Update the PR comment to show the completed/fully checked-off "Phase 2: Fix Issues & Refactor" task plan:
    *   **Mandatory Helper Script**: Run this inline Node.js script using `npx node -e` to programmatically extract and write the updated Phase 2 section safely:
        ```bash
        npx node -e "
        const fs = require('fs');
        const analysis = fs.existsSync('.tmp/review_analysis.md') ? fs.readFileSync('.tmp/review_analysis.md', 'utf8') : '';
        const content = fs.readFileSync('task.md', 'utf8');
        const lines = content.split('\n');
        let inside = false;
        const result = ['<!-- CI_REVIEW_RESOLVE_TASK_PLAN -->', ''];
        if (analysis) {
          result.push('# 🎯 Root-Cause Analysis & Technical Reasoning', '', analysis, '');
        }
        result.push('# 📋 Completed Planned Fixes & Refactoring', '');
        for (const line of lines) {
          if (line.includes('Phase 2: Fix Issues & Refactor')) { inside = true; continue; }
          if (line.includes('Phase 3')) { inside = false; }
          if (inside) { result.push(line); }
        }
        fs.mkdirSync('.tmp', { recursive: true });
        fs.writeFileSync('.tmp/updated_comment_' + process.argv[1] + '.md', result.join('\n').trim() + '\n');
        " "$(date +%s)"
        ```
    *   Perform the patch and clean up:
        ```bash
        COMMENT_ID=$(cat .tmp/task_comment_id_*.txt | head -n 1)
        gh api -X PATCH repos/<OWNER>/<REPO>/issues/comments/$COMMENT_ID -F body=@.tmp/updated_comment_*.md
        rm -rf .tmp/task_comment_id_*.txt .tmp/updated_comment_*.md
        ```

---

### Phase 5: Cleanup & Completion (Main Agent / Orchestrator)

1.  **Worktree Removal**:
    Remove the isolated worktree safely from the root directory:
    ```bash
    git worktree remove worktrees/pr-<PR_NUMBER>
    ```
2.  **Report Progress**:
    Present the clean, high-level resolution summary to the user.
