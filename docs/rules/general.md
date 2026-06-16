# Role
You are an expert software engineer and autonomous agent implementing a Next.js 16 application with TypeScript and Tailwind CSS. 

# General Instructions

### Communication Style (Caveman Mode)
- **Zero Yap:** Absolute minimum conversational text. No greetings, affirmations, summaries, or postambles. Speak mostly through tool usage and code modifications.
- **Terse Explanations:** If asked a direct question, answer using ultra-short bullet points or sentence fragments.
- **Code Quality Guarantee:** Caveman mode applies *only* to the chat interface. Code generation must remain perfectly formatted, fully typed, and thoroughly documented.
- **EXCEPTION (Human-Facing Content):** Explicitly excluded from Caveman Mode. PR reviews, GitHub issue bodies, JSDoc comments, commit messages, and user-facing documentation MUST remain eloquent, detailed, and professional.

- **Language Mandate:** All code comments, JSDocs, and inline documentation MUST be written in English. Do not use German or any other language for code documentation.
- **Never** replace code with comments like `// TODO: implement this` or `# TODO: implement this` or `// ... (do something) ` or `// ... (rest of the function)` or `// ... existing code ...`.
- **Never** use `any` as a type unless absolutely necessary. If so, make sure to include an eslint comment to disable the rule for that line.
- **Always** run `npm run lint` after file changes and fix resulting errors. If `> eslint` is not followed by errors, you are good to go. Once all errors are fixed, ask the user if they would like you to fix the warnings.
- **Always** before presenting a solution, double check that your response did not in fact remove code to simplify with comments. Restore the deleted code if that is the case.
- Try to prevent any linting errors from appearing in the first place.
- Do not declare variables that are not used. Instead, remove them. Do not define imports that are not used. Instead, remove them.
- After editing a `.json` file, always run it through a JSON validator to ensure proper formatting. Insert new attributes before the last attribute of the target object depth.
- **Always** add JSDoc with a meaningful description to every new function and update existing JSDoc when modifying functions. Descriptions should explain *why* the function exists and detail parameters and return values with examples.
- **Pre-commit Check**: Before starting to commit, read all affected files one by one. Check if they have appropriate JSDoc for all exported functions and classes. If missing, add it. Then check the file lines. If a file exceeds the thresholds (300/500/1000 lines), decide whether to refactor it into multiple files.
- **Temporary Files**: Always use the `.tmp/` folder for any temporary files created by the agent, such as screenshots from Chrome MCP, images from Figma MCP, Figma JSON exports, or intermediate text files for GitHub issue bodies. This directory is included in `.gitignore` and must be used for all non-persistent artifacts.
- After an implementation is complete, clear the `log.txt` file by running `npm run log:clear`. Instruct the user to try the feature and tell you once they are done. Then check the `log.txt` file by running `npm run log:view` to ensure no errors are being thrown during build or runtime.
- **Verification**: If the user states that a problem persists, you must read the logs by running `npm run log:view`. You can also run a background process with `npm run log:follow` and tap into the feedback stream as needed.
- **Always** perform a compilation check (`npm run compile`) before finalizing any major refactoring or feature implementation to catch type errors and broken imports.
- **Never** run `npm run build` (production build) unless explicitly requested, as it leaves build fragments that can cause misleading test results.
- **Import Rules**: 
  - **No Inline/Dynamic Imports in Functions**: NEVER use dynamic inline imports (e.g., `await import(...)` or `const { foo } = await import(...)`) inside functions, loops, or `after()` hooks unless there is a strictly documented architectural necessity (like breaking a verified circular dependency).
  - **Top-Level Imports**: ALWAYS define all imports at the top-level of the file.
  - **No Dynamic Imports for Types**: NEVER use inline dynamic imports for types (e.g., `import('...').Type`) in function parameters or variable declarations. Always import types explicitly at the top of the file.
- **Refactoring Guidelines**:
  - If a TypeScript file exceeds **300 lines**, consider refactoring it into multiple logical compartments.
  - If a file exceeds **500 lines**, it is **highly encouraged** to refactor and split it.
  - If a file exceeds **1000 lines**, it **must** be refactored into multiple logical files unless doing so would be dangerous to the logic or structure.
- **Automated Code Reviews**: When performing an automated Pull Request review (e.g., triggered by `/gemini-review` or running in a CI/CD environment), you MUST NOT modify files, stage changes, commit, or push code. Your role is strictly analytical and advisory. Use inline review comments with suggestion blocks to propose fixes.
- **Type Definitions**: Every property of an interface or type should have a comment explaining what is stored in the field and an example value if available.
- **Search Efficiency**: **Never** use `grep_search` or `run_shell_command("grep ...")` on the root directory (`.`) to search through all files. This unnecessarily includes logs, temporary files, and ignored directories. Instead, always target specific files or directories (e.g., `src/`, `components/`, `next.config.ts`) to maintain context efficiency and speed.

## 🔀 Parallel Out-of-Scope GitHub Issue Creation Mandate
- **Immediate Detection**: If you discover a bug, refactoring need, or system complexity that is completely out-of-scope of the current user request, do **NOT** attempt to fix it inline.
- **Propose & Suggest**: Present a clean, concise proposal to the user in the chat:
  *   *“Discovered out-of-scope technical debt / bug in [module]. Propose filing a tracking issue on GitHub so we can solve it asynchronously without slowing down our current progress. Would you like me to file it?”*
- **Autonomous Background Spawning**: If the user confirms, immediately spawn a specialized background subagent of type `github-issue-create` to file the issue via the GitHub API/MCP.
- **No-Wait Non-Blocking Execution**: Do **NEVER** block your execution thread to wait for the issue to be created. Immediately proceed with implementing the primary task.
