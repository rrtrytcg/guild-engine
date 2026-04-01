# Guild Engine

Guild Engine is a browser-based graph editor and runtime for building incremental RPG projects.

![Simple forge setup](docs/illustrations/simple%20forge%20setup.png)

## Repository layout

- `editor/` — React 19 + Vite editor UI
- `engine/` — vanilla JavaScript runtime
- `schema/` — JSON Schema for project data
- `docs/` — project docs and design notes
- `thoughts/` — plans, ledgers, and session notes

## Editor development

```bash
cd editor
npm install
npm run dev
```

### Tests and build

```bash
cd editor
npm test
npm run build
```

## Runtime

Open `engine/index.html` through a local server.

## License

This repository is licensed under CC BY-NC-SA 4.0. See `LICENSE`.
