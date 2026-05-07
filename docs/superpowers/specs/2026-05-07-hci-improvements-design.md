# HCI Improvements — Design Spec
**Date:** 2026-05-07  
**Project:** LOXODON Pizza Logger PWA  
**Scope:** Top-section interaction redesign + feedback system improvements

---

## Problem Statement

The app is primarily used on a mobile phone at a busy pizza stand (live logging) and secondarily on desktop for review. The current interaction model has seven confirmed UX pain points — two critical, two high, two medium, one low — documented in the HCI audit. This spec covers all seven.

---

## What Changes

### 1. Order panel — segmented control + single LOG button

**Replaces:** The `.order-details` card + `.actions` div with three separate log buttons.

**New structure:**

```
[ Slice | Combo | Drink ]   ← segmented control, always visible

  When Slice is selected:
    Pizza Flavor [dropdown]
    Drink        [dropdown]

  When Combo is selected:
    Flavor 1 [dropdown]   Flavor 2 [dropdown]   ← side-by-side
    Drink    [dropdown]

  When Drink is selected:
    Drink [dropdown]

[ LOG SLICE — $2.50 ]   ← single button, label updates with type + price
```

- No emojis in labels or button text.
- Selected type persists in a module-level `let selectedType = 'Slice'` variable.
- `setItemType(type)` updates `selectedType`, updates the LOG button label, and shows/hides the relevant field groups.
- `handleLog()` reads `selectedType` and the current field values, then calls `logSale()`.
- The three `mousedown` / `touchstart` / `focus` / `click` listeners on the old buttons are removed entirely.

### 2. Live revenue in the header

**Replaces:** The `summaryRevenue` value in the summary card (which moves to the compact summary row; see §5).

- The `.app-header` becomes a flex row: title on the left, revenue on the right.
- A new `<span id="headerRevenue">` element is added to the header.
- `updateSummary()` also updates `headerRevenue`.
- Revenue is always visible regardless of scroll position.

### 3. Undo toast — replaces confirm() on per-row deletes

**Replaces:** The `confirm('Are you sure...')` inside the `logTableBody` click delegate.

**Toast text format by type:**
- Slice: `"Logged Slice — [Flavor 1]"`
- Combo: `"Logged Combo — [Flavor 1] + [Flavor 2]"`
- Drink: `"Logged Drink — [Drink]"`

**Behaviour:**
- Immediately after `logSale()`, an undo toast appears below the compact summary row: `"[toast text]  [UNDO]"`
- A CSS `@keyframes` width animation on a progress bar element runs from 100% to 0% over 5 seconds.
- If UNDO is tapped: the most-recently-added sale is removed from `salesData`, `saveSalesData()` and `renderLogTable()` are called, the toast is dismissed.
- If 5 seconds elapse without UNDO: the toast dismisses itself; the sale is already committed.
- Only one pending undo exists at a time. Logging a new sale while a toast is active silently commits the previous one and starts a fresh 5-second window.
- Module-level state: `let _undoTimeout = null` and `let _pendingUndoIndex = null`.
- Per-row delete in the table no longer shows `confirm()` — it deletes immediately (the table is the after-the-fact record; undo handles the accidental-tap case at the point of logging).

### 4. Inline two-step confirmation for bulk destructive actions

**Replaces:** `confirm()` in `clearLogs()` and `resetSettings()`.

**Pattern:**
- First click: button text changes to `"Tap again to confirm"` and a 3-second timeout starts.
- Second click within 3 seconds: action executes.
- If no second click within 3 seconds: button text reverts to original.
- `clearCacheAndReload()` keeps its existing `confirm()` — it is buried in the Advanced section, used rarely, and has higher stakes.

### 5. Compact summary row

**Replaces:** The `.summary` card with `.summary-grid`.

- Four-stat horizontal strip: Slices | Combos | Drinks | Total Items.
- Positioned directly below the LOG button. The undo toast area appears below this strip.
- Total Revenue is removed from this strip — it lives in the header (§2).
- Compact enough to stay on-screen without scrolling on a standard phone.
- Existing `summarySlices`, `summaryCombos`, `summaryDrinks`, `summaryTotal` element IDs are reused; `summaryRevenue` ID is repurposed to `headerRevenue` in the header.

### 6. Touch target fix for config chip remove buttons

**Current:** `.config-remove-btn` is styled at `18×18px`.  
**Fix:** Increase padding so the tap target is at least `44×44px` while keeping the visible `×` glyph the same size. Use:
```css
.config-remove-btn {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* visual size of × unchanged */
}
```

### 7. aria-live on status message

Add `aria-live="polite" aria-atomic="true"` to `#statusMessage` in `index.html`. No logic changes.

---

## What Does Not Change

- The sales log table structure, columns, and data-label mobile stacking.
- The Settings `<details>` panel and all flavor/drink config logic.
- Export CSV and Clear All Logs buttons (confirmation mechanism changes per §4, button positions do not).
- The Advanced / Clear Cache section.
- All `localStorage` data storage logic and the data model schema.
- The service worker logic and the list of cached URLs.
- The Oswald font, color tokens in `:root`, and overall brand.

---

## Files Affected

| File | Change |
|---|---|
| `index.html` | Replace `.order-details` + `.actions` with `.order-panel`; add segmented control + LOG button; add `headerRevenue` to header; add compact summary strip; add `aria-live` to `#statusMessage`; add undo toast container |
| `app.js` | Remove `setMode()`, `handleLogSlice/Combo/Drink()`, 9 old event listeners; add `setItemType()`, `handleLog()`, `showUndoToast()`, `dismissUndoToast()`; add inline confirm pattern to `clearLogs()` and `resetSettings()`; update `updateSummary()` to write `headerRevenue` |
| `style.css` | Add segmented control, LOG button, toast, compact summary, header flex layout styles; remove old `.actions` button styles; fix `.config-remove-btn` touch target |
| `service-worker.js` | Bump cache version string (CSS asset changes) |

---

## Edge Cases

- **Logging with an empty flavor list:** `populateSelects()` ensures selects always have at least one option; `setItemType()` reads whatever is currently selected.
- **Undo after export:** Undo only affects in-memory `salesData` and `localStorage`; a CSV that was already exported is unaffected.
- **Two-step confirm timeout:** If the user navigates away from the page mid-confirm, the button reverts harmlessly on next render.
- **Very fast consecutive taps:** The existing `_logPending` 400ms debounce on `logSale()` is preserved. The undo toast window resets on each new log.
