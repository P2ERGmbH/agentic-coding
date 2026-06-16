# 🚀 Agentic Coding: Next.js 16 + Tailwind CSS Guidelines & Skills

An elite, project-agnostic set of agentic rules, technical guidelines, and automated workflows ("skills") designed to orchestrate and boost autonomous AI software engineering in Next.js 16 + Tailwind CSS repositories.

Compatible with **Antigravity CLI (`agy`)**, **Gemini CLI**, **Qwen CLI**, and **Cline (VS Code)**.

---

## 🌟 Key Features

1. **Pixel-Perfect Figma-to-Code**: Automatically fetch Figma design layouts and CSS layers, parse design tokens into Tailwind classes, and visually validate implementations in Storybook side-by-side.
2. **End-to-End GitHub Automation**: Zero-touch issue planning, branch isolation, sub-task breakdown, implementation, unit testing, browser smoke testing, internal code review, and automated PR generation.
3. **Continuous Verification Gates**: Standardized linter, compilation, and isolated-port browser execution with post-run server log audits.
4. **Interactive Setup Wizard**: Zero-dependency command-line interface to configure project parameters, define notification `@mentions` for stakeholders, append secrets, and generate matching MCP server settings.

---

## 📂 Repository Structure

```bash
├── AGENTS.md                 # Primary system manifest & ruleset for AI agents
├── docs/                     # Technical architecture & standards
│   ├── README.md             # Documentation map and config directories
│   ├── architecture/         # Codebase structures & folder routing maps
│   ├── infrastructure/       # GCP, cloud run, script indexes & dev environments
│   ├── rules/                # Language mandates, Next.js, Git & test rules
│   └── test/
│       └── smoke-test.md     # Standardized app verification manual
├── scripts/                  # Global helper & integration scripts
└── .agents/                  # Workspace-specific configurations and skills
    ├── mcp_config.json       # Antigravity CLI MCP configuration
    └── skills/               # Modular workflows and executable scripts
        ├── project-setup/        # Project & environment configuration wizard
        ├── figma-implement/      # Figma parsing & Tailwind utility generator
        ├── figma-validate/       # Visual validation & screenshot compare loops
        ├── github-issue-solve/   # Local branch coding workflow
        ├── github-issue-complete/# Full issue-to-PR automation pipeline
        └── ... (see docs/rules/skills.md for complete catalog)
```

---

## 🛠️ Getting Started

Integrate this framework into any target repository in seconds:

### Step 1: Copy rules and skills
Copy the `AGENTS.md`, `docs/`, and `.agents/` directories directly into your project workspace root.

### Step 2: Run the Setup Wizard
Execute the zero-dependency interactive setup utility:
```bash
npx node .agents/skills/project-setup/scripts/setup.js
```
The wizard will:
* Define your chosen agentic CLI environment (`agy`, `gemini`, `qwen`, or `cline`).
* Set up a configuration record at `docs/project.json` linking your stakeholders (PM, Senior Dev, QA, Tech Architect) for reviews and mentions.
* Store your GitHub and Figma Personal Access Tokens safely in `.env`.
* Generate appropriate Model Context Protocol (MCP) server configuration files to enable browser automation (`chrome-devtools`) and GitHub tools out of the box.

---

## 🤖 AI Agent Entry Point

If you are an AI assistant or coding agent operating in this repository:
1. You **MUST** start by reading **[`AGENTS.md`](./AGENTS.md)**.
2. Check if a project configuration file **[`docs/project.json`](./docs/project.json)** exists during your initial discovery phase to understand stakeholders, active ports, and environment links.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE) — allowing anyone to use, modify, distribute, and integrate these assets into their own commercial or open-source systems.
