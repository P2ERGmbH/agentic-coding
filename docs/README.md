# 📚 Agentic Coding Documentation

Welcome to the central documentation repository for your Next.js application development. This directory serves as the single source of truth for our technical architecture, coding standards, and infrastructure management.

## 🧭 Documentation Map

### ⚙️ Workspace Configuration
- **`package.json` (`"agents"` block)**: Central workspace metadata and stakeholder mappings for reviews and @mentions (created automatically via the `project-setup` skill).
- **[`docs/project.json`](./project.json)**: Fallback configuration store if `package.json` is not present in the workspace.

To help you find the right information quickly, the documentation is organized into three main categories:

### 1. 🛠 Rules & Guidelines (`docs/rules/`)
Mandatory standards and workflows for both human developers and AI agents.
- **[Agentic Coding](../AGENTS.md)**: Operating procedures for AI agents (Gemini, Qwen, Cline).
- **[General Coding](./rules/general.md)**: Role definition, language mandates, and general refactoring rules.
- **[Next.js Development](./rules/next.md)**: Standards for App Router, Server Actions, and Cache Components.
- **[UI & Component Usage](./rules/ui.md)**: Global component guidelines and Toast usage.
- **[Icon Usage](./rules/icons.md)**: How to implement static (SVG) and animated (Lottie) icons.
- **[Figma-to-Code](./rules/figma.md)**: Procedures for pixel-perfect design implementation.
- **[Git & Commits](./rules/git.md)**: Branching strategy and commit message standards.
- **[Testing & Verification](./rules/testing.md)**: Automated and manual verification procedures.

### 2. 🏛 System Architecture (`docs/architecture/`)
High-level overviews of how the application is built and how data flows through it.
- **[Codebase Structure](./architecture/structure.md)**: Detailed breakdown of the `src/` directory and core architectural patterns (Middleware, i18n, etc.).

### 3. 🏗 Infrastructure & DevOps (`docs/infrastructure/`)
Documentation for our local and cloud environments.
- **[Local Development](./infrastructure/local-dev.md)**: Local server environment and workflow.
- **[NPM Scripts & Utilities](./infrastructure/scripts.md)**: A catalog of all helper scripts in `package.json` and the `scripts/` directory.
- **[Cloud Infrastructure (GCP)](./infrastructure/cloud.md)**: Overview of our production environment on Google Cloud Platform.
- **[Infrastructure as Code (Terraform)](./infrastructure/terraform.md)**: How we manage GCP resources using Terraform.
- **[Background Processing](./infrastructure/background-processing.md)**: Detailed behavior and limits of the Next.js `after()` hook.

---

## 🤖 AI Agent Entry Point

If you are an AI agent operating in this workspace, you **MUST** start at **[`AGENTS.md`](../AGENTS.md)**. It serves as your primary manifest and contains the routing table that will direct you to the specific documentation required for your current task.
