'use strict';

// --- Config ---
const DEFAULT_CONFIG = {
    prices: { Slice: 2.50, Combo: 5.00, Drink: 1.00 },
    flavors: ['Pepperoni', 'Cheese', 'Meat Lovers', 'Other'],
    drinks: ['Coca Cola', 'Sprite', 'Water', 'Other'],
    customItems: []
};

let config = (function () {
    try {
        const saved = localStorage.getItem('pizzaConfig');
        if (saved) {
            const p = JSON.parse(saved);
            return {
                prices:      { ...DEFAULT_CONFIG.prices,  ...(p.prices  || {}) },
                flavors:     Array.isArray(p.flavors) ? p.flavors : [...DEFAULT_CONFIG.flavors],
                drinks:      Array.isArray(p.drinks)  ? p.drinks  : [...DEFAULT_CONFIG.drinks],
                customItems: Array.isArray(p.customItems) ? p.customItems : []
            };
        }
    } catch (e) {}
    return {
        prices:      { ...DEFAULT_CONFIG.prices },
        flavors:     [...DEFAULT_CONFIG.flavors],
        drinks:      [...DEFAULT_CONFIG.drinks],
        customItems: []
    };
})();

function saveConfig() {
    try {
        localStorage.setItem('pizzaConfig', JSON.stringify(config));
    } catch (e) {
        updateStatus('Warning: Could not save settings — storage may be full.');
    }
}

