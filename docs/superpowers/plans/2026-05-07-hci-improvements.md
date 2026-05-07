# HCI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Pizza Logger's order panel for fast mobile logging and fix all seven confirmed HCI pain points without touching the data model, settings logic, or log table.

**Architecture:** Six focused commits, each leaving the app in a working state. Tasks 1–2 restructure the static HTML/CSS/JS together. Tasks 3–4 add JS-only behaviour on top of the new structure. Tasks 5–6 are polish and cache housekeeping.

**Tech Stack:** Vanilla JavaScript (strict mode), HTML5, CSS3 custom properties, PWA service worker. No build system — test by opening `index.html` via `python3 -m http.server 8080`.

---

### Task 1: Header live revenue

Adds `headerRevenue` to the fixed header so total revenue is always visible regardless of scroll position. Pure additive — nothing is removed yet.

**Files:**
- Modify: `index.html` (header element)
- Modify: `style.css` (`.app-header`, new `.header-revenue` rules, `.app-header h1`)
- Modify: `app.js` (DOM refs section, `updateSummary()`)

- [ ] **Step 1: Add revenue elements to the header in `index.html`**

Replace:
```html
    <header class="app-header">
        <h1>LOXODON Pizza Stand Sales Logger</h1>
    </header>
```
With:
```html
    <header class="app-header">
        <h1>LOXODON Pizza Stand Sales Logger</h1>
        <div class="header-revenue">
            <span class="header-revenue-label">Revenue</span>
            <span class="header-revenue-value" id="headerRevenue">$0.00</span>
        </div>
    </header>
```

- [ ] **Step 2: Update header styles in `style.css`**

Replace the existing `.app-header` rule:
```css
.app-header {
    background-color: var(--color-brand);
    padding: calc(18px + env(safe-area-inset-top)) 20px 14px;
    border-bottom: 4px solid #8e1b0e;
    margin-bottom: 20px;
}
```
With:
```css
.app-header {
    background-color: var(--color-brand);
    padding: calc(18px + env(safe-area-inset-top)) 20px 14px;
    border-bottom: 4px solid #8e1b0e;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
}

.header-revenue {
    text-align: right;
    flex-shrink: 0;
}

.header-revenue-label {
    display: block;
    font-size: 0.68rem;
    color: rgba(255,255,255,0.75);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 2px;
}

.header-revenue-value {
    display: block;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    font-family: 'Oswald', system-ui, sans-serif;
    line-height: 1;
}
```

Also update `.app-header h1` to add `flex: 1; min-width: 0;` so it shrinks before the revenue display does:
```css
.app-header h1 {
    font-family: 'Oswald', system-ui, sans-serif;
    font-weight: 700;
    font-size: clamp(1.4rem, 5vw, 2rem);
    color: #ffffff;
    text-align: left;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
    flex: 1;
    min-width: 0;
}
```

- [ ] **Step 3: Update DOM reference and `updateSummary()` in `app.js`**

In the `--- DOM Elements ---` section, replace:
```javascript
const summaryRevenue = document.getElementById('summaryRevenue');
```
With:
```javascript
const headerRevenue  = document.getElementById('headerRevenue');
```

In `updateSummary()`, replace:
```javascript
    summaryRevenue.textContent = '$' + (revenue / 100).toFixed(2);
```
With:
```javascript
    headerRevenue.textContent = '$' + (revenue / 100).toFixed(2);
```

- [ ] **Step 4: Verify**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Expected:
- The header shows "Revenue  $0.00" on the right, title on the left
- Log a Slice — header Revenue updates to "$2.50"
- Log another — header shows "$5.00"
- The old `.summary` card still shows stale revenue — that is expected; it is removed in Task 2
- Console: no errors

