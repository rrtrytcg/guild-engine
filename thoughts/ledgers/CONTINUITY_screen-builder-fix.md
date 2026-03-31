# Session: screen-builder-fix
Updated: 2026-03-31T00:00:00.000Z

## Goal
Fix Guild Engine's Screen Builder (WYSIWYG editor) - runtime crash when clicking "Screens" tab.

## Constraints
- React.lazy() requires default exports
- Catch handlers for lazy imports must return Promises, not plain objects

## Progress
### Done
- [x] Identified root cause: ScreenBuilder.jsx missing default export (only had named export)
- [x] Fixed ScreenBuilder.jsx line 168: Added `export default ScreenBuilder`
- [x] Fixed App.jsx lines 42-47: Changed `.catch(() => ({ default: () => null }))` to `.catch(() => Promise.resolve({ default: () => null }))` for lazy import error handling

### In Progress
- [ ] Awaiting user verification that Screens tab loads properly

### Blocked
- None

## Key Decisions
- **Named export only was causing crash**: `ScreenBuilder.jsx` had `export function ScreenBuilder()` but React.lazy() expects `module.default`
- **Error handling must return Promise**: The `.catch()` handlers in App.jsx for lazy imports were returning plain objects instead of Promises

## Next Steps
1. User tests clicking "Screens" tab to verify fix works
2. If successful, consider adding default exports to other lazy-loaded components for consistency

## File Operations
### Read
- `C:\Games\IRMM\guild-engine\editor\src\components\ScreenBuilder.jsx`
- `C:\Games\IRMM\guild-engine\editor\src\App.jsx`

### Modified
- `C:\Games\IRMM\guild-engine\editor\src\components\ScreenBuilder.jsx` - Added `export default ScreenBuilder`
- `C:\Games\IRMM\guild-engine\editor\src\App.jsx` - Fixed Promise handling in lazy import catch blocks

## Critical Context
- Error message was: "Cannot convert object to primitive value" - caused by React.lazy() failing to find default export
- All 248 tests pass after fix

## Working Set
- Branch: UNCONFIRMED (git branch not checked in this session)
- Key files:
  - `editor/src/components/ScreenBuilder.jsx`
  - `editor/src/App.jsx`
