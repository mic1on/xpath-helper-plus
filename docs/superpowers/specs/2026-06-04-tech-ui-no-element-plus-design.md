# Tech UI Without Element Plus Design

## Context

XPath Helper Plus is a Vue 3 and Vite browser extension toolbar. The current popup/bar UI depends on Element Plus for layout, inputs, checkboxes, buttons, tooltip, and global config. The requested change is to remove the default component library completely and replace it with a custom technology-style interface.

The toolbar is constrained by `src/custom.css`, which fixes the injected iframe height to 120px. The UI must stay compact and practical inside that height.

## Goals

- Remove `element-plus` from dependencies, generated type declarations, Vite auto-import resolvers, and all Vue templates.
- Keep the existing XPath workflow unchanged: edit XPath, toggle compact XPath, toggle list mode, copy XPath, copy CSS selector, view result text, and move toolbar position.
- Build a custom visual system with a compact technology dashboard tone: dark glass surface, precise panel lines, cyan/green highlights, and dense developer-tool spacing.
- Avoid adding a new UI component library.

## Non-Goals

- No changes to XPath generation, evaluation, highlighting, or Chrome extension messaging behavior.
- No new pages, landing sections, onboarding copy, or marketing layout.
- No broad project refactor outside the UI and build dependency surface needed for this change.

## Approach

Use native Vue templates and scoped CSS classes instead of Element Plus components.

`src/App.vue` becomes the shell for the injected tool surface. It will remove `el-config-provider`, define a full-height dark background, and provide a constrained content wrapper.

`src/components/home.vue` replaces `el-row` and `el-col` with a responsive two-column CSS grid. At the toolbar's normal width, the XPath editor and result panel sit side by side. At narrow widths, the grid can collapse to one column without relying on a layout library.

`QueryEditorCard.vue` and `ResultPreviewCard.vue` replace Element Plus controls with native elements:

- Custom panel header rows using flex layout.
- Custom checkbox/toggle labels backed by native `<input type="checkbox">`.
- Custom text buttons for actions.
- Native `<textarea>` elements with explicit resize, focus, and disabled states.
- A CSS-only tooltip for "copy CSS" so no popper dependency is required.

The style system will use `.xh-*` classes scoped to the Vue components. Visual details will include subtle grid texture, one-pixel panel borders, cyan focus rings, compact uppercase labels, and stable textarea dimensions to avoid layout shift.

## Dependency Changes

- Remove `element-plus` from `package.json`.
- Regenerate `package-lock.json` with npm so transitive Element Plus packages disappear.
- Remove `ElementPlusResolver` from `vite.config.ts`.
- Keep Vue auto-imports if they are still useful, but without Element Plus resolvers.
- Remove Element Plus entries from `components.d.ts`; the file may remain for local Vue component declarations if the plugin regenerates it.

## Accessibility And Behavior

Native controls keep keyboard and form semantics. Buttons remain `<button type="button">`. Textareas will have clear labels through nearby headings and `aria-label` where needed. Focus states must be visible against the dark background.

Existing emitted events and prop contracts stay stable, so `useXPathWorkbench` does not need behavior changes.

## Testing

After implementation:

- Run `npm run typecheck`.
- Run `npm run build`.
- Search the repo for `element-plus`, `ElementPlusResolver`, and `el-` component tags to confirm removal, excluding generated package metadata if already removed.

## Risks

The extension iframe height is tight. The custom UI must keep vertical spacing compact so both textareas remain usable inside 120px. If the viewport becomes too narrow, the collapsed layout may need to trade textarea height for readability.
