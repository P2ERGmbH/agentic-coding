---
name: github-sub-issue-add
description: Add a sub-issue to an existing GitHub main issue using the GitHub API.
source: auto-skill
extracted_at: '2026-06-10T18:01:30.598Z'
---
# Add Sub-Issue to GitHub Main/Parent Issue

This skill allows creating a new sub-issue or linking an existing issue as a sub-issue to a parent/main issue using the official GitHub REST API (API version `2026-03-10`). It also supports establishing issue dependencies (blocking relationships).

---

## ⚠️ CRITICAL CONCEPT: GitHub Identifiers

To perform sub-issue or dependency operations, you MUST understand and handle the difference between GitHub's distinct identifier types:

1. **Issue Number** (e.g., `2396`):
   - A human-friendly sequential integer unique within a single repository.
   - Used in URLs, markdown references (`#2396`), and standard CLI commands (`gh issue view 2396`).
2. **GraphQL Global Node ID** (e.g., `"I_kwDOP0rKb88AAAABFCwpYA"`):
   - A globally unique string identifier.
   - **WARNING**: In the `gh` CLI, calling `gh issue view <number> --json id` or `gh issue list --json id` returns this string Node ID, NOT the numerical database ID!
3. **Numerical REST Database ID** (e.g., `4633405792`):
   - A globally unique numerical integer used by GitHub's relational database.
   - **CRITICAL**: The REST API endpoints for sub-issues and dependencies (under API version `2026-03-10`) **require** this numerical Database ID in their JSON payloads. Passing the sequential Issue Number or the string GraphQL Global Node ID will result in validation errors (typically `404 Not Found` or `422 Unprocessable Entity`).

---

## ⚡ RECOMMENDED METHOD: Foolproof Helper Script

To automate ID resolution, API calls, and handle fallbacks gracefully, always use the workspace helper script:

### Link Sub-Issue to Parent:
```bash
npx node .agents/skills/github-sub-issue-add/scripts/github-sub-issue-helper.js add --parent <parent-issue-number> --sub <sub-issue-number>
```

### Establish Issue Dependency (Blocking Relationship):
```bash
npx node .agents/skills/github-sub-issue-add/scripts/github-sub-issue-helper.js dependency --dependent <dependent-issue-number> --blocking <blocking-issue-number>
```

---

## 🛠️ MANUAL METHOD: Step-by-Step API Execution

If the helper script cannot be executed, follow these steps manually:

### Phase 1: Retrieve the Numerical REST Database ID
To get the correct numerical database ID of an issue (e.g., `#2390`), run:
```bash
gh api repos/{owner}/{repo}/issues/2390 --jq .id
```
*Note: The `{owner}` and `{repo}` placeholders inside curly braces are automatically replaced by the `gh` CLI with your active repository details.*

### Phase 2: Create and Link Sub-Issue

#### Scenario A: Create a New Sub-Issue and Link it
1. **Create the New Issue** and retrieve its sequential issue number:
   ```bash
   SUB_ISSUE_NUMBER=$(gh issue create \
     --title "[Agent] <Descriptive Sub-Issue Title>" \
     --body "Part of #<Parent-Issue-Number>\n\n## Task\n<Task description>" \
     --assignee "pm-username,dev-username" \
     --json number --jq .number)
   ```

2. **Retrieve the Numerical Database ID** of the new sub-issue:
   ```bash
   SUB_ISSUE_DB_ID=$(gh api repos/{owner}/{repo}/issues/$SUB_ISSUE_NUMBER --jq .id)
   ```

3. **Link as Sub-Issue to the Parent Issue**:
   Establish the native parent-child relationship:
   ```bash
   gh api \
     -H "Accept: application/vnd.github+json" \
     -H "X-GitHub-Api-Version: 2026-03-10" \
     --method POST \
     /repos/{owner}/{repo}/issues/<parent_issue_number>/sub_issues \
     -f sub_issue_id=$SUB_ISSUE_DB_ID
   ```
   *Note: Use `-f` (lowercase) so `gh api` correctly formats the payload as a JSON number.*

#### Scenario B: Link an Existing Issue as a Sub-Issue
```bash
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --method POST \
  /repos/{owner}/{repo}/issues/<parent_issue_number>/sub_issues \
  -f sub_issue_id=<sub_issue_database_id>
```

---

## Phase 3: Manage Issue Dependencies (Blocking / Blocked By)

If a task is blocked by another task, establish the blocking relationship:

```bash
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --method POST \
  /repos/{owner}/{repo}/issues/<dependent_issue_number>/dependencies/blocked_by \
  -f issue_id=<blocking_issue_database_id>
```

---

## Phase 4: Robust Fallback Strategy

If the native REST API calls fail (due to outdated CLI, restricted API access, or missing repo features):

1. **Checkbox Linkage in Parent Issue description**:
   Read the parent issue description and append the child issue under an implementation progress checklist:
   ```markdown
   ## Implementation Progress
   - [ ] #<sub_issue_number>
   ```
   Edit the description via:
   ```bash
   gh issue edit <parent_issue_number> --body "<Updated-Body>"
   ```

2. **Reference Comments**:
   Comment on the parent and sub-issues to guarantee audit traceability:
   ```bash
   gh issue comment <parent_issue_number> --body "Sub-task linked (fallback): #<sub_issue_number>"
   gh issue comment <sub_issue_number> --body "Part of parent issue #<parent_issue_number>"
   ```

3. **Dependency Fallback Comments**:
   If dependency mapping fails, post comments on both issues:
   ```bash
   gh issue comment <dependent_issue_number> --body "⚠️ **Blocked By:** #<blocking_issue_number>"
   gh issue comment <blocking_issue_number> --body "🔗 **Blocks:** #<dependent_issue_number>"
   ```

---

## Phase 5: Verification

Verify that relationships and dependencies are updated:
```bash
gh issue view <parent_issue_number> --json sub_issues_summary,issue_dependencies_summary
```
