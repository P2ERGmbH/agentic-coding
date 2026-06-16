---
name: figma-implement
description: Parse downloaded Figma design JSON files and CSS layer data to generate Tailwind CSS layout classes, fonts, borders, and colors, with component-to-layer mapping and Storybook validation.
---

# Figma Layout Implementation Workflow

This skill guides you through implementing precise Figma designs by parsing Figma design tokens (JSON + CSS) into Tailwind utility classes, building a component-to-layer map, and verifying via Storybook and live page testing.

## Trigger
Use this skill when the user asks to "implement a Figma design", "convert Figma to Tailwind", "use the reusable figma implementation solution", or "build a component from a Figma frame".

---

## Phase 1: Requirements Gathering

Before any download or implementation work, gather the following using `ask_user_question`:

### 1.1 Figma Source
Ask the user for:
- **Figma URL** or **file key + node ID** — the exact frame/layer to implement.
- **Component name** — the kebab-case name for the React component (e.g., `product-card`).

### 1.2 Search for Existing Matching Components
After receiving the component name, **search the codebase** for existing components that might correspond:
- Search for files/components matching the name (glob for `**/[ComponentName]*.tsx`)
- Search for existing Figma references in `.stories.tsx` files that reference a similar URL/node
- Search for existing `@figma-layer` annotations that mention the layer name

If matches are found, **you MUST explicitly present the exact matching component files that were found to the user** in the chat interface. Propose updating the existing component rather than creating a new one.

### 1.3 Implementation Mode
When an existing component is found, **you MUST explicitly ask the user if they want a pixel-perfect design or an incremental layout improvement** (e.g., "Do you want a pixel-perfect match or an incremental layout improvement?"). Do not make this decision without seeking their explicit choice.

| Mode | Description |
|------|-------------|
| **New component** | The component doesn't exist yet — create from scratch. |
| **Improve existing layout** | The component exists; adjust spacing, colors, typography to better match the design while keeping the current structure. |
| **Pixel-perfect replacement** | The component exists but should be rewritten entirely to match the Figma frame exactly, discarding the current layout in favor of the figma design. |

Default to asking the user first before proceeding with any layout replacement.

### 1.4 Reference Components (for New Components)
If the mode is **New component** and no existing match was found, ask the user:
- **"Which existing component(s) should this new component follow as a reference?"** — This provides entry points for style, patterns, and conventions (e.g., `@/components/trips/TripCard`).
- Use these reference components to infer file location, naming conventions, prop patterns, and import structure.

### 1.5 Component-to-Layer Mapping
Ask the user: **"Does this Figma frame contain sub-layers that correspond to separate existing React components?"**

If yes, collect the mapping interactively:
- For each sub-layer the user identifies, record: `{ layerName → componentPath }`
- This mapping will be embedded as comments in the `.stories.tsx` file and compiled into a centralized lookup.

If the user is unsure, proceed with the full frame as a single component — the mapping can be refined later.

### 1.6 Test Page Target
Ask the user: **"Which page/route should be used to test the final implementation after Storybook validation?"**

- This could be a route like `/trips`, `/dashboard`, or a specific page path.
- If the user doesn't know, default to: "Storybook validation is sufficient; no live page test needed."
- Store this answer for the final validation phase.

### 1.7 Mandatory Implementation Plan Generation
Before initiating any code changes or proceeding to the download/implementation phase, you **MUST** formulate and write a complete, step-by-step Implementation Plan.

Per the **Plan Printing Mandate** (defined in `AGENTS.md`), you **MUST** explicitly and fully print out this implementation plan in the chat interface directly to the user. Do not hide or summarize plans behind links or artifacts.

Your implementation plan must explicitly detail:
1. **Target Components & Files**: Identify which files will be created, modified, or deleted.
2. **Step-by-step Subtasks**: Map out the concrete engineering steps (e.g. data retrieval, interface matching, styling, translation keys).
3. **Subagent Delegation**: List which independent subtasks can be executed in parallel by specialized subagents (e.g. a `research` subagent to gather context, or separate subagents for visual validation).
4. **Verification Strategy**: Outline how the final result will be presented in Storybook and validated loc

## Phase 2: Download Figma Data (with Verification & Robust Error Handling)

### 2.1 Robust Figma URL Parameter Extraction (MANDATORY)
Before calling any MCP tool, you **MUST** correctly extract the `fileKey` and `nodeId` from the Figma URL:
- **`fileKey` Extraction**:
  - The `fileKey` is the alphanumeric segment immediately following `/design/`, `/file/`, or `/board/` in the URL.
  - **CRITICAL**: Do NOT assume the `fileKey` is exactly 22 characters long! While older Figma keys were 22 characters, newer keys can be 23 or more characters (e.g., `94ca8NwOFXEnWEcOghyEz2`).
  - **Always extract the full alphanumeric string** up to the next forward slash `/` or question mark `?` using a pattern like `[a-zA-Z0-9]+` (do NOT use a fixed length constraint like `{22}`). Truncating the file key will cause any Figma API/MCP tool to fail with 403 Forbidden or 404 Not Found errors.