- [ ] **Step 5: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: add live revenue display to header"
```

---

### Task 2: Order panel — segmented control, compact summary, undo toast container

The largest structural change. Replaces the `.order-details` card, `.actions` buttons, and `.summary` card with a single `.order-panel`. Also wires all new JS.

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `style.css`

- [ ] **Step 1: Replace the order section HTML in `index.html`**

The section to replace begins immediately inside `<main>` and ends after `</div><!-- .summary -->`. Remove this entire range:
```html
        <div class="order-details">
            <h2>Order Details</h2>
            <div id="flavor1Field">
                <label for="flavor1">Pizza Flavor 1:</label>
                <select id="flavor1">
                </select>
            </div>

            <div id="flavor2Field">
                <label for="flavor2">Pizza Flavor 2 (for Combo):</label>
                <select id="flavor2">
                </select>
            </div>

            <div id="drinkField">
                <label for="drink">Drink (for Combo/Drink):</label>
                <select id="drink">
                </select>
            </div>
        </div>

        <div class="actions">
            <button id="logSlice">Log 1 Slice ($2.50)</button>
            <button id="logCombo">Log Combo ($5.00)</button>
            <button id="logDrink">Log Drink ($1.00)</button>
        </div>
```

And further down, remove the entire `.summary` card:
```html
        <div class="summary" id="summaryCard">
            <h2>Session Summary</h2>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">Total Revenue</span>
                    <span class="summary-value" id="summaryRevenue">$0.00</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Slices</span>
                    <span class="summary-value" id="summarySlices">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Combos</span>
                    <span class="summary-value" id="summaryCombos">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Drinks</span>
                    <span class="summary-value" id="summaryDrinks">0</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Total Sales</span>
                    <span class="summary-value" id="summaryTotal">0</span>
                </div>
            </div>
        </div>
```

In their place (at the top of `<main>`, before the `.status` div), insert:
```html
        <div class="order-panel">
            <div class="seg-control" id="itemTypeControl">
                <button class="seg-btn active" data-type="Slice">Slice</button>
                <button class="seg-btn" data-type="Combo">Combo</button>
                <button class="seg-btn" data-type="Drink">Drink</button>
            </div>
            <div class="order-fields">
                <div class="flavor-pair-row" id="flavorPairRow">
                    <div class="field-group" id="flavor1Group">
                        <label for="flavor1" id="flavor1Label">Pizza Flavor</label>
                        <select id="flavor1"></select>
                    </div>
                    <div class="field-group" id="flavor2Group" style="display:none">
                        <label for="flavor2">Flavor 2</label>
                        <select id="flavor2"></select>
                    </div>
                </div>
                <div class="field-group" id="drinkGroup">
                    <label for="drink">Drink</label>
                    <select id="drink"></select>
                </div>
            </div>
            <button id="logButton" class="log-btn">Log Slice &#8212; $2.50</button>
            <div class="compact-summary">
                <div class="compact-stat">
                    <span class="compact-stat-label">Slices</span>
                    <span class="compact-stat-value" id="summarySlices">0</span>
                </div>
                <div class="compact-stat">
                    <span class="compact-stat-label">Combos</span>
                    <span class="compact-stat-value" id="summaryCombos">0</span>
                </div>
                <div class="compact-stat">
                    <span class="compact-stat-label">Drinks</span>
                    <span class="compact-stat-value" id="summaryDrinks">0</span>
                </div>
                <div class="compact-stat">
                    <span class="compact-stat-label">Total</span>
                    <span class="compact-stat-value" id="summaryTotal">0</span>
                </div>
            </div>
            <div id="undoToast" class="undo-toast" style="display:none">
                <span id="undoToastText" class="undo-toast-text"></span>
                <button id="undoButton" class="undo-btn">Undo</button>
                <div class="undo-progress">
                    <div id="undoProgressBar" class="undo-progress-bar"></div>
                </div>
            </div>
        </div>
```

- [ ] **Step 2: Update `style.css` — remove old rules**

Remove these rule blocks entirely (search for each selector and delete the full block):
- `.order-details` and `.order-details h2`
- `.actions`, `.actions button`, `.actions button:hover`, `.actions button:active`
- The full `@media screen and (max-width: 400px)` block (the one that stacks `.actions` buttons vertically)
- `.summary`, `.summary h2`, `.summary-grid`, `.summary-item`, `.summary-label`, `.summary-value`, `#summaryRevenue`

