# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pizza Logger is a vanilla JavaScript PWA for logging pizza stand sales. It has no build system, no package manager, and no framework — just `index.html`, `app.js`, `style.css`, `manifest.json`, and `service-worker.js` deployed directly via GitHub Pages.

## Development

**To run locally:** Open `index.html` in a browser, or use any static file server:
```sh
python3 -m http.server 8080
# or
npx serve .
```

Service workers require HTTPS or `localhost` — the Python server approach works fine for testing.

**To deploy:** Push to `master`. GitHub Pages serves directly from the root of this branch.

## Architecture

All application logic lives in [app.js](app.js). There is no module system — it runs as a single script in `'use strict'` mode.

**Data model** (stored as JSON array under `localStorage` key `pizzaSales`):
```json
{ "Timestamp": "<ISO string>", "Item": "Slice|Combo|Drink", "Pizza Flavor 1": "...", "Pizza Flavor 2": "...", "Drink": "...", "Price": 2.50 }
```

**Hardcoded prices:** Slice = $2.50, Combo = $5.00, Drink = $1.00.

**Rendering:** The table is fully re-rendered from the `salesData` array on every mutation (`renderLogTable()`). Delete buttons use event delegation on `logTableBody` rather than per-row listeners.

## Service Worker Cache

The cache version is `pizza-logger-cache-v1` in [service-worker.js](service-worker.js). **When changing any cached asset, bump this version string** — otherwise existing users will be served stale files until they manually clear cache. The app provides a "Clear Cache & Reload" button that unregisters the SW and deletes all caches for this reason.

The SW caches: `/`, `/index.html`, `/style.css`, `/app.js`, `/manifest.json`. Icons under `images/` are not cached.
