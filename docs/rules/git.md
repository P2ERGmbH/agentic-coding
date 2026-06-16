# Git and GitHub Guidelines

## Branch Naming Convention
- **Always** name your branches using the pattern `feat/<issue-number>-by-cli-agent-<short-kebab-case-description>`.
- Example: `feat/824-by-cli-agent-add-condor-ndc`

## Concurrent Development Isolation (Git Worktree Mandate)
To allow concurrent development without disturbing the user's active workspace (uncommitted changes, unstaged edits, or local branch states), **all agent-initiated branch tasks MUST operate in an isolated git worktree**:
1. **Never switch branches or modify files in the main directory** if doing so would conflict with the user's active work.
2. **Create a Worktree**: Create an isolated worktree under a designated, git-ignored `/worktrees/` directory (rather than `.tmp/` to prevent worktree corruption during temporary file clears):
   ```bash
   git worktree add -b <new-branch-name> worktrees/<task-name> origin/main
   ```
3. **Execute in Worktree**: All subsequent file reads, writes, builds, and test commands MUST be run with their working directory (`Cwd`) pointed to the newly created worktree directory (e.g., `worktrees/<task-name>`).
4. **Cleanup Worktree**: Once changes are committed and pushed, safely clean up and unregister the worktree:
   - **Preferred Cleanup**:
     ```bash
     git worktree remove worktrees/<task-name>
     ```
   - **Pruning Fallback** (if files are manually deleted or worktree state is stale):
     ```bash
     git worktree prune
     ```
This ensures the primary repository directory remains completely untouched for the user, allowing parallel human and agent development without risking worktree directory purges.



## GitHub MCP Usage
- **Always** use the GitHub MCP tools (e.g., `create_issue`, `get_issue`, `add_issue_comment`, `create_pull_request`) wherever possible for interacting with GitHub.
- Using the `gh` command line tool might work as a fallback if the environment is configured correctly.
- To test the `gh` command line availability before using it, for instance by calling `gh --help` to see if the command can be executed.

## Complex Message Handling
- **Mandatory**: For pull request bodies, long issue comments, or any complex messages containing special characters (like backticks, quotes, or dollars), you MUST write the content to a `.md` file in the `.tmp/` directory first.
- **Usage**: When using the `gh` CLI, use the `--body-file` flag (e.g., `gh pr create --body-file .tmp/pr-body.md`) instead of passing the string via the `--body` flag. This prevents shell expansion issues and ensures the content is preserved exactly as intended.
- **Cleanup**: Delete the temporary file after the operation is successful.

## Commit Guidelines
A commit message should follow a specific structure to ensure clarity and traceability.

## Structure

```
#IssueNumber type(scope): subject
```

- **Issue Number**: If you are working on a specific issue, prefix the commit message with the issue number (e.g., `#123`). This is **mandatory** for all task-related commits.
- **Type**: The kind of work being done (e.g., `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`).
- **Scope**: What part of the application is affected (e.g., `core`, `ui`, `auth`, `settings`).
- **Subject**: A concise description of what will happen if this commit is applied.

## Semantic Meaning

The part after `type(scope):` should complete the sentence:
"If this commit is applied it will **[subject]**"

## Examples

- `#456 fix(ui): resolve import error for missing button variant`
- `#123 feat(auth): add password recovery email notification`
- `#789 refactor(auth): simplify login flow logic`
- `docs: update readme for deployment instructions` (Only for commits without a related issue)

## Pull Request Review Resolution

- **Always** reply to and resolve every review comment thread on GitHub after implementing the fix.
- **Mandatory**: To avoid shell expansion or quote-escaping errors (especially with markdown or quotes in replies), you **MUST** write the reply text to a temporary file (e.g., `.tmp/comment.md`) first, and then pass it via the typed parameter `@` prefix using `-F body=@.tmp/comment.md`.
- **Workflow**:
  1. Write the resolution explanation into a temporary markdown file, e.g., `.tmp/comment.md`.
  2. Post the reply using the file reference:
     ```bash
     gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<COMMENT_DATABASE_ID>/replies -F body=@.tmp/comment.md
     ```
  3. Mark the conversation thread as resolved on GitHub.
  4. Delete `.tmp/comment.md`.
- **Command References**:
  - To list unresolved threads and get their GraphQL IDs, use:
    ```bash
    mkdir -p .tmp && gh api graphql -f query='query($o:String!,$r:String!,$p:Int!){repository(owner:$o,name:$r){pullRequest(number:$p){reviewThreads(first:100){nodes{id,isResolved,comments(first:50){nodes{databaseId,body,author{login}}}}}}}}' -f o="<OWNER>" -f r="<REPO>" -F p=<PR_NUMBER> > .tmp/pr_threads.json
    ```
  - To reply to a comment thread (via file):
    ```bash
    gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<COMMENT_DATABASE_ID>/replies -F body=@.tmp/comment.md
    ```
  - To resolve the conversation thread:
    ```bash
    gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="<THREAD_GRAPHQL_ID>"
    ```

## Pre-Commit Quality Checklist (MANDATORY)

Before committing any files, you **MUST** run through this rigorous quality check:
1. **Compilation (`npm run compile`):** Verify that all code changes compile perfectly.
2. **Linting (`npm run lint`):** Ensure there are absolutely no linting errors.
3. **Comment/Reply Body Posting Safety:** Never pass comment bodies as plain text strings to `gh api` to avoid escaping or shell-expansion errors. Always write the payload to a `.tmp/` file first and use `-F body=@.tmp/file.md` to post.
4. **Header Validation:** Ensure all new shell scripts or source code files have a complete header describing their purpose, parameters, and usage.
5. **No Credential Exposure:** Never hardcode or pass passwords, API keys, or sensitive credentials within source code, configuration files, or dynamic shell execution commands. Always utilize environment variables and secret stores.


