# Screen Builder — How to Use

The Screen Builder lets you design UI screens for your game (think: inventory, HUD, menus) using a tree-based editor — no code required. Each screen is a tree of **widgets** (boxes, labels, buttons, etc.) that the game's layout engine renders.

---

## Opening the Screen Builder

In the editor toolbar, click the **Screens** button (rightmost pill):

```
[ Nodes ] [ Groups ] [ Screens ]
```

This switches from the node/graph canvas to the Screen Builder.

---

## Screens vs. Widgets

- **Screen** — a full UI panel (e.g. "Inventory", "HUD"). Lives in a `.screen.json` file.
- **Widget** — a single UI element inside a screen (a button, a label, a box that holds other widgets).

Think of it like a document outline: the screen is the root, widgets are the nested branches.

---

## The Three Panels

### Left: Widget Tree
Shows the full widget hierarchy of the active screen. This is where you build the structure.

### Center: Preview
Live preview of how the screen looks. Updates as you edit.

### Right: Properties
Edit the selected widget's fields (label text, gap size, button actions, etc.)

---

## Creating a Screen

1. Click **+ New** in the toolbar
2. Type a name (e.g. "Inventory")
3. Press **Enter** or click **Create**
4. A new screen tab appears. Click it to switch between screens.

---

## Building the Widget Tree

### Adding Widgets

**Right-click** any container widget (vbox, hbox, grid, stack) → a menu appears:
- **Add child →** pick a widget type

Widget types:
| Type | What it does |
|------|-------------|
| `vbox` | Vertical column of children |
| `hbox` | Horizontal row of children |
| `grid` | Multi-column grid (set columns in Properties) |
| `stack` | Stack of children on top of each other |
| `label` | Plain text |
| `textbutton` | Clickable text button |
| `iconbutton` | Clickable icon button |
| `textinput` | Text input field |
| `progressbar` | A progress bar |
| `image` | An image |
| `spacer` | Empty space used for layout |

### Reordering / Moving Widgets

**Drag** any tree row and drop it:
- **Drop on top half** of a widget → insert before it
- **Drop on bottom half** → insert after it
- **Drop on a container** (vbox/hbox/grid/stack) → move inside it

### Deleting a Widget
Right-click → **Delete**, or select it and press `Delete`.

### Duplicating
Right-click → **Duplicate** — copies the widget and all its children.

### Wrapping
Right-click → **Wrap in →** pick a container type. The widget becomes a child of a new container. Useful for grouping.

---

## Editing Widget Properties

1. **Click** any widget in the tree (or preview) to select it
2. The **Properties panel** (right) shows all editable fields

Common fields:
| Widget | Important fields |
|--------|----------------|
| `vbox` / `hbox` / `grid` | `gap` (spacing), `align` (start/center/end) |
| `grid` | `columns` (how many per row) |
| `label` | `text` — the displayed text |
| `textbutton` | `label` (button text), `action` (what happens on click) |
| `iconbutton` | `icon` (emoji or text), `action` |
| `progressbar` | `value` (current), `max` (maximum), `color` |
| `image` | `src` (image URL), `width`, `height` |
| `spacer` | `width`, `height` |
| **All widgets** | `style` → CSS overrides (e.g. `color`, `background`) |

### Style Overrides
Click **+ Add style** in the Properties panel to add CSS overrides. Common ones:
- `color` — text color (e.g. `#ffdd44`)
- `background` — background color
- `padding` — inner spacing

---

## Navigation Settings (Nav Settings panel)

When a screen is selected, the right panel shows **Nav Settings**:

- **Toolbar** — toggle on to show this screen as a button in the game's toolbar
- **Hotkey** — keyboard shortcut to open this screen (e.g. `I` for inventory)
- **Group** — which toolbar group: `main`, `secondary`, or `debug`

---

## Saving and Loading

### Saving the active screen
Click **Save** → downloads the screen as a `.screen.json` file.

### Loading screens
Click **Load** → select one or more `.screen.json` files to import them.

### Screens in project.json
You can also paste screen definitions **inline** inside `project.json` under a `screens` key — useful for keeping everything in one file:

```json
{
  "meta": { "schema_version": "1.2.0", "title": "My Game", "author": "..." },
  "screens": [
    {
      "id": "inventory",
      "name": "Inventory",
      "nav": { "toolbar": true, "hotkey": "I", "group": "main" },
      "layout": { "type": "vbox", "gap": 8, "children": [...] }
    }
  ]
}
```

When you import this project.json, all inline screens load automatically.

---

## Validation

The Screen Builder validates your screens in real-time. Issues appear below the toolbar:

- 🔴 **Errors** (red) — something is wrong (bad type, missing field, duplicate ID)
- 🟡 **Warnings** (yellow) — something might be wrong (e.g. a button with no action)

Click a warning/error to select the relevant widget.

---

## Preview Data Sources

The toolbar above the preview has three toggles:

- **Live** — use actual game data (for real gameplay)
- **Mock** — use mock/sample data (for design without a running game)
- **Snapshot** — use a static snapshot you can edit

---

## Tips

- **Start with a container** (vbox or hbox) as your root, then nest boxes and widgets inside
- Use `spacer` widgets to push other widgets around
- Use `grid` for evenly-spaced grids of buttons or items
- Set `wrap: true` on an `hbox` to make items wrap to the next line automatically
- Give each button an `action` string (e.g. `open:inventory`) so the game knows what to do when clicked
