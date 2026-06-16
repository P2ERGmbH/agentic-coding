# Figma-to-Code Conversion Guidelines

Please adhere to the following requirements when converting designs from Figma to code:

## Automated Figma Parsing (Recommended Workflow)
When tasked with implementing a design from a Figma URL or Node ID, you must leverage the project's automated parsing script to ensure pixel-perfect accuracy:
1. **Download Data**: Use the raw JSON representation of the Figma node. **CRITICAL:** Always save to `.tmp/` (e.g., `./.tmp`) to avoid committing raw JSON files to the repository.
2. **Parse Variables**: Run the local parsing script on the downloaded JSON to generate an annotated tree view of Tailwind classes (flexbox, auto-layout, padding, gaps, text styling, colors):
   ```bash
   npx node .agents/skills/figma-implement/scripts/parse-figma-vars.mjs <path_to_downloaded_json>
   ```
3. **Implement**: Apply the parsed Tailwind classes verbatim to your React component structure.
4. **No Custom Colors**: NEVER leave custom hardcoded colors (e.g. `bg-[#eef2ff]` or `bg-[#a1b0cb]`) in the implemented code. You MUST map all colors to Tailwind standard palette colors or CSS-variable theme tokens (e.g. `bg-indigo-50`, `bg-slate-300`, `text-grey-800`, `bg-dark-blue-500`) that exist in the workspace config and `globals.css`.

## Spawning Vision Agent Validation (MANDATORY GATEWAY)
Before marking any Figma task as complete, the orchestrator **MUST** always launch a background vision subagent to:
1. Load the live page in the browser using the browser-testing tool.
2. Take a high-fidelity screenshot of the rendered component.
3. Perform an explicit side-by-side visual comparison between the live implementation screenshot and the original Figma design image (`.tmp/design_reference.png` or reference).
4. Iterate on layout spacing, padding, contrasts, margins, typography, and alignments until the vision agent confirms a well-executed, pixel-perfect match.

## Styling and Layout
- **Tailwind CSS**: Use Tailwind CSS for all styling.
- **Responsiveness**: Ensure the final output is responsive and matches the design's layout and spacing precisely.
- **Colors and Gradients**: Always use custom colors and gradients defined in `globals.css` (check under `/* Our Variables */`). Use corresponding Tailwind utility classes (e.g., `bg-gradient1`).
- **Gradients**: If modifying gradients, use color variables (e.g., `from-gradient1-start`, `via-gradient1-middle`, `to-gradient1-end`) and define direction only if explicitly needed (e.g., `bg-gradient-to-b`).
- **Shadows**: Use custom shadow classes defined in `globals.css` (e.g., `shadow-100` to `shadow-500`).
- **CSS Grid & Container Queries**: Use CSS Grid for complex layouts, and always prefer `@container` container-queries over fixed viewport-width queries (`md:`, `lg:`) when components are rendered in tight columns (such as in dynamic dashboards or sidebars) to prevent text wrapping or layout compression.
- **Mobile First**: Convert fixed dimensions to grid layouts with column definitions, defaulting to one column for mobile unless explicitly needed. Use responsive prefixes (e.g., `md:grid-cols-2`).

## Fonts
- **Font Imports**: Ensure necessary fonts (e.g., "Plus Jakarta Sans") are imported from Google Fonts and applied correctly.

## Asset Handling
- **Local Assets**: Download all image and icon assets to `public/assets/img`.
- **SVGs**: Move SVG files to `public/assets/svg` and ensure `.svg` format is used.

## Master Component References
- **Component Links**: Links to master files with component references (e.g., a UI component from a central design system file) must be respected.
- **Documentation**: If a UI component implements a master Figma component, its reference (URL/Node ID) must be explicitly explained and linked in the component's JSDoc comments.

## Post-Import Cleanup
- **Attributes**: Always remove all `data-node-id` and `data-name` attributes from the new markup.
- **Positioning**: Check that no absolute positioning (e.g., `t-[20px]`, `w-[320px]`) was used.
- **Mobile Check**: Verify the layout does not exceed the width of a mobile device.

## Feedback
- **Testing**: Ask the user to test the layout and provide feedback on how to improve the design.
