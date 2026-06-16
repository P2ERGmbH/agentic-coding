# Commit Guidelines

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
