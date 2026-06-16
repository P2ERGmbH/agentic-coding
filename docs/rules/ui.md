# UI and Component Guidelines

## Component Usage
This project defines specific guidelines for component usage to maintain consistency, reusability, and type safety across the application.

- **Check Existing**: Before creating a new component, check all `components` folders to see if a similar component already exists and can be reused or extended.
- **Organization**: Place page-specific components into a `components` folder located next to the `page.tsx` file.

## Toast Notifications
Always use the toast utility from the UI component library.

```tsx
import { toast } from '@/components/ui/toast';
```

## Visual & UI Component Testing (Storybook Mandate)
- **Storybook as Single Source of Truth**: All reusable UI components must have a corresponding `[ComponentName].stories.tsx` file located adjacent to the component in `src/components/`.
- **No Mock Routes**: Do not mock UI states inside application routing (e.g., `app/[locale]/admin/design-system`). Use Storybook exclusively.
- **Presenter/Container Pattern**: Storybook cannot natively execute Next.js Server Actions or dynamic server fetches in the browser. Components should be refactored into pure Presentational (client) components when tested in Storybook.
- **Storybook Example Images Location (MANDATORY)**: All example/mock images, screenshots, and visual reference assets utilized inside Storybook story configurations (e.g., `[ComponentName].stories.tsx`) MUST be placed inside the `public/example/` directory. Referencing files from arbitrary temp folders or unversioned external URLs for core mock preview illustrations is strictly prohibited.
- **Agent Workflow**: AI agents must verify UI changes visually using the Storybook environment. Agents must boot Storybook via `npm run storybook`, wait for compilation, and then use the `chrome-devtools` MCP to navigate to the isolated component iframe (`http://localhost:7676/iframe.html?id=...`) to verify pixel-perfect compliance with Figma designs.
