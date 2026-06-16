---
name: figma-validate
description: Compare a live component implementation with its original Figma design frame, validating rendering and alignment in Storybook iteratively until pixel-perfect results are achieved.
---
# Figma Design Validation Workflow

This workflow guides you through comparing a live component implementation with its original Figma design frame to ensure pixel-perfect visual consistency and design system compliance.

## Trigger
Use this workflow when a user provides a Figma Node URL (e.g., `https://www.figma.com/design/.../?node-id=...`) and wants to validate that the live React component implementation matches the design frame precisely.

---

## Step-by-Step Validation Loop (Iterative Process)

### Step 1: Storybook Entry Setup & Verification
1.  **Locate Storybook Stories**: Search for an existing Storybook story file adjacent to the component (e.g., `[ComponentName].stories.tsx`).
2.  **Create if Missing**: If no story file exists, create a brand-new one containing robust mock data matching the component's expected props.
3.  **Confirm with User**: Ask the user to verify that you are targeting the correct Storybook entry by invoking the `ask_user_question` tool.

### Step 2: Download Figma Design Image
1.  **Extract Parameters Robustly (MANDATORY)**:
    - **`fileKey`**: Extract the full alphanumeric segment following `/design/`, `/file/`, or `/board/`. **CRITICAL**: Modern Figma file keys can be longer than 22 characters (e.g., 23 characters: `94ca8NwOFXEnWEcOghyEz2`). Do NOT assume a fixed 22-character limit or use fixed `{22}` regexes; extract the full segment up to the next slash `/` or question mark `?` using `[a-zA-Z0-9]+`.
    - **`nodeId`**: Extract from the `node-id` query parameter. **CRITICAL**: Figma browser URLs represent node IDs with hyphens (e.g., `node-id=16512-15263`), but the Figma API and MCP tools REQUIRE a colon (e.g., `16512:15263`). **Always convert hyphens (`-`) to colons (`:`)** before passing to any tool or API.
2.  **Fetch S3 Image Link**: Call the Figma REST API (`GET https://api.figma.com/v1/images/:file_key?ids=:node_id`) or use `download_figma_images` via MCP (using correct `fileKey` and `nodeId` parameter names).
3.  **Download PNG (TASK-SPECIFIC FILENAME)**: Download the Figma frame crop as a PNG file and save it under **`public/example/figma_[component_name_lowercase].png`** (e.g. `public/example/figma_product_card.png`). **NEVER** use generic names like `figma_design.png` to prevent asset conflicts across parallel AI tasks.

### Step 3: Open Storybook Viewer & Capture Live Screenshot
1.  **Launch Storybook Server**: If not already running, start the Storybook server locally on port 7676.
2.  **Navigate to Storybook iframe**: Navigate the Chrome DevTools MCP directly to the isolated component story iframe (e.g., `http://localhost:7676/iframe.html?id=[story-id]&viewMode=story`).
3.  **Capture Screenshot (TASK-SPECIFIC FILENAME)**: Capture a high-resolution screenshot of the rendered component viewport and save it directly to **`public/example/storybook_[component_name_lowercase].png`** (e.g. `public/example/storybook_product_card.png`).

### Step 4: Compare Images & Express Differences
1.  **Surgical Visual Audit**: Compare the live screenshot (`public/example/storybook_[component_name_lowercase].png`) side-by-side with the original Figma design export (`public/example/figma_[component_name_lowercase].png`).
2.  **Document Discrepancies**: Express all identified visual differences found across layout, spacing, typography, colors, and shadows.
3.  **Recommend Alignment Steps**: Propose a precise, step-by-step technical plan to modify the component's Tailwind CSS classes or structures to align with the Figma design.
4.  **Provide Comparison Locations**: The agent **MUST** explicitly state the exact task-specific file paths and server URLs of both files so the user can easily find them on their machine to point out errors:
    *   **Figma Layout Export:**
        *   Local path: `public/example/figma_[component_name_lowercase].png`
        *   Localhost URL: `http://localhost:7676/example/figma_[component_name_lowercase].png`
    *   **Live Storybook Render Screenshot:**
        *   Local path: `public/example/storybook_[component_name_lowercase].png`
        *   Localhost URL: `http://localhost:7676/example/storybook_[component_name_lowercase].png`

### Step 5: User Approval on the Fix Plan
1.  **Seek User Approval**: Ask the user to approve, deny, or request changes to your proposed alignment plan by presenting an interactive selection using the `ask_user_question` tool.
2.  **Wait for Decision**: Proceed only when the user has approved the plan or indicated how to modify it.

### Step 6: Apply Fixes & Re-Evaluate
1.  **Apply Layout Modifications**: Surgically refactor the React component code with the approved alignment steps.
2.  **Hot Module Replacement**: Let Storybook compile and update the iframe render.
3.  **Re-Capture and Compare**:
    *   Take a new screenshot of the Storybook viewport and overwrite `public/example/storybook_[component_name_lowercase].png`.
    *   Compare the updated screenshot against the figma export.
4.  **Loop or Conclude**: Ask the user if they want to perform another round of layout and visual improvements or if they are completely satisfied with the visual results. Repeat steps 4–6 iteratively until the user is satisfied.