- [ ] **Step 3: Update `style.css` — add new rules**

After the `/* ── Cards ── */` section (after `.log-display h2`), add:

```css
/* ── Order panel ── */
.order-panel {
    background-color: var(--color-surface);
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    border: 4px solid var(--color-primary);
}

.seg-control {
    display: flex;
    border: 2px solid var(--color-primary);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 14px;
}

.seg-btn {
    flex: 1;
    padding: 10px 8px;
    background: var(--color-surface);
    color: var(--color-primary);
    border: none;
    border-right: 1.5px solid var(--color-border);
    font-family: inherit;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.1s ease, color 0.1s ease;
    touch-action: manipulation;
    min-height: 44px;
}

.seg-btn:last-child { border-right: none; }

.seg-btn.active {
    background: var(--color-primary);
    color: #fff;
}

.seg-btn:hover:not(.active) {
    background: var(--color-bg);
}

.order-fields {
    margin-bottom: 10px;
}

.flavor-pair-row {
    display: block;
}

.flavor-pair-row.two-col {
    display: flex;
    gap: 10px;
}

.flavor-pair-row.two-col .field-group {
    flex: 1;
}

.field-group {
    margin-bottom: 10px;
}

.field-group label {
    display: block;
    margin-top: 0;
    margin-bottom: 5px;
    color: var(--color-label);
    font-weight: 600;
    font-size: 0.9rem;
}

.field-group select {
    width: 100%;
    padding: 10px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-sizing: border-box;
    background-color: #fffdf8;
    color: var(--color-text);
    font-size: 1rem;
    margin-bottom: 0;
}

.field-group select:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
    border-color: var(--color-primary);
}

.log-btn {
    width: 100%;
    background-color: var(--color-primary);
    color: #ffffff;
    font-weight: 700;
    font-size: 1.1rem;
    padding: 16px 10px;
    border-radius: 6px;
    min-height: 56px;
    box-shadow: 0 3px 0 #9e2507;
    letter-spacing: 0.02em;
    touch-action: manipulation;
    cursor: pointer;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.log-btn:hover { background-color: var(--color-primary-hover); }

.log-btn:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #9e2507;
}

/* ── Compact summary strip ── */
.compact-summary {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.compact-stat {
    flex: 1;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 4px;
    text-align: center;
}

.compact-stat-label {
    display: block;
    font-size: 0.7rem;
    color: var(--color-label);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 3px;
}

.compact-stat-value {
    display: block;
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
}

/* ── Undo toast ── */
.undo-toast {
    align-items: center;
    gap: 10px;
    background: var(--color-secondary);
    color: #fff;
    border-radius: 8px;
    padding: 10px 14px 13px;
    margin-top: 10px;
    position: relative;
    flex-wrap: nowrap;
}

.undo-toast-text {
    flex: 1;
    font-size: 0.88rem;
    line-height: 1.3;
}

.undo-btn {
    background: var(--color-primary);
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    min-height: 36px;
    font-family: inherit;
    touch-action: manipulation;
}

.undo-btn:hover { background: var(--color-primary-hover); }

.undo-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255,255,255,0.2);
    border-radius: 0 0 8px 8px;
    overflow: hidden;
}

.undo-progress-bar {
    height: 100%;
    background: rgba(255,255,255,0.6);
    border-radius: 0 0 8px 8px;
    width: 100%;
}

@keyframes undoCountdown {
    from { width: 100%; }
    to   { width: 0%; }
}
```

- [ ] **Step 4: Update `app.js` — remove old DOM refs, functions, and listeners**

In `--- DOM Elements ---`, remove these six lines:
```javascript
const logSliceButton = document.getElementById('logSlice');
const logComboButton = document.getElementById('logCombo');
const logDrinkButton = document.getElementById('logDrink');
const flavor1Field = document.getElementById('flavor1Field');
const flavor2Field = document.getElementById('flavor2Field');
const drinkField   = document.getElementById('drinkField');
```