- **`nodeId` Extraction & Normalization**:
  - The `nodeId` is found in the `node-id` (or `nodeId`) query parameter of the URL.
  - **CRITICAL**: Figma browser URLs represent node IDs with hyphens (e.g., `node-id=16512-15263`), but the Figma API and the `figma-developer-mcp` tools REQUIRE node IDs to be formatted with a colon (e.g., `16512:15263`).
  - **Always convert any hyphens (`-`) to colons (`:`)** in the extracted node ID before passing it to any tool as the `nodeId` parameter. Failure to do so will violate the tool's parameter pattern validation constraint.

### 2.2 MCP Tool Parameter Casing Verification (CRITICAL)
- **Always Read Tool Schemas First**: Before invoking any lazy-loaded tool from the `figma-developer-mcp` (such as `get_figma_data` or `download_figma_images`), you **MUST** read its schema definition file (e.g., `figma-developer-mcp/get_figma_data.json`) to confirm the exact parameter names.
- **Strict Parameter Validation**: Avoid using incorrect parameter names (such as snake_case `file_key` or `node_id`). The Figma developer MCP tools require standard camelCase parameter names (e.g., `fileKey` and `nodeId` in `get_figma_data`). Calling tools with incorrect argument keys will fail with `Invalid fileKey: Required` validation errors.

### 2.3 Graceful Authentication / Token Error Fallback
- **Handle 403 Forbidden / Invalid Token Errors**: If a call to a Figma Developer MCP tool returns a `403 Forbidden` error (e.g., `"err": "Invalid token"`, expired OAuth credentials, or file permission restrictions):
  1. **Do NOT repeat the failed call** or loop continuously.
  2. **Report and Explain Gracefully**: Stop and explain the exact issue clearly to the user in plain language. Mention that the active `FIGMA_TOKEN` in `.env` is invalid, expired, or lacks permission to view that specific file/frame.
  3. **Provide Fallback Plan**: Offer a fallback implementation strategy to the user. Rather than failing the entire task, fall back to manual layout replication using any existing stories, adjacent React source files, and browser visual comparisons, and continue the implementation cycle.

### 2.4 Download All Three Artifacts
1. **Figma JSON** — `get_figma_data` → save to `.tmp/[component_name].json` (if token is valid)
2. **Figma Images (PNG)** — `download_figma_images` → save to `public/example/figma_[component_name].png` (if token is valid)
3. **Figma CSS** — Generate from the JSON using the bundled script (see step 2.5)

### 2.5 Generate CSS from Figma JSON (Copy as Code CSS equivalent)
Run the CSS generation script to produce a `.tmp/[component_name].css` file containing the exact CSS rules for every layer — mirroring Figma's "Copy as Code → Copy All CSS" export format:

```bash
node .agents/skills/figma-implement/scripts/generate-figma-css.mjs \
  .tmp/[component_name].json \
  .tmp/[component_name].css
```

### 2.6 Verify All Downloads
After all three artifacts are present, verify each exists and is non-empty. **Report the result to the user:**

| Artifact | Expected Path | Status | Purpose |
|----------|--------------|--------|---------|
| JSON | `.tmp/[component_name].json` | ✅ / ❌ | Structure, auto-layout, fills, effects |
| CSS | `.tmp/[component_name].css` | ✅ / ❌ | Exact CSS rules per layer (Copy as Code equivalent) |
| PNG | `public/example/figma_[component_name].png` | ✅ / ❌ | Visual reference for validation |

**If any artifact is missing or zero-length, stop and report the failure** to the user before proceeding. If the download failed due to a 403 authentication error, immediately switch to the fallback manual replication mode described in Step 2.3.

---

## Phase 3: Parse & Implement

### 3.1 Parse the JSON into Tailwind Classes
Run the bundled parsing script:

```bash
node .agents/skills/figma-implement/scripts/parse-figma-vars.mjs .tmp/[component_name].json
```

This outputs an annotated tree view with Tailwind classes for every node.

### 3.2 Cross-Reference with CSS
Open the generated `.tmp/[component_name].css` file alongside the Tailwind tree. Use the CSS for:
- **Exact property values** that the Tailwind parser doesn't capture (e.g., precise letter-spacing, line-height multipliers, font-family stacks).
- **Gradient definitions** that need to be mapped to `globals.css` variables.
- **Border styles** beyond simple width (dashed, dotted, etc.).
- **Background layering** (multiple backgrounds, gradients over images).

### 3.3 Implement Based on Mode

