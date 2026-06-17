---
name: github-issue-test
description: Standardize the verification of implemented GitHub issues on the development environment.
---
# GitHub Issue Verification Workflow

This workflow guides you through standardizing the verification of implemented GitHub issues on the development environment.

## Role & Persona
You are an expert software engineer and autonomous agent.

## Trigger
Use this workflow whenever the user asks to "run the github-issue-test workflow," "verify issue #<number>," or "test if issue #<number> is resolved."

---

## Phase 1: Issue Analysis and State Detection

1.  **Fetch Issue Details**:
    *   Use the `get_issue` tool to fetch the details of the target issue (referred to as `$ISSUE_NUMBER`).
2.  **Verify Implementation State**:
    *   Use `search_issues` with a query like `repo:your-org/your-repo is:pr $ISSUE_NUMBER` to find associated Pull Requests.
    *   Verify that at least one linked Pull Request has been **merged**.
    *   If no merged PR is found, notify the user that the issue might not be deployed yet and ask if you should proceed.
3.  **Extract the Test Case**:
    *   Identify the "Browser Click Path" or "Acceptance Criteria" from the issue description.
    *   If no click path is explicitly defined, infer one based on the implemented features.
4.  **Environment Detection**:
    *   If the resolving PR is **merged**, verify on the development environment: `https://dev.your-domain.com`.
    *   If the PR is **NOT merged**, run the test on the local development server: `http://localhost:6767`.

---

## Phase 2: Test Plan Preparation

1.  **Translate Paths**:
    *   All relative paths and localhost URLs must be translated to the correct environment base: `https://dev.your-domain.com/` or `http://localhost:6767/`.
    *   **Crucial**: Ensure you explicitly use the `/de/` locale (or the required locale) in the URL to maintain environment parity (e.g., `https://dev.your-domain.com/de/dashboard`).
    *   **Redirect Strategy**: Instead of manual click-through, you can append the `?to=` parameter on the login page to navigate directly to the target page after authentication (e.g., `https://dev.your-domain.com/de/login?to=provider/item-1/settings`). Make sure the `to` parameter does NOT include the locale prefix.
2.  **Retrieve Test Credentials**:
    *   Read the centralized verification file at **`docs/test/smoke-test.md`** to locate the correct test account for your scenario.
    *   The default Chrome DevTools credential is `test@your-domain.com` with the common password documented in that file.

---

## Phase 3: Automated Browser Execution

### Scenario A: `chrome-devtools` MCP Available
*If the `chrome-devtools` MCP is available, perform automated verification:*
**IMPORTANT**: You MUST use the `chrome-devtools` MCP tools (like `mcp_chrome-devtools_navigate_page`, `mcp_chrome-devtools_take_snapshot`, etc.) for testing the click path. Do NOT use `browser_eval` or any playwright-based tools from `next-devtools` to avoid browser instance conflicts.

1.  **Initialize Browser**:
    *   Use `navigate_page` or `new_page` to go to the constructed Login URL.
2.  **Authentication (Fast Method)**:
    *   Because Next.js/React inputs often ignore standard value assignments, use `evaluate_script` to inject a robust login script that bypasses React's native setter override. This also saves conversational turns compared to the Snapshot/Fill method.
    *   **Recommended Script**:
      ```javascript
      () => {
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const loginButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Anmelden'));
        if (emailInput && passwordInput && loginButton) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(emailInput, 'test@your-domain.com');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          nativeSetter.call(passwordInput, 'PASSWORD_FROM_CREDENTIALS_FILE');
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          loginButton.click();
          return "Credentials filled and login button clicked.";
        }
        return "Form fields not found.";
      }
      ```
      *Note: Refer to [`docs/test/smoke-test.md`](../../../docs/test/smoke-test.md) for the actual credentials and verify parameters.*
3.  **Authentication (Standard Method)**:
    *   Alternatively, call `take_snapshot` right after navigation to get the current accessibility tree.
    *   Find the unique `uid` for the required inputs and buttons from the snapshot text.
    *   Perform the login using the `fill` (with Email/Password `uid`) and `click` (with Login Button `uid`) tools.
4.  **Execute Click Path**:
    *   If you did not use the redirect strategy, follow the "Browser Click Path" step-by-step using tools like `click`, `fill`, `hover`, and `wait_for`. Always take a new snapshot after navigation to get fresh `uid`s.
    *   Take snapshots (using `take_snapshot`) at key verification points to document the UI state.
5.  **Verify State**:
    *   Confirm that the acceptance criteria are met (e.g., a specific message appears, a table shows new data, or a button is active).

### Scenario B: `chrome-devtools` MCP Unavailable
*If `chrome-devtools` is NOT available:*

1.  **Manual Verification Instructions**: Provide the user with the exact click path on the target environment and the test credentials so they can verify it manually.
2.  **Code Verification**: Perform a final review of the merged code changes to ensure logical correctness.

### Scenario C: Token-Efficient Batch Execution (Chrome DevTools CLI)
*If the click path is exceedingly long, highly repetitive, or step-by-step MCP tools hit token limits/timeouts:*

1.  **Persist Actions via CLI**: Switch from individual step-by-step MCP tools to the native Chrome DevTools CLI. Instruct the DevTools CLI to persist the required browser actions into a batch script.
2.  **Execute the Batch Sequence**: Run the generated sequence via the terminal (e.g., using `npx chrome-devtools-mcp`). This executes the entire multi-step browser flow (navigation, authentication, and validation) programmatically in one go.
3.  **Capture Output**: Output the test results, success metrics, and any caught errors directly to the console for a token-efficient, single-turn verification.

---

## Phase 4: Reporting and Closure

1.  **Document Test Results**:
    *   Construct a detailed summary of the verification process.
    *   Use `add_issue_comment` to post the report on the GitHub issue.
    *   The report must include:
        *   The resolving PR number.
        *   The executed click path (even if you used a direct link or dashboard redirect, document the path you verified).
        *   The results of each verification step (including any snapshots taken).
        *   Confirmation of success or details of any failures.
        *   **Missing Translations**: List any missing translations found during the test (e.g., `MISSING_MESSAGE: Could not resolve ...`). If you are on the local branch for the tested issue, recommend implementing them.
2.  **Close the Issue**:
    *   If the verification is successful and there are no missing translations (or they have been fixed), use the `update_issue` tool to set the issue state to `closed`.
3.  **Cleanup Browser Session**:
    *   Always close your testing windows using `mcp_chrome-devtools_list_pages` and `mcp_chrome-devtools_close_page` to prevent orphaned pages from accumulating.
4.  **Inform User**: Notify the user that the test is complete and the issue has been documented/closed.

---

## Improvements & Best Practices
- **React Hydration**: When interacting with Next.js forms via `evaluate_script`, you must bypass the native `value` setter using `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value)` and then dispatch an `input` event. Otherwise, React's internal state won't update.
- **`wait_for` Tool Bug**: There is a known schema mismatch in the `wait_for` tool. While the schema defines `text` as a string, the runtime validator expects an array (e.g. `["Text"]`). To avoid validation errors, prefer taking a fresh `take_snapshot` after a short delay or using `navigate_page`.
- **Error Handling**: If a browser action fails, use `list_console_messages` to capture runtime errors or logs for debugging.
- **Environment Parity**: Always use explicit locale-prefixed URLs (e.g., `/de/`) to ensure the automation interacts with the correct language version of the site.
- **Audit Trail**: Ensure every verification comment references the specific PR that resolved the issue.
