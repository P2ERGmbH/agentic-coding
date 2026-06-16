# Gemini CLI Skills Integration

This project utilizes the `gemini-cli` which provides various specialized "skills". You have full access to these skills and should invoke them when their specific expertise is required.

## Available Skills

You can trigger these skills using the `gemini-cli` command-line tool, or if you are running within the `gemini-cli` environment itself, by using the `activate_skill` tool.

The following skills are available in the `.agents/skills/` directory:

*   **`review-code`**: Performs a local code review on the current branch for correctness, security, efficiency, and project-specific rule compliance.
*   **`review-pull-request`**: Performs an extensive, in-depth review of a GitHub Pull Request using the GitHub MCP, ensuring strict adherence to project mandates and identifying cross-file issues. It automatically requests changes or approves based on finding severity.
*   **`resolve-review`**: Resolves review findings sequentially.
*   **`review-performance`**: Performs performance testing and review.
*   **`github-issue-solve`**: Resolves a GitHub issue locally.
*   **`github-issue-test`**: Verifies implemented GitHub issues.
*   **`github-issue-refine`**: Refines an existing GitHub issue.
*   **`github-issue-create`**: Creates a detailed GitHub issue.
*   **`test-browser`**: Performs automated and interactive browser-based testing for the application.
*   **`figma-validate`**: Compares live components with Figma designs.
*   **`figma-implement`**: Parses Figma JSON files to generate Tailwind CSS layout classes.
*   **`project-setup`**: Interactively configures project metadata, environment credentials, stakeholders for @mentions, sets up optional Chrome DevTools Automated Quality Gates (a11y, performance, memory), and generates MCP configurations for agentic CLIs.

## How to use a skill

If you need to execute one of these workflows, you can read the corresponding `SKILL.md` file in `.agents/skills/<skill-name>/SKILL.md` to understand its exact process and constraints, and then follow its instructions precisely.

For example, if you are asked to review a GitHub Pull Request, you must read `.agents/skills/review-pull-request/SKILL.md` and execute its phases step-by-step.