function sanitizeName(raw) {
    return raw.trim().replace(/[<>"'&]/g, '').slice(0, 20);
}

// --- DOM Elements ---
const flavor1Select  = document.getElementById('flavor1');
const flavor2Select  = document.getElementById('flavor2');
const drinkSelect    = document.getElementById('drink');
const flavor1Group   = document.getElementById('flavor1Group');
const flavor2Group   = document.getElementById('flavor2Group');
const drinkGroup     = document.getElementById('drinkGroup');
const flavor1Label   = document.getElementById('flavor1Label');
const flavorPairRow  = document.getElementById('flavorPairRow');
const exportCSVButton = document.getElementById('exportCSV');
const statusMessage = document.getElementById('statusMessage');
// New elements for log display
const logTableBody = document.getElementById('logTableBody');
const emptyLogMessage = document.getElementById('emptyLogMessage');
const clearLogsButton = document.getElementById('clearLogsButton');
const clearCacheButton = document.getElementById('clearCacheButton');
const resetSettingsButton = document.getElementById('resetSettings');
const headerRevenue  = document.getElementById('headerRevenue');
const summarySlices  = document.getElementById('summarySlices');
const summaryCombos  = document.getElementById('summaryCombos');
const summaryDrinks  = document.getElementById('summaryDrinks');
const summaryTotal   = document.getElementById('summaryTotal');

let _logPending = false;
let selectedType = 'Slice';
let _undoTimeout      = null;
let _pendingUndoId = null;
let _clearLogsConfirmTimeout    = null;
let _resetSettingsConfirmTimeout = null;
let _displayedRevenueCents = 0;
let _revenueAnimFrame = null;

// --- Data Storage ---
// Attempt to load sales data from localStorage, or initialize an empty array
let salesData = (function() {
    try {
        const raw = localStorage.getItem('pizzaSales');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(function(s) {
            return s !== null && typeof s === 'object' &&
                   typeof s.Timestamp === 'string' &&
                   typeof s.Item === 'string' &&
                   typeof s.Price === 'number' && !isNaN(s.Price);
        });
    } catch (e) { return []; }
})();

// --- Functions ---

function updateStatus(message) {
    statusMessage.textContent = message;
}

function animateRevenue(fromCents, toCents) {
    if (_revenueAnimFrame !== null) {
        cancelAnimationFrame(_revenueAnimFrame);
        _revenueAnimFrame = null;
    }
    if (fromCents === toCents || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        headerRevenue.textContent = '$' + (toCents / 100).toFixed(2);
        _displayedRevenueCents = toCents;
        return;
    }
    const duration = 400;
    const start = performance.now();
    function tick(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(fromCents + (toCents - fromCents) * eased);
        headerRevenue.textContent = '$' + (current / 100).toFixed(2);
        _displayedRevenueCents = current;
        if (t < 1) {
            _revenueAnimFrame = requestAnimationFrame(tick);
        } else {
            _revenueAnimFrame = null;
        }
    }
    _revenueAnimFrame = requestAnimationFrame(tick);
}

function saveSalesData() {
    // Save the current salesData array to the browser's local storage
    try {
        localStorage.setItem('pizzaSales', JSON.stringify(salesData));
    } catch (e) {
        updateStatus('Warning: Could not save — storage may be full.');
    }
}

function updateSummary() {
    let revenue = 0, slices = 0, combos = 0, drinks = 0;
    salesData.forEach(sale => {
        revenue += Math.round(sale.Price * 100);
        if (sale.Item === 'Slice') slices++;
        else if (sale.Item === 'Combo') combos++;
        else if (sale.Item === 'Drink') drinks++;
    });
    animateRevenue(_displayedRevenueCents, revenue);
    summarySlices.textContent  = slices;
    summaryCombos.textContent  = combos;
    summaryDrinks.textContent  = drinks;
    summaryTotal.textContent   = salesData.length;
}

function renderLogTable() {
    updateSummary();
    logTableBody.innerHTML = '';

    // Check if there's data
    if (salesData.length === 0) {
        emptyLogMessage.style.display = 'block'; // Show empty message
        logTableBody.parentElement.style.display = 'none'; // Hide table
    } else {
        emptyLogMessage.style.display = 'none'; // Hide empty message
        logTableBody.parentElement.style.display = 'table'; // Show table

        // Populate table with data
        // Define headers for data-label attributes
        const headers = ['Timestamp', 'Item', 'Flavor 1', 'Flavor 2', 'Drink', 'Price', 'Action'];

        salesData.forEach((sale, index) => {
            const row = logTableBody.insertRow();

            // Format timestamp for readability (optional)
            const timestamp = new Date(sale.Timestamp);
            const formattedTimestamp = timestamp.toLocaleString(); // e.g., 4/22/2025, 2:30:00 PM

            // Create cells and add data-label attributes
            const cellData = [
                formattedTimestamp,
                sale.Item,
                sale['Pizza Flavor 1'] || '-',
                sale['Pizza Flavor 2'] || '-',
                sale.Drink || '-',
                sale.Price.toFixed(2),
                null // Placeholder for the action button cell
            ];

            cellData.forEach((data, cellIndex) => {
                const cell = row.insertCell(cellIndex);
                cell.dataset.label = headers[cellIndex]; // Add data-label

                if (headers[cellIndex] === 'Action') {
                    // Add Delete Button specifically to the Action cell
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.classList.add('delete-btn');
                    deleteButton.dataset.index = index; // Store the index of the sale
                    cell.appendChild(deleteButton);
                } else {
                    cell.textContent = data;
                }
            });
        });
    }
}

function deleteSale(index) {
    if (index >= 0 && index < salesData.length) {
        const deletedItem = salesData[index].Item;
        salesData.splice(index, 1); // Remove the item from the array
        saveSalesData(); // Update localStorage
        renderLogTable(); // Re-render the table
        updateStatus(`Deleted a ${deletedItem} log entry.`);
    } else {
        console.error('Invalid index for deletion:', index);
        updateStatus('Error: Could not delete entry.');
    }
}

function logSale(itemType, price, flavor1, flavor2 = '', drink = '') {
    if (_logPending) return;
    _logPending = true;
    setTimeout(() => { _logPending = false; }, 400);
    const timestamp = new Date().toISOString();
    const saleId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    salesData.push({
        _id: saleId,
        Timestamp: timestamp,
        Item: itemType,
        'Pizza Flavor 1': flavor1,
        'Pizza Flavor 2': flavor2,
        Drink: drink,
        Price: price
    });
    saveSalesData(); // Save after each log
    renderLogTable(); // Update the table display
    updateStatus(`Logged ${itemType} sale.`);
    showUndoToast(salesData[salesData.length - 1]);
}

function populateSelects() {
    [flavor1Select, flavor2Select].forEach(function(sel) {
        const current = sel.value;
        sel.replaceChildren(...config.flavors.map(function(f) {
            const opt = document.createElement('option');
            opt.textContent = f;
            return opt;
        }));
        if (config.flavors.includes(current)) sel.value = current;
    });
    const currentDrink = drinkSelect.value;
    drinkSelect.replaceChildren(...config.drinks.map(function(d) {
        const opt = document.createElement('option');
        opt.textContent = d;
        return opt;
    }));
    if (config.drinks.includes(currentDrink)) drinkSelect.value = currentDrink;
}

function updateButtonLabels() {
    document.getElementById('logButton').textContent =
        'Log ' + selectedType + ' — $' + config.prices[selectedType].toFixed(2);
}

function setItemType(type) {
    selectedType = type;

    document.querySelectorAll('.seg-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    if (type === 'Slice') {
        flavor1Group.style.display  = '';
        flavor2Group.style.display  = 'none';
        drinkGroup.style.display    = 'none';
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

function handleLog() {
    if (selectedType === 'Slice') {
        logSale('Slice', config.prices.Slice, flavor1Select.value);
    } else if (selectedType === 'Combo') {
        logSale('Combo', config.prices.Combo, flavor1Select.value, flavor2Select.value, drinkSelect.value);
    } else {
        logSale('Drink', config.prices.Drink, '', '', drinkSelect.value);
    }
}

function showUndoToast(sale) {
    if (_undoTimeout) { clearTimeout(_undoTimeout); _undoTimeout = null; }
    _pendingUndoId = sale._id;

    let detail = '';
    if (sale.Item === 'Slice')      detail = sale['Pizza Flavor 1'];
    else if (sale.Item === 'Combo') detail = sale['Pizza Flavor 1'] + ' + ' + sale['Pizza Flavor 2'];
    else                            detail = sale.Drink;

    document.getElementById('undoToastText').textContent =
        'Logged ' + sale.Item + ' — ' + detail;

    const bar = document.getElementById('undoProgressBar');
    bar.style.animation = 'none';
    bar.offsetHeight; // force reflow to restart animation
    bar.style.animation = 'undoCountdown 5s linear forwards';

    document.getElementById('undoToast').style.display = 'flex';
    _undoTimeout = setTimeout(dismissUndoToast, 5000);
}

function dismissUndoToast() {
    if (_undoTimeout) { clearTimeout(_undoTimeout); _undoTimeout = null; }
    _pendingUndoId = null;
    document.getElementById('undoToast').style.display = 'none';
}

function handleUndo() {
    if (_pendingUndoId === null) return;
    const id = _pendingUndoId;
    dismissUndoToast();
    const idx = salesData.findIndex(function(s) { return s._id === id; });
    if (idx === -1) { updateStatus('Nothing to undo.'); return; }
    salesData.splice(idx, 1);
    saveSalesData();
    renderLogTable();
    updateStatus('Sale undone.');
}

function renderSettingsPanel() {
    document.getElementById('priceSlice').value = config.prices.Slice;
    document.getElementById('priceCombo').value = config.prices.Combo;
    document.getElementById('priceDrink').value = config.prices.Drink;

    function buildConfigList(container, items, type) {
        container.replaceChildren(...items.map(function(item, i) {
            const div = document.createElement('div');
            div.className = 'config-item';
            const span = document.createElement('span');
            span.textContent = item;
            const btn = document.createElement('button');
            btn.className = 'config-remove-btn';
            btn.dataset.type = type;
            btn.dataset.index = i;
            btn.setAttribute('aria-label', 'Remove ' + item);
            btn.textContent = '×';
            div.appendChild(span);
            div.appendChild(btn);
            return div;
        }));
    }

    buildConfigList(document.getElementById('configFlavorList'), config.flavors, 'flavor');
    buildConfigList(document.getElementById('configDrinkList'), config.drinks, 'drink');

    const customList = document.getElementById('configCustomItemList');
    customList.replaceChildren(...config.customItems.map(function(item, i) {
        const div = document.createElement('div');
        div.className = 'config-item';
        const span = document.createElement('span');
        span.textContent = item.name + ' — $' + item.price.toFixed(2);
        const btn = document.createElement('button');
        btn.className = 'config-remove-btn';
        btn.dataset.type = 'customItem';
        btn.dataset.index = i;
        btn.setAttribute('aria-label', 'Remove ' + item.name);
        btn.textContent = '×';
        div.appendChild(span);
        div.appendChild(btn);
        return div;
    }));
}

function renderCustomItemButtons() {
    const container = document.getElementById('customItemButtons');
    container.replaceChildren(...config.customItems.map(function(item, i) {
        const btn = document.createElement('button');
        btn.className = 'log-btn custom-item-btn';
        btn.textContent = item.name + ' — $' + item.price.toFixed(2);
        btn.dataset.index = i;
        return btn;
    }));
}

function renderCustomSummaryTiles() {
    const summary = document.querySelector('.compact-summary');
    summary.querySelectorAll('.custom-stat-tile').forEach(function(el) { el.remove(); });
    const salesTile = document.getElementById('summaryTotal').closest('.compact-stat');
    config.customItems.forEach(function(item) {
        const div = document.createElement('div');
        div.className = 'compact-stat custom-stat-tile';
        const label = document.createElement('span');
        label.className = 'compact-stat-label';
        label.textContent = item.name;
        const value = document.createElement('span');
        value.className = 'compact-stat-value';
        value.dataset.custom = item.name;
        value.textContent = '0';
        div.appendChild(label);
        div.appendChild(value);
        summary.insertBefore(div, salesTile);
    });
}

function exportToCSV() {
    if (salesData.length === 0) {
        updateStatus('No data to export.');
        alert('No sales data to export.');
        return;
    }

    const headers = ['Timestamp', 'Item', 'Pizza Flavor 1', 'Pizza Flavor 2', 'Drink', 'Price'];
    // Convert data array to CSV string
    let csvContent = "";
    csvContent += headers.join(",") + "\r\n"; // Add header row

    salesData.forEach(row => {
        // Ensure values are properly quoted if they contain commas or quotes
        const formattedRow = headers.map(header => {
            let value = row[header] === null || row[header] === undefined ? '' : row[header];
            // Format timestamp for CSV export (using ISO string is often best for data)
            if (header === 'Timestamp') {
                value = new Date(value).toISOString();
            }
            if (header === 'Price') {
                value = Number(value).toFixed(2);
            }
            // Escape double quotes by doubling them
            value = String(value).replace(/"/g, '""');
            // Enclose in double quotes if it contains comma, newline, or double quote
            if (String(value).includes(',') || String(value).includes('\n') || String(value).includes('"')) {
                value = `"${value}"`;
            }
            return value;
        });
        csvContent += formattedRow.join(",") + "\r\n";
    });

    // Create a link and trigger download
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    link.setAttribute("download", `pizza_sales_${timestamp}.csv`);
    document.body.appendChild(link); // Required for Firefox

    link.click(); // Trigger download
    URL.revokeObjectURL(url);
    document.body.removeChild(link); // Clean up
    updateStatus('Data exported to CSV.');
}

// --- Function to Clear All Logs ---
function clearLogs() {
    if (_clearLogsConfirmTimeout) {
        clearTimeout(_clearLogsConfirmTimeout);
        _clearLogsConfirmTimeout = null;
        clearLogsButton.textContent = 'Clear All Logs';
        clearLogsButton.classList.remove('danger-btn--armed');
        salesData = [];
        localStorage.removeItem('pizzaSales');
        renderLogTable();
        updateStatus('All log entries cleared.');
    } else {
        clearLogsButton.textContent = 'Tap again to confirm';
        clearLogsButton.classList.add('danger-btn--armed');
        _clearLogsConfirmTimeout = setTimeout(function() {
            _clearLogsConfirmTimeout = null;
            clearLogsButton.textContent = 'Clear All Logs';
            clearLogsButton.classList.remove('danger-btn--armed');
        }, 3000);
    }
}

// --- Function to Clear Service Worker Cache and Reload ---
async function clearCacheAndReload() {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
        alert('Service Worker or Cache API not supported in this browser.');
        return;
    }

    if (confirm('Are you sure you want to clear the application cache and reload? This will remove offline data and require redownloading.')) {
        updateStatus('Clearing cache and unregistering service worker...');
        try {
            // 1. Unregister all service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('Service Worker unregistered:', registration.scope);
            }

            // 2. Delete all caches
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => {
                console.log('Deleting cache:', key);
                return caches.delete(key);
            }));

            updateStatus('Cache cleared. Reloading page...');
            window.location.href = location.pathname + '?cache_bust=' + Date.now();

        } catch (error) {
            console.error('Error clearing cache or unregistering service worker:', error);
            updateStatus('Error clearing cache. Check console for details.');
            alert('Failed to clear cache. See console for details.');
        }
    }
}

// --- Event Listeners ---
document.getElementById('itemTypeControl').addEventListener('click', function(e) {
    var btn = e.target.closest('.seg-btn');
    if (btn) setItemType(btn.dataset.type);
});

document.getElementById('logButton').addEventListener('click', handleLog);

exportCSVButton.addEventListener('click', exportToCSV);
clearLogsButton.addEventListener('click', clearLogs); // Add listener for clear button
clearCacheButton.addEventListener('click', clearCacheAndReload); // Add listener for clear cache button

// Add event listener for delete buttons (using event delegation)
logTableBody.addEventListener('click', function(event) {
    if (event.target.classList.contains('delete-btn')) {
        deleteSale(parseInt(event.target.dataset.index, 10));
    }
});

document.getElementById('undoButton').addEventListener('click', handleUndo);

document.getElementById('saveSettings').addEventListener('click', () => {
    const ps = parseFloat(document.getElementById('priceSlice').value);
    const pc = parseFloat(document.getElementById('priceCombo').value);
    const pd = parseFloat(document.getElementById('priceDrink').value);
    if ([ps, pc, pd].some(v => isNaN(v) || v < 0)) {
        updateStatus('Invalid prices — enter positive numbers.');
        return;
    }
    config.prices = { Slice: ps, Combo: pc, Drink: pd };
    saveConfig();
    updateButtonLabels();
    updateStatus('Settings saved.');
});

resetSettingsButton.addEventListener('click', function() {
    if (_resetSettingsConfirmTimeout) {
        clearTimeout(_resetSettingsConfirmTimeout);
        _resetSettingsConfirmTimeout = null;
        resetSettingsButton.textContent = 'Reset to Defaults';
        resetSettingsButton.classList.remove('danger-btn--armed');
        if (!confirm('Reset prices, flavors, and drinks to defaults?')) return;
        const keepCustomItems = config.customItems.length > 0
            ? !confirm('Also delete ' + config.customItems.length + ' custom item(s)?')
            : true;
        config = {
            prices:      { ...DEFAULT_CONFIG.prices },
            flavors:     [...DEFAULT_CONFIG.flavors],
            drinks:      [...DEFAULT_CONFIG.drinks],
            customItems: keepCustomItems ? [...config.customItems] : []
        };
        saveConfig();
        populateSelects();
        updateButtonLabels();
        renderSettingsPanel();
        renderCustomItemButtons();
        renderCustomSummaryTiles();
        renderLogTable();
        updateStatus('Settings reset to defaults.');
    } else {
        resetSettingsButton.textContent = 'Tap again to confirm';
        resetSettingsButton.classList.add('danger-btn--armed');
        _resetSettingsConfirmTimeout = setTimeout(function() {
            _resetSettingsConfirmTimeout = null;
            resetSettingsButton.textContent = 'Reset to Defaults';
            resetSettingsButton.classList.remove('danger-btn--armed');
        }, 3000);
    }
});

document.getElementById('addFlavor').addEventListener('click', () => {
    const input = document.getElementById('newFlavor');
    const val = input.value.trim();
    if (!val) return;
    if (config.flavors.includes(val)) { updateStatus('Flavor already exists.'); return; }
    config.flavors.push(val);
    input.value = '';
    saveConfig();
    populateSelects();
    renderSettingsPanel();
});

document.getElementById('newFlavor').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('addFlavor').click();
});

