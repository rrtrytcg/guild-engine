# Continuity Ledger — Session ses_2c37

**Date**: 2026-03-30
**Status**: Active

---

## Session Summary

### What Was Worked On
Completed the **Screen Builder** (Batches 1–9) and started planning a **WYSIWYG redesign**.

### What Happened

1. **Finished Screen Builder (Batches 1–8)**:
   - Tree-based widget editor with drag-and-drop, properties panel, validation
   - `ScreenErrors` component showing real-time errors/warnings
   - 224/224 tests passing, clean build

2. **Batch 9 — Schema Integration**:
   - Added `screens` array to `project.schema.json` definitions
   - Wired `importProject` to auto-load inline `project.screens`

3. **User Feedback — UX is Confusing**:
   - Tree-first editing is opaque — can't picture the screen from the tree
   - Preview is small and disconnected
   - User said: "even looking at it for 1h I have no idea what it's going to look in the engine"

4. **WYSIWYG Redesign Planned**:
   - Wrote `docs/WYSIWYG.md` — full redesign spec
   - Canvas-first direct manipulation (VS Code form designer / Flutter inspector style)
   - Palette → drag onto canvas → select → resize → edit properties → live preview
   - Tree becomes secondary outline view
   - Planned in 8 phases (Canvas Renderer → Selection Overlay → Drag-and-Drop → Move/Reorder → Resize → Inline Edit → Live Properties → Undo/Redo)

5. **Copilot Discovery**:
   - GitHub Copilot now supports OpenCode (2026-01-16 blog post)
   - User can use Copilot directly in this environment for the WYSIWYG work

### Key Decisions
- **Keep existing schema and engine rendering** — don't change the `*.screen.json` format or `renderScreenToHTML()` pipeline
- **Replace only the authoring UX** — tree → canvas-first WYSIWYG editor
- **Tree stays as secondary** — outline view for structure, not primary editing

### Open Questions (from WYSIWYG.md)
1. iframe isolation vs. inline rendering for canvas?
2. Component library / reusable templates?
3. CSS flexbox directly or keep simplified model?
4. Data binding layer (mock vs. real data)?
5. Component states (hover/active/disabled styles)?

---

## Files Modified This Session

### Committed (3 commits)
- `2d37b98` feat(editor): add Screen Builder — full integrated screen/layout editor (Batches 1-8)
- `ee071cb` feat(schema): add screens array to project schema + auto-load on import (Batch 9)

### New Files Created
- `editor/src/components/ScreenBuilder.jsx`
- `editor/src/components/screenBuilder/` (11 components)
- `editor/src/hooks/useWidgetTree.js`, `useScreenFiles.js`, `useScreenPreview.js`
- `editor/src/store/slices/screenBuilderSlice.js`
- `editor/src/utils/screenSchema.js`, `screenValidator.js`, `screenFiles.js`, `dragDropUtils.js`, `previewData.js`
- `editor/tests/screen-schema.test.js`, `screen-builder-slice.test.js`, `screen-builder-shell.test.jsx`, `screen-files.test.js`, `drag-drop-utils.test.js`, `preview-data.test.js`
- `test-screens/screen.test.hud.json`, `screen.test.inventory.json`
- `docs/screen-builder-how-to-use.md`
- `docs/WYSIWYG.md`

### Modified Files
- `editor/src/App.jsx` — lazy-loaded ScreenBuilder, viewMode toggle
- `editor/src/components/Toolbar.jsx` — [Screens] button
- `editor/src/store/useStore.js` — viewMode, setViewMode, loadScreens wiring
- `schema/project.schema.json` — nav on screen_config, screens array definition, interactive_widget fix

---

## Next Steps

### High Priority
1. **WYSIWYG Phase 1** — Canvas Renderer: render `*.screen.json` to a large scrollable canvas div using existing `renderScreenToHTML()`
2. **WYSIWYG Phase 2** — Selection Overlay: transparent overlay divs per widget region, blue border on selected, resize handles
3. **WYSIWYG Phase 3** — Drag from palette: HTML5 drag from palette sidebar onto canvas, drop indicator

### Medium Priority
4. **WYSIWYG Phase 4** — Move and reorder on canvas
5. **WYSIWYG Phase 5** — Resize handles
6. **WYSIWYG Phase 6** — Inline text editing (double-click)
7. **WYSIWYG Phase 7** — Live property panel binding
8. **WYSIWYG Phase 8** — Undo/redo stack

### Investigation Needed
- Check if `renderScreenToHTML()` produces DOM that can be overlaid with transparent hit-detection divs
- iframe vs. inline approach for canvas isolation
- How to handle the data binding layer (mock data for design vs. live data at runtime)

---

## Test Results
- **224/224 tests passing**
- **Clean production build**

## User Context
- User is very positive about the engine/node editor
- Screen Builder felt opaque and scary
- User has GitHub Copilot tokens available for use in OpenCode
- Vision: "full incremental game IDE with nodes, groups, screen design" — screen design needs to match the quality of the node editor