#### New Component
- Infer the file location from the reference component's path (if provided) or use `src/components/[domain]/[ComponentName].tsx`
- Create `src/[domain]/[ComponentName].stories.tsx` **MANDATORY**
- Follow conventions from the reference component (imports, prop patterns, Tailwind patterns)
- Add the component-to-layer mapping as JSDoc comments (see Phase 4)

#### Improve Existing Layout
- Read the existing component file
- Apply parsed Tailwind classes surgically — adjust spacing, colors, typography without restructuring
- Preserve existing logic, event handlers, and data flow
- Keep existing tests and stories — update stories if visual output changes

#### Pixel-Perfect Replacement
- Read the existing component to understand its props and API surface
- Rewrite the JSX structure and Tailwind classes to match the Figma frame exactly
- Keep the same props interface and export signature
- Preserve existing tests — they must still pass

### 3.4 Strict Adherence, Completeness & Prevention of Over-Engineering
To avoid implementing incorrect, partial, or hallucinated elements, strictly follow these constraints:
- **Complete Design Implementation**: You must implement the target Figma design completely. Do not partially implement parts of the layout, ignore key visual blocks (such as specific contact cards, details, or address containers), or leave fields/labels hardcoded. Every layout section present in the Figma frame must be correctly represented in the production-ready component code.
- **No Extraneous Elements**: Do not invent, hallucinate, or add elements (e.g., status indicator badges, custom pulsing dots, simulated locales, flags, or interactive toggles) that do not explicitly exist on the target Figma design frame.
- **Verification via Reference Image**: Always compare the raw parsed JSON layout tree against the exported reference image `figma_[component_name].png` visually. If an element is not present in the reference image, do NOT include it in the component code.
- **Keep States Relevant**: Avoid adding over-engineered UI states, dummy indicators, or speculative business logic unless explicitly requested by the user. Align perfectly with the Figma layout elements and only those elements.

### 3.5 Server Action Mocking & Monolithic Design (MANDATORY)
To ensure the figma design implementation can concentrate entirely on the layout, and to allow Storybook testing of visual layouts without actual server/database environments, the following guidelines are mandatory:
- **Keep Components Integrated**: You do NOT need to separate components into distinct "View" and "Controller" files. It is highly encouraged to implement standard integrated (monolithic) Client/Server components where layout, local state, and server actions/handlers are in a single, cohesive file.
- **Mock Server Actions for Storybook**: Since Server Actions cannot execute inside the client-only Storybook environment, you MUST mock all imported server actions at the Storybook level:
  - **Do NOT Import Production Actions in Storybook**: Avoid calling real server actions inside stories.
  - **Mock via Storybook Aliasing/Mocks**: Leverage custom webpack/vite aliases, `.storybook/mocks/`, or MSW to override actions with mock functions that return stubbed data or logs.
  - **Example**: Define story-specific mock actions inside the story file or story decorator so the component remains fully functional and visual layouts can be developed and validated in Storybook without database dependencies.
- **Concentrate on Layout First**: During the Figma design conversion, focus primarily on structural layout, styles, local UI states, and mock handlers. Actual backend data fetch integration and persistent action handlers can be wired up in a subsequent, separate integration step.

---

## Phase 4: Component-to-Layer Mapping

### 4.1 Embed Mapping in Stories File
Add a JSDoc `@figma` block comment at the top of the component's `.stories.tsx` file documenting the layer-to-component mapping:

```ts
/**
 * @figma https://www.figma.com/design/xxx/yyy?node-id=123
 * @figma-layer header -> @/components/ui/PageHeader
 * @figma-layer search-bar -> @/components/trips/SearchBar
 * @figma-layer results-list -> @/components/trips/ResultList
 * @figma-layer result-card -> @/components/trips/ResultCard
 */
```

**Rules:**
- `@figma` — the source Figma URL for the entire frame (one entry per file).
- `@figma-layer <layer-name> -> <component-import-path>` — one per mapped sub-layer.
- If the layer maps to the component in the same file (the root frame IS the component), use `@figma-layer root -> self`.
- Layer names should match the Figma layer name exactly (case-sensitive).

### 4.2 Compile Centralized Mapping
After adding the mapping, run the compilation script to update the centralized layer map:

```bash
node .agents/skills/figma-implement/scripts/compile-component-map.mjs
```

This script:
1. Greps all `.stories.tsx` files for `@figma` and `@figma-layer` annotations
2. Compiles them into `.tmp/figma-component-map.json` (machine-readable)
3. Also writes `docs/figma-component-map.md` (human-readable table)
4. Reports any layers that reference component paths not found on disk (warnings)
5. Detects duplicate or conflicting layer-to-component mappings

**The compiled map serves as:**
- A lookup for "which Figma layer owns this component?" during design updates.
- A cross-reference for new developers to understand the design-to-code mapping.
- An input for the validation skill to know which layer screenshot to compare.

