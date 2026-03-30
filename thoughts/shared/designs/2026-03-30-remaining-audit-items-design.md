---
date: 2026-03-30
topic: "Remaining Audit Items"
status: validated
---

## Problem Statement

We have three audit items left: convert the engine runtime to class-owned state, verify ignore rules, and reduce the editor bundle warning.

The goal is to finish these with the smallest safe surface area, preserving current behavior and keeping the editor UX stable.

## Constraints

- **Engine behavior must not change**: gameplay, save/load, and render timing stay equivalent.
- **Stateful systems stay injected**: the existing engine systems already accept `state`, so we should not spread engine ownership outward.
- **Editor UX stays intact**: toolbar, canvas, inspector, and modal behavior should feel the same.
- **The bundle fix must be real**: we should split code, not just hide the warning.
- **`.gitignore` is already compliant**: root and editor ignore files already cover `node_modules` and `dist`, so this item needs verification only.

## Approach

### Engine refactor

I’m taking the incremental path: move runtime ownership into an `Engine` class, then keep the current module API as a thin compatibility layer.

That gives us class-owned state without forcing a broad rewrite of `engine/index.html` or the system modules.

### Code splitting

I’m splitting only the UI surfaces that are already conditional at runtime:

- **Group view** when the canvas switches modes
- **Toolbar modals** that only open on demand
- **Inspector forms** that depend on the selected node type

This is the best fit because it cuts the initial bundle where the app already has natural loading boundaries.

### Ignore rules

No file change is needed unless verification shows a gap. The audit item is effectively done already.

## Architecture

The engine module becomes a class-backed runtime with one live instance.

The editor app remains a single shell, but its secondary panes become lazy-loaded chunks so the initial load stays focused on the core canvas and toolbar.

## Components

### Engine core

- Owns live engine state
- Owns the tick loop and render callback
- Produces snapshots and exposes actions through the same contract the UI already uses

### Engine compatibility layer

- Preserves the existing imports used by the browser entry point
- Keeps the refactor low risk while the rest of the app stays unchanged

### Lazy editor surfaces

- Group canvas view
- Compile, tuning, and blueprint modals
- Inspector form modules by node type

### Fallback surfaces

- Lightweight loading placeholders
- Layout-preserving empty states so the app never feels broken during chunk loads

## Data Flow

1. The browser entry point initializes the editor shell.
2. The engine wrapper hands work to the class-owned runtime.
3. User actions continue to flow through the existing toolbar and inspector paths.
4. Secondary UI modules load only when the user needs them.
5. The build output should now split into smaller chunks instead of one oversized main asset.

## Error Handling

- **Engine init/stop** remains defensive so repeated lifecycle calls are safe.
- **Lazy components** use loading fallbacks rather than blocking the shell.
- **Inspector and modal loads** should fail closed with readable placeholders, not crash the whole editor.
- **Build verification** is the final gate: if the warning persists, we revisit chunk boundaries rather than suppressing the message.

## Testing Strategy

- **Engine tests** for lifecycle, snapshot stability, and action behavior under the new class ownership.
- **Editor smoke build** to confirm the chunk warning is gone or meaningfully reduced.
- **UI path checks** for the lazy-loaded group view, modals, and inspector forms.
- **Repository check** for `.gitignore` coverage, with no expected file changes.

## Open Questions

- If lazy-loading the editor surfaces is still not enough, we may need a second pass with explicit vendor chunking.
- If we want to simplify later, we can eventually drop the compatibility layer and make the browser entry point construct the engine instance directly.
