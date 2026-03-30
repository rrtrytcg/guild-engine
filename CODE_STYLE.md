# Guild Engine — Code Style

## Naming Conventions
- **React components:** PascalCase filenames with default-export function
  - Example: `editor/src/components/Toolbar.jsx` (`export default function Toolbar() { ... }`)
- **Utilities:** camelCase filenames with named exports
  - Example: `editor/src/utils/blueprintUtils.js` (`export function injectByPath(...) { ... }`)
- **Engine systems:** lowercase filenames in `engine/systems/` with named exports
  - Example: `engine/systems/resources.js` (`export function tickResources(...) { ... }`)
- **Constants:** `UPPER_SNAKE_CASE` in engine modules
  - Example: `engine/systems/constants.js`
- **Tests:** `*.test.js` under `editor/tests/` (Vitest)

## File Organization
- **Editor UI:** `editor/src/components/`, `editor/src/canvas/`, `editor/src/inspector/`
- **Editor state:** `editor/src/store/useStore.js` (Zustand)
- **Compiler:** `editor/src/compiler/` (rules + validation)
- **Runtime systems:** `engine/systems/*.js`
- **Docs/specs:** `docs/`, `specs/`

## Import Style
- ES modules (`import ... from ...`)
- React imports first, then external libs, then local modules
- Some editor imports include `.js` extension (especially for utils)

## Code Patterns
- **React components:** function components, default export
- **Zustand store:** `create((set, get) => ({ ... }))` with inline handlers
  - Example: `onNodesChange`, `onConnect`, `importProject`, `exportBlueprint`
- **Compiler:** multi-phase validation pipeline that accumulates `errors`/`warnings`
  - Returns `{ ok, errors, warnings, project, stats }`
- **Engine systems:** functions mutate passed-in `state` and return status
  - Example: `tickResources(state, dt)`, `startExpedition(state, id)`

## Error Handling
- **Engine systems:** return `{ ok: false, reason }` or `false` for invalid conditions
  - Example: `engine/systems/expeditions.js`, `engine/systems/resources.js`
- **Compiler:** pushes structured error/warning objects into arrays (no throws)
  - Example: `editor/src/compiler/compiler.js`
- **Editor store:** uses `alert(...)` for invalid import payloads
  - Example: `editor/src/store/useStore.js`

## Logging
- Minimal logging; dev-only `console.warn` suppression in `editor/src/main.jsx`

## Testing
- **Framework:** Vitest (`editor/tests/*.test.js`)
- **Structure:** `describe`/`it` with helper factories
  - Example: `editor/tests/compiler.test.js` uses `makeNode`, `makeEdge`
- **Focus:** compiler validation and engine system helpers
  - Examples: `editor/tests/resources.test.js`, `editor/tests/bootstrap.test.js`

## Formatting Notes (Observed)
- **Semicolons:** generally omitted
- **Quotes:** single quotes
- **Trailing commas:** common in multi-line objects/arrays
- **JSX:** inline style objects are common (e.g., `editor/src/App.jsx`)

## Do’s and Don’ts
- **Do** keep component files PascalCase and default-export the component.
- **Do** keep engine system files lowercase and export named functions.
- **Do** add tests under `editor/tests/` with `.test.js` suffix.
- **Don’t** throw for validation errors in compiler; push errors/warnings instead.
- **Don’t** use `file://` to open `engine/index.html`; use a local server.