Remove the `setMode()` function:
```javascript
function setMode(mode) {
    flavor2Field.style.display = (mode === 'combo') ? '' : 'none';
}
```

Remove `handleLogSlice()`, `handleLogCombo()`, and `handleLogDrink()`.

In `--- Event Listeners ---`, remove all 12 listeners on the old buttons — the block from `logSliceButton.addEventListener('click', handleLogSlice)` through `logDrinkButton.addEventListener('focus', () => setMode('drink'))`.

- [ ] **Step 5: Update `app.js` — add new state, functions, and listeners**

After `let _logPending = false;`, add:
```javascript
let selectedType = 'Slice';
```

Replace `updateButtonLabels()` entirely:
```javascript
function updateButtonLabels() {
    document.getElementById('logButton').textContent =
        'Log ' + selectedType + ' — $' + config.prices[selectedType].toFixed(2);
}
```

Add `setItemType()` immediately after `updateButtonLabels()`:
```javascript
function setItemType(type) {
    selectedType = type;

    document.querySelectorAll('.seg-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    var flavor1Group  = document.getElementById('flavor1Group');
    var flavor2Group  = document.getElementById('flavor2Group');
    var drinkGroup    = document.getElementById('drinkGroup');
    var flavor1Label  = document.getElementById('flavor1Label');
    var flavorPairRow = document.getElementById('flavorPairRow');

    if (type === 'Slice') {
        flavor1Group.style.display  = '';
        flavor2Group.style.display  = 'none';
        drinkGroup.style.display    = '';
        flavor1Label.textContent    = 'Pizza Flavor';
        flavorPairRow.classList.remove('two-col');
    } else if (type === 'Combo') {
        flavor1Group.style.display  = '';
        flavor2Group.style.display  = '';
        drinkGroup.style.display    = '';
        flavor1Label.textContent    = 'Flavor 1';
        flavorPairRow.classList.add('two-col');
    } else {
        flavor1Group.style.display  = 'none';
        flavor2Group.style.display  = 'none';
        drinkGroup.style.display    = '';
    }

    updateButtonLabels();
}
```

Add `handleLog()` after `setItemType()`:
```javascript
function handleLog() {
    if (selectedType === 'Slice') {
        logSale('Slice', config.prices.Slice, flavor1Select.value);
    } else if (selectedType === 'Combo') {
        logSale('Combo', config.prices.Combo, flavor1Select.value, flavor2Select.value, drinkSelect.value);
    } else {
        logSale('Drink', config.prices.Drink, '', '', drinkSelect.value);
    }
}
```

In `--- Event Listeners ---`, add:
```javascript
document.getElementById('itemTypeControl').addEventListener('click', function(e) {
    var btn = e.target.closest('.seg-btn');
    if (btn) setItemType(btn.dataset.type);
});

document.getElementById('logButton').addEventListener('click', handleLog);
```

- [ ] **Step 6: Update the `--- Initial Setup ---` block in `app.js`**

Replace:
```javascript
renderLogTable();
setMode('slice');
populateSelects();
updateButtonLabels();
renderSettingsPanel();
updateStatus('Application loaded. Previous logs restored.');
```
With:
```javascript
renderLogTable();
populateSelects();
setItemType('Slice');
renderSettingsPanel();
updateStatus('Application loaded. Previous logs restored.');
```

- [ ] **Step 7: Verify**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Expected:
- Segmented control shows "Slice | Combo | Drink"; Slice is highlighted
- Slice mode: one "Pizza Flavor" dropdown + "Drink" dropdown visible; LOG button reads "Log Slice — $2.50"
- Tap Combo: "Flavor 1" and "Flavor 2" dropdowns appear side-by-side + "Drink" below; LOG button reads "Log Combo — $5.00"
- Tap Drink: only "Drink" dropdown visible; LOG button reads "Log Drink — $1.00"
- LOG each type — compact summary counts increment, header revenue updates, status updates
- No old three-button row; no old "Session Summary" card
- Open Settings, change a price, Save — LOG button price label updates immediately
- Console: no errors

