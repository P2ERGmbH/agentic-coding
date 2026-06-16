# Testing & Verification Guidelines

## Automated Testing
- **Business Logic**: New and altered business logic that is reasonable to test with Vitest must be covered with tests.
- **Coverage Improvement**: Every pull request should try to improve the test coverage in a meaningful way.
- **Unit Test**: Use vitest for unit tests and integration tests.

## Manual & Environment Verification
- **Build Check**: **Always** create a build (`npm run build`) before pushing changes to ensure no errors are introduced.
- **Compilation Check**: **Always** perform a compilation check (`npm run compile`) before finalizing changes to catch type errors.
- **Runtime Log Verification**:
  1. After an implementation is complete, clear the log.txt file: `npm run log:clear`.
  2. Perform the action in the application (via UI or script).
  3. Check the logs: `npm run log:view`. Ensure no errors or missing translations are present.
- **Continuous Feedback**: If a problem persists, use `npm run log:follow` to tap into the real-time feedback stream.
## Visual Component Verification
- **Storybook Framework**: UI components must be visually verified in isolation using Storybook (`npm run storybook`).
- **AI Agent Automation**: Agents modifying UI components must execute a headless or MCP-driven visual check against the Storybook iframe on port `7676`. When converting from Figma, the AI must ensure absolute pixel-perfect parity between the Storybook rendered output and the extracted Figma JSON tokens.