document.getElementById('addDrink').addEventListener('click', () => {
    const input = document.getElementById('newDrink');
    const val = input.value.trim();
    if (!val) return;
    if (config.drinks.includes(val)) { updateStatus('Drink already exists.'); return; }
    config.drinks.push(val);
    input.value = '';
    saveConfig();
    populateSelects();
    renderSettingsPanel();
});

document.getElementById('newDrink').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('addDrink').click();
});

document.getElementById('addCustomItem').addEventListener('click', () => {
    const nameInput = document.getElementById('newCustomItemName');
    const priceInput = document.getElementById('newCustomItemPrice');
    const name = sanitizeName(nameInput.value);
    const price = parseFloat(priceInput.value);
    if (!name) { updateStatus('Item name is required.'); return; }
    if (isNaN(price) || price < 0) { updateStatus('Enter a valid price.'); return; }
    if (config.customItems.some(item => item.name === name)) {
        updateStatus('Custom item already exists.');
        return;
    }
    config.customItems.push({ name, price });
    nameInput.value = '';
    priceInput.value = '';
    saveConfig();
    renderSettingsPanel();
    renderCustomItemButtons();
    renderCustomSummaryTiles();
});

document.getElementById('newCustomItemName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('addCustomItem').click();
});

document.getElementById('newCustomItemPrice').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('addCustomItem').click();
});