- [ ] **Step 8: Commit**

```bash
git add index.html app.js style.css
git commit -m "feat: replace order panel with segmented control and single LOG button"
```

---

### Task 3: Undo toast

Wires the undo toast shown after each `logSale()`. Removes the `confirm()` dialog from per-row deletes — the undo covers accidental taps at the point of logging; table deletes are intentional.

**Files:**
- Modify: `app.js` only

- [ ] **Step 1: Add undo state variables**

After `let selectedType = 'Slice';`, add:
```javascript
let _undoTimeout      = null;
let _pendingUndoIndex = null;
```

- [ ] **Step 2: Add `showUndoToast()` and `dismissUndoToast()`**

Add both functions after `handleLog()`:
```javascript
function showUndoToast(sale, index) {
    if (_undoTimeout) { clearTimeout(_undoTimeout); _undoTimeout = null; }
    _pendingUndoIndex = index;

    var detail = '';
    if (sale.Item === 'Slice')      detail = sale['Pizza Flavor 1'];
    else if (sale.Item === 'Combo') detail = sale['Pizza Flavor 1'] + ' + ' + sale['Pizza Flavor 2'];
    else                            detail = sale.Drink;

    document.getElementById('undoToastText').textContent =
        'Logged ' + sale.Item + ' — ' + detail;

    var bar = document.getElementById('undoProgressBar');
    bar.style.animation = 'none';
    bar.offsetHeight; // force reflow to restart animation
    bar.style.animation = 'undoCountdown 5s linear forwards';

    document.getElementById('undoToast').style.display = 'flex';
    _undoTimeout = setTimeout(dismissUndoToast, 5000);
}

function dismissUndoToast() {
    if (_undoTimeout) { clearTimeout(_undoTimeout); _undoTimeout = null; }
    _pendingUndoIndex = null;
    document.getElementById('undoToast').style.display = 'none';
}
```

- [ ] **Step 3: Add `handleUndo()`**

Add immediately after `dismissUndoToast()`:
```javascript
function handleUndo() {
    if (_pendingUndoIndex === null) return;
    var index = _pendingUndoIndex;
    dismissUndoToast();
    salesData.splice(index, 1);
    saveSalesData();
    renderLogTable();
    updateStatus('Sale undone.');
}
```

- [ ] **Step 4: Call `showUndoToast()` from `logSale()`**

In `logSale()`, add one line at the very end of the function body, after `updateStatus(...)`:
```javascript
    showUndoToast(salesData[salesData.length - 1], salesData.length - 1);
```

The closing lines of `logSale()` should now read:
```javascript
    saveSalesData();
    renderLogTable();
    updateStatus('Logged ' + itemType + ' sale.');
    showUndoToast(salesData[salesData.length - 1], salesData.length - 1);
}
```

- [ ] **Step 5: Remove `confirm()` from table row delete and wire the Undo button**

Replace the `logTableBody` event delegate:
```javascript
logTableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const indexToDelete = parseInt(event.target.dataset.index, 10);
        // Optional: Add a confirmation dialog
        if (confirm('Are you sure you want to delete this log entry?')) {
             deleteSale(indexToDelete);
        }
    }
});
```
With:
```javascript
logTableBody.addEventListener('click', function(event) {
    if (event.target.classList.contains('delete-btn')) {
        deleteSale(parseInt(event.target.dataset.index, 10));
    }
});
```

In `--- Event Listeners ---`, add:
```javascript
document.getElementById('undoButton').addEventListener('click', handleUndo);
```

- [ ] **Step 6: Verify**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Expected:
- Log a Slice — toast appears below compact summary: "Logged Slice — Pepperoni  [Undo]" with a shrinking progress bar
- Tap Undo within 5 seconds — sale is removed, table and summary update, toast disappears, status reads "Sale undone."
- Log a Combo — toast reads "Logged Combo — Pepperoni + Cheese"
- Log a Drink — toast reads "Logged Drink — Coca Cola"
- Log two sales in quick succession — first toast replaced by second; first sale stays committed
- Wait 5 seconds without tapping Undo — toast dismisses itself; sale persists in log table
- Click a Delete button in the log table — row is removed immediately, no browser confirm dialog
- Console: no errors