---

## Phase 5: Visual Comparison & Validation (Storybook Iterative Loop)

### 5.1 Boot Storybook and Verify Component
If the Storybook server is not already running on port `7676`, start it locally:
```bash
npm run storybook
```
Ensure that the component compiles correctly with no compilation errors or TypeScript issues.

### 5.2 Spawn Validation Subagent
Launch a `general-purpose` subagent with the `figma-validate` skill to capture a high-resolution screenshot of the Storybook story render (`public/example/storybook_[component_name].png`) and compare it side-by-side with the exported Figma PNG (`public/example/figma_[component_name].png`).

### 5.3 Present the Story and Comparison to the User
Once an implementation cycle is complete, **you MUST explicitly present the live Storybook story to the user** in the chat interface. Your presentation must include:
1. **Direct Localhost Link**: Provide a direct link to the Storybook viewer for the component (e.g., `http://localhost:7676/?path=/story/[story-id]`).
2. **Side-by-Side Visual Comparison**: Provide absolute paths and localhost URLs for both:
   - **Figma Design Export**: `public/example/figma_[component_name].png` (`http://localhost:7676/example/figma_[component_name].png`)
   - **Live Storybook Render**: `public/example/storybook_[component_name].png` (`http://localhost:7676/example/storybook_[component_name].png`)
3. **Summary of Implemented Elements**: Briefly list what visual structures, properties, dynamic fields, and translation keys were implemented during this cycle.

### 5.4 Mandatory User Feedback & Iteration Prompt (with ask_question tool)

After presenting the live Storybook story and comparison, **you MUST explicitly ask the user for feedback and confirmation of completion using the `ask_question` tool.**

You MUST invoke the `ask_question` tool with the following interactive question and options:

- **Question**: "Is this implementation complete and correct, or should we run another refinement cycle?"
- **Options**:
  1. "(Recommended) The implementation is complete and correct. (Proceed to cleanup and finish the task.)"
  2. "No, start another refinement cycle to align the layout/styling (spacing, alignment, borders, colors, typography, shadows)."
  3. "No, start another refinement cycle to update icons or decorative assets."
  4. "No, start another refinement cycle to adjust data mapping, props, or translations."

CRITICAL: Do NOT merely print these options as plain text or markdown in the chat. You MUST call the `ask_question` tool to present them interactively. This ensures a professional, structured feedback process. You must not present these options as plain text or markdown in the chat.

### 5.5 Execute Additional Cycles
If the user chooses to start another refinement cycle (or provides custom feedback pointing out discrepancies), you **MUST**:
1. Formulate a short, targeted sub-plan outlining the specific adjustments to make.
2. Modify the component code and style configurations accordingly.
3. Overwrite/update the Storybook screenshot (`storybook_[component_name].png`) and verify compiling.
4. Repeat the presentation in Step 5.3 and ask the feedback prompt in Step 5.4 again.
5. **Continue this iterative loop indefinitely** until the user provides explicit, written confirmation that they are fully satisfied and the task is complete.

---

## Phase 6: Live Page Validation

If a test page target was specified in Phase 1.6:

1. **Open the target page** using browser automation (Chrome DevTools MCP) at the custom port or standard port (e.g., `http://localhost:6767/[target-route]` or `http://localhost:[custom_port]/[target-route]`).
2. **Verify the component renders correctly** in the real page context (with actual routing, layouts, and translations).
3. **Check for integration issues**: Ensure there are no layout breaks, styling conflicts with adjacent elements, or missing locales.
4. **Present the page render**: Report findings, capture page screenshots if helpful, and present a localhost link of the live page to the user.
5. **Seek integration feedback**: Ask if the live-page integration is satisfactory or if another refinement cycle is required. Fix any integration bugs before concluding.

If no test page was specified, skip this phase.

---

## File Cleanup & Completion

Before performing ANY final cleanup steps, deleting worktrees, or concluding the task:

1. **Mandatory Local Testing & Completion Confirmation**: You **MUST** explicitly ask the user to test the changes locally first in their own environment and seek their written, explicit confirmation of task completion.
2. **Do Not Clean Up Prematurely**: Do NOT delete any temp files or delete worktrees before the user has given written approval.
3. **Execute Final Cleanup**: Only after receiving explicit, written approval from the user, proceed with the following final cleanup:
   - Delete all temporary artifacts from `.tmp/` (JSON, CSS, compiled map — the PNG stays in `public/example/` for validation reference).
   - Delete intermediate validation screenshots (`storybook_*.png`) from `public/example/` to avoid repository bloat.
   - Keep `figma_[component_name].png` in `public/example/` only if the user wants to keep it as a reference; otherwise delete it too.
   - Remove the isolated git worktree if applicable.

