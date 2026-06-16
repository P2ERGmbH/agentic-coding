---
name: project-setup
description: Interactively set up project configurations, stakeholders for @mentions, environment variables (tokens for Figma, GitHub), and configure MCP servers for the user's chosen agentic CLI.
---

# Project & Agent Setup Workflow

This skill is used to initialize or update a project's settings, define stakeholders for automated agent notifications/@mentions, configure environment variables (`.env`), and generate matching MCP server configurations for the user's chosen agentic CLI.

## Trigger
Use this skill when:
- Setting up a new repository with this agentic ruleset.
- The user asks to "configure the project", "setup the agents", "run project setup", or "setup mcp servers".
- An agent detects that both the `package.json` `"agents"` block and `docs/project.json` are missing or incomplete during startup checks.

---

## Phase 1: Stakeholder & Project Configuration (`package.json` or `docs/project.json`)

The single source of truth for repository details and stakeholder GitHub usernames for mentions and reviews is stored in the **`package.json`** file under the `"agents"` configuration key. If `package.json` is missing or uninitialized, the workflow automatically falls back to **`docs/project.json`**.

### 1.1 Checked Configuration Schema
Every agent session must verify if `package.json` (under `"agents"`) or `docs/project.json` exists. The expected schema structure is:

```json
{
  "projectName": "your-project-name",
  "organization": "your-github-org",
  "repository": "your-github-repo",
  "stakeholders": {
    "productManager": "@pm-github-username",
    "seniorDeveloper": "@senior-dev-username",
    "qaLead": "@qa-lead-username",
    "techArchitect": "@architect-username"
  },
  "environments": {
    "production": "https://your-domain.com",
    "development": "https://dev.your-domain.com",
    "localPort": 6767
  }
}
```

### 1.2 Interactive Setup Script
To easily create or update this file without manual JSON editing, run the bundled interactive setup script:

```bash
npx node .agents/skills/project-setup/scripts/setup.js
```

---

## Phase 2: Environment Credentials

During the setup process, the user is prompted for their API tokens. These are written directly to `.env` or `.env.local` to enable seamless integration with Figma and GitHub REST APIs:

- **`GITHUB_TOKEN`**: Personal access token with `repo` and `workflow` scopes (required for `gh` CLI and git automation).
- **`FIGMA_TOKEN`**: Personal access token (required for Figma Developer MCP to parse frames).

---

## Phase 3: MCP Server Configuration

Depending on the user's preferred agentic CLI, the setup script generates and places the correct MCP server configuration file:

### 3.1 Antigravity CLI (`agy`) & Gemini CLI
- **Location**: `.agents/mcp_config.json`
- Stores custom tools like `chrome-devtools`, `figma-developer-mcp`, and `github-mcp`.

### 3.2 Cline (VS Code Extension)
- **Location**: `.vscode/cline_mcp_settings.json`
- Configures local node/npm tools to be visible within Cline's active session.

### 3.3 Qwen CLI
- **Location**: `.qwen/settings.json`
- Configures workspace settings, permissions, Gemini model providers, and MCP servers.

### 3.4 OpenCode
- **Location**: `.opencode/settings.json`
- Configures workspace settings, permissions, Gemini model providers, and MCP servers.

---

## Phase 4: Verification

At the end of the setup flow, the setup script:
1. Validates that the configuration database (package.json or project.json) is well-formed.
2. Checks if `gh auth status` is authenticated (if a token was provided).
3. Verifies that the `.env` file contains the required variables.
4. Outputs instructions on how to load/reload MCP servers in the user's chosen CLI.