document.getElementById('configCustomItemList').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-remove-btn');
    if (!btn || btn.dataset.type !== 'customItem') return;
    config.customItems.splice(parseInt(btn.dataset.index, 10), 1);
    saveConfig();
    renderSettingsPanel();
    renderCustomItemButtons();
    renderCustomSummaryTiles();
    renderLogTable();
});

document.getElementById('configFlavorList').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-remove-btn');
    if (!btn || btn.dataset.type !== 'flavor') return;
    if (config.flavors.length <= 1) { updateStatus('Must keep at least one flavor.'); return; }
    config.flavors.splice(parseInt(btn.dataset.index, 10), 1);
    saveConfig();
    populateSelects();
    renderSettingsPanel();
});

document.getElementById('configDrinkList').addEventListener('click', (e) => {
    const btn = e.target.closest('.config-remove-btn');
    if (!btn || btn.dataset.type !== 'drink') return;
    if (config.drinks.length <= 1) { updateStatus('Must keep at least one drink.'); return; }
    config.drinks.splice(parseInt(btn.dataset.index, 10), 1);
    saveConfig();
    populateSelects();
    renderSettingsPanel();
});

// --- Initial Setup ---
renderLogTable();
populateSelects();
setItemType('Slice');
renderSettingsPanel();
updateStatus('Ready. Previous logs restored.');

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js')
            .then(function(reg) {
                console.log('ServiceWorker registered:', reg.scope);
            }, function(err) {
                console.warn('ServiceWorker registration failed:', err);
            });
    });
}

// --- Keyboard shortcut: Enter on body logs current selection ---
document.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter') return;
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
        handleLog();
    }
});