- [ ] **Step 7: Commit**

```bash
git add app.js
git commit -m "feat: add undo toast after each log, remove confirm on table row delete"
```

---

### Task 4: Inline two-step confirmation for bulk destructive actions

Replaces the two remaining `confirm()` dialogs (Clear All Logs, Reset to Defaults) with an in-place two-tap pattern. Clear Cache keeps its `confirm()` — it is rare and high-stakes.

**Files:**
- Modify: `app.js` only

- [ ] **Step 1: Add confirm-state variables**

After `let _pendingUndoIndex = null;`, add:
```javascript
let _clearLogsConfirmTimeout    = null;
let _resetSettingsConfirmTimeout = null;
```

- [ ] **Step 2: Add `const resetSettingsButton` to DOM Elements**

In the `--- DOM Elements ---` section, add alongside the other button refs:
```javascript
const resetSettingsButton = document.getElementById('resetSettings');
```

- [ ] **Step 3: Replace `clearLogs()`**

Replace the entire `clearLogs()` function:
```javascript
function clearLogs() {
    if (_clearLogsConfirmTimeout) {
        clearTimeout(_clearLogsConfirmTimeout);
        _clearLogsConfirmTimeout = null;
        clearLogsButton.textContent = 'Clear All Logs';
        salesData = [];
        localStorage.removeItem('pizzaSales');
        renderLogTable();
        updateStatus('All log entries cleared.');
    } else {
        clearLogsButton.textContent = 'Tap again to confirm';
        _clearLogsConfirmTimeout = setTimeout(function() {
            _clearLogsConfirmTimeout = null;
            clearLogsButton.textContent = 'Clear All Logs';
        }, 3000);
    }
}
```

- [ ] **Step 4: Replace the `resetSettings` event listener**

Replace:
```javascript
document.getElementById('resetSettings').addEventListener('click', () => {
    if (confirm('Reset all settings to factory defaults?')) {
        config = {
            prices:  { ...DEFAULT_CONFIG.prices },
            flavors: [...DEFAULT_CONFIG.flavors],
            drinks:  [...DEFAULT_CONFIG.drinks]
        };
        saveConfig();
        populateSelects();
        updateButtonLabels();
        renderSettingsPanel();
        updateStatus('Settings reset to defaults.');
    }
});
```
With:
```javascript
resetSettingsButton.addEventListener('click', function() {
    if (_resetSettingsConfirmTimeout) {
        clearTimeout(_resetSettingsConfirmTimeout);
        _resetSettingsConfirmTimeout = null;
        resetSettingsButton.textContent = 'Reset to Defaults';
        config = {
            prices:  { ...DEFAULT_CONFIG.prices },
            flavors: [...DEFAULT_CONFIG.flavors],
            drinks:  [...DEFAULT_CONFIG.drinks]
        };
        saveConfig();
        populateSelects();
        updateButtonLabels();
        renderSettingsPanel();
        updateStatus('Settings reset to defaults.');
    } else {
        resetSettingsButton.textContent = 'Tap again to confirm';
        _resetSettingsConfirmTimeout = setTimeout(function() {
            _resetSettingsConfirmTimeout = null;
            resetSettingsButton.textContent = 'Reset to Defaults';
        }, 3000);
    }
});
```

