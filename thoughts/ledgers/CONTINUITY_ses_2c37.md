# Session: ses_2c37
Updated: 2026-03-31T00:00:00

## Goal
Implement WYSIWYG canvas-first screen editor to replace the opaque tree-based editing UX.

## Constraints
- Keep existing `*.screen.json` format unchanged
- Keep `renderScreenToHTML()` pipeline intact
- Replace only the authoring UX (tree → canvas)
- Tree becomes secondary outline view

## Progress
### Done
- [x] Screen Builder Batches 1-9 (tree-based widget editor, 224/224 tests passing)
- [x] Schema integration (screens array in project.schema.json)
- [x] WYSIWYG redesign planned (docs/WYSIWYG.md written)
- [x] GitHub Copilot integration available for this work

### In Progress
- [ ] WYSIWYG Phase 1 — Canvas Renderer (render *.screen.json to scrollable canvas)

### Blocked
- None currently

## Key Decisions
- **Keep existing schema and engine rendering**: Don't change `*.screen.json` format or `renderScreenToHTML()` pipeline
- **Replace only the authoring UX**: Tree → canvas-first WYSIWYG editor
- **Tree stays as secondary**: Outline view for structure, not primary editing

## Next Steps
1. **WYSIWYG Phase 1** — Canvas Renderer: render `*.screen.json` to a large scrollable canvas div using existing `renderScreenToHTML()`
2. **WYSIWYG Phase 2** — Selection Overlay: transparent overlay divs per widget region, blue border on selected, resize handles
3. **WYSIWYG Phase 3** — Drag from palette: HTML5 drag from palette sidebar onto canvas, drop indicator
4. **WYSIWYG Phase 4** — Move and reorder on canvas
5. **WYSIWYG Phase 5** — Resize handles
6. **WYSIWYG Phase 6** — Inline text editing (double-click)
7. **WYSIWYG Phase 7** — Live property panel binding
8. **WYSIWYG Phase 8** — Undo/redo stack

## Open Questions
1. iframe isolation vs. inline rendering for canvas?
2. Component library / reusable templates?
3. CSS flexbox directly or keep simplified model?
4. Data binding layer (mock vs. real data)?
5. Component states (hover/active/disabled styles)?
6. Check if `renderScreenToHTML()` produces DOM that can be overlaid with transparent hit-detection divs

## File Operations
### Read
- `docs/WYSIWYG.md`
- `editor/src/components/ScreenBuilder.jsx`
- `editor/src/hooks/useWidgetTree.js`
- `schema/project.schema.json`

### Modified
- None yet (WYSIWYG implementation not started)

## Critical Context
- User feedback: "even looking at it for 1h I have no idea what it's going to look in the engine" — WYSIWYG needed
- User is positive about the engine/node editor quality
- Vision: "full incremental game IDE with nodes, groups, screen design" — screen design needs to match node editor quality
- User has GitHub Copilot tokens available

## Working Set
- Branch: UNKNOWN (check git status)
- Key files: `docs/WYSIWYG.md`, `editor/src/components/ScreenBuilder.jsx`, `schema/project.schema.json`
