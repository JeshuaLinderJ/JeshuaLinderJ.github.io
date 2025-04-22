'use strict';

// --- DOM Elements ---
const flavor1Select = document.getElementById('flavor1');
const flavor2Select = document.getElementById('flavor2');
const drinkSelect = document.getElementById('drink');
const logSliceButton = document.getElementById('logSlice');
const logComboButton = document.getElementById('logCombo');
const logDrinkButton = document.getElementById('logDrink');
const exportCSVButton = document.getElementById('exportCSV');
const statusMessage = document.getElementById('statusMessage');

// --- Data Storage ---
// Attempt to load sales data from localStorage, or initialize an empty array
let salesData = JSON.parse(localStorage.getItem('pizzaSales')) || [];

// --- Functions ---

function updateStatus(message) {
    statusMessage.textContent = message;
}

function saveSalesData() {
    // Save the current salesData array to the browser's local storage
    localStorage.setItem('pizzaSales', JSON.stringify(salesData));
}

function logSale(itemType, price, flavor1, flavor2 = '', drink = '') {
    const timestamp = new Date().toISOString(); // Use ISO format for better compatibility
    salesData.push({
        Timestamp: timestamp,
        Item: itemType,
        'Pizza Flavor 1': flavor1,
        'Pizza Flavor 2': flavor2,
        Drink: drink,
        Price: price
    });
    saveSalesData(); // Save after each log
    updateStatus(`Logged ${itemType} sale.`);
    // Optionally reset selections here if desired
    // flavor1Select.selectedIndex = 0;
    // flavor2Select.selectedIndex = 0;
    // drinkSelect.selectedIndex = 0;
}

function handleLogSlice() {
    const flavor1 = flavor1Select.value;
    logSale('Slice', 2.50, flavor1);
}

function handleLogCombo() {
    const flavor1 = flavor1Select.value;
    const flavor2 = flavor2Select.value;
    const drink = drinkSelect.value;
    logSale('Combo', 5.00, flavor1, flavor2, drink);
}

function handleLogDrink() {
    const drink = drinkSelect.value;
    logSale('Drink', 1.00, '', '', drink);
}

function exportToCSV() {
    if (salesData.length === 0) {
        updateStatus('No data to export.');
        alert('No sales data to export.');
        return;
    }

    const headers = ['Timestamp', 'Item', 'Pizza Flavor 1', 'Pizza Flavor 2', 'Drink', 'Price'];
    // Convert data array to CSV string
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\r\n"; // Add header row

    salesData.forEach(row => {
        // Ensure values are properly quoted if they contain commas or quotes
        const formattedRow = headers.map(header => {
            let value = row[header] === null || row[header] === undefined ? '' : row[header];
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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    link.setAttribute("download", `pizza_sales_${timestamp}.csv`);
    document.body.appendChild(link); // Required for Firefox

    link.click(); // Trigger download
    document.body.removeChild(link); // Clean up
    updateStatus('Data exported to CSV.');
}

// --- Event Listeners ---
logSliceButton.addEventListener('click', handleLogSlice);
logComboButton.addEventListener('click', handleLogCombo);
logDrinkButton.addEventListener('click', handleLogDrink);
exportCSVButton.addEventListener('click', exportToCSV);

// --- PWA Service Worker Registration (Basic) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js') // Adjust path if needed
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                updateStatus('Ready (Offline support enabled).');
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
                updateStatus('Ready (Offline support might not work).');
            });
    });
} else {
    updateStatus('Ready (Service workers not supported).');
}

// Initial status
updateStatus('Application loaded.');