- [ ] **Step 5: Verify**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Expected:
- Log a few sales. Click "Clear All Logs" once — button text changes to "Tap again to confirm"
- Click it again within 3 seconds — logs cleared, table empty, button reverts to "Clear All Logs"
- Click "Clear All Logs" once, then wait 3 seconds without a second click — button reverts without clearing
- Open Settings, click "Reset to Defaults" once — text changes to "Tap again to confirm"
- Click again within 3 seconds — settings reset, button reverts to "Reset to Defaults"
- No browser-native `confirm()` dialogs appear for either action
- "Clear Cache & Reload" (in Advanced) still shows its browser confirm — this is expected
- Console: no errors

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: replace confirm() dialogs with inline two-step confirmation"
```

---

### Task 5: Touch target fix and aria-live

Expands the config chip × tap target to 44×44px using a `::before` pseudo-element (keeps chip visual unchanged). Adds `aria-live` to the status message.

**Files:**
- Modify: `style.css`
- Modify: `index.html`

- [ ] **Step 1: Fix `.config-remove-btn` touch target in `style.css`**

Replace the existing `.config-remove-btn` rule:
```css
.config-remove-btn {
    background: none;
    border: none;
    color: var(--color-danger);
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 0;
    line-height: 1;
    min-height: unset;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
}
```
With:
```css
.config-remove-btn {
    background: none;
    border: none;
    color: var(--color-danger);
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 0;
    line-height: 1;
    min-height: unset;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}

.config-remove-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 44px;
    min-height: 44px;
}
```

The `::before` pseudo-element creates a 44×44px invisible tap area centered on the visible × glyph. The chip visual shape is unchanged.

- [ ] **Step 2: Add `aria-live` to `#statusMessage` in `index.html`**

Replace:
```html
            <p id="statusMessage">Ready.</p>
```
With:
```html
            <p id="statusMessage" aria-live="polite" aria-atomic="true">Ready.</p>
```

- [ ] **Step 3: Verify**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Expected:
- Open Settings. In DevTools → Elements, inspect a `.config-remove-btn`. The computed box is 18×18px visually, but the `::before` pseudoelement box is 44×44px
- Add and remove flavors/drinks — the × tap area is noticeably larger, chip layout unchanged
- Console: no errors

- [ ] **Step 4: Commit**

```bash
git add style.css index.html
git commit -m "fix: expand config chip touch targets to 44px, add aria-live to status"
```

---

### Task 6: Service worker cache version bump

CSS and HTML assets have changed across Tasks 1–5. Existing users will be served stale files until the cache is invalidated.

**Files:**
- Modify: `service-worker.js`

- [ ] **Step 1: Bump the cache version string**

In `service-worker.js`, find and replace the cache name string. Replace:
```javascript
'pizza-logger-cache-v1'
```
With:
```javascript
'pizza-logger-cache-v2'
```

This appears once as a `const` declaration and may also appear in a comment or `console.log` — update all occurrences.

- [ ] **Step 2: Verify cache invalidation**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Open DevTools → Application → Service Workers. Click "Update". Hard-reload (`Cmd+Shift+R`).

Expected:
- DevTools → Application → Cache Storage shows `pizza-logger-cache-v2` (old `v1` entry is gone)
- All assets (HTML, CSS, JS) load correctly from the new cache
- The app works offline after the first load (toggle DevTools → Network → "Offline" to verify)

- [ ] **Step 3: Commit**

```bash
git add service-worker.js
git commit -m "chore: bump service worker cache to v2 for updated assets"
```

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|---|---|
| Segmented control + single LOG button | Task 2 |
| Combo shows two flavor dropdowns side-by-side | Task 2 (setItemType Combo branch) |
| No emojis | Task 2 (HTML + button labels use plain text) |
| Live revenue in header | Task 1 |
| Undo toast with 5s progress bar | Task 3 |
| Toast text format (Slice/Combo/Drink) | Task 3 (`showUndoToast`) |
| Remove confirm() on table row delete | Task 3 |
| Two-step confirm for clearLogs | Task 4 |
| Two-step confirm for resetSettings | Task 4 |
| Compact summary strip (4 stats) | Task 2 (HTML + CSS) |
| summarySlices/Combos/Drinks/Total IDs reused | Task 2 (HTML) |
| Touch target ≥ 44px for config chips | Task 5 |
| aria-live on statusMessage | Task 5 |
| Cache version bump | Task 6 |

All spec requirements covered. No placeholders.
