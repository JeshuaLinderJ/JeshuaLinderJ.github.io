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
// New elements for log display
const logTableBody = document.getElementById('logTableBody');
const emptyLogMessage = document.getElementById('emptyLogMessage');

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

function renderLogTable() {
    // Clear existing table rows
    logTableBody.innerHTML = '';

    // Check if there's data
    if (salesData.length === 0) {
        emptyLogMessage.style.display = 'block'; // Show empty message
        logTableBody.parentElement.style.display = 'none'; // Hide table
    } else {
        emptyLogMessage.style.display = 'none'; // Hide empty message
        logTableBody.parentElement.style.display = 'table'; // Show table

        // Populate table with data
        salesData.forEach((sale, index) => {
            const row = logTableBody.insertRow();

            // Format timestamp for readability (optional)
            const timestamp = new Date(sale.Timestamp);
            const formattedTimestamp = timestamp.toLocaleString(); // e.g., 4/22/2025, 2:30:00 PM

            row.insertCell(0).textContent = formattedTimestamp;
            row.insertCell(1).textContent = sale.Item;
            row.insertCell(2).textContent = sale['Pizza Flavor 1'] || '-'; // Handle empty values
            row.insertCell(3).textContent = sale['Pizza Flavor 2'] || '-';
            row.insertCell(4).textContent = sale.Drink || '-';
            row.insertCell(5).textContent = sale.Price.toFixed(2); // Format price

            // Add Delete Button
            const actionCell = row.insertCell(6);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-btn');
            deleteButton.dataset.index = index; // Store the index of the sale
            actionCell.appendChild(deleteButton);
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
    renderLogTable(); // Update the table display
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
            // Format timestamp for CSV export (using ISO string is often best for data)
            if (header === 'Timestamp') {
                value = new Date(value).toISOString();
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

// Add event listener for delete buttons (using event delegation)
logTableBody.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        const indexToDelete = parseInt(event.target.dataset.index, 10);
        // Optional: Add a confirmation dialog
        if (confirm('Are you sure you want to delete this log entry?')) {
             deleteSale(indexToDelete);
        }
    }
});

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

// --- Initial Setup ---
// Initial render of the log table on page load
renderLogTable();
updateStatus('Application loaded. Previous logs restored.'); // Update initial status
