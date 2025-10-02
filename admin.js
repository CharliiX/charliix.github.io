const eanNumberInput = document.getElementById('eanNumber');
const productNameInput = document.getElementById('productName');
const priceInput = document.getElementById('price');
const barcodePropertiesForm = document.getElementById('barcodePropertiesForm');
const mappedBarcodesList = document.getElementById('mappedBarcodesList');

// --- LocalStorage Management ---

// Load existing mappings from localStorage
function loadBarcodeMappings() {
    // We'll store a list of product objects, keyed by their EAN
    const mappings = JSON.parse(localStorage.getItem('barcodeMappings')) || {};
    return mappings;
}

// Save a new product or update an existing one
function saveBarcodeMapping(ean, properties) {
    const mappings = loadBarcodeMappings();
    mappings[ean] = properties; // Store product properties under its EAN
    localStorage.setItem('barcodeMappings', JSON.stringify(mappings));
    displayMappedBarcodes(); // Refresh the list
}

// Delete a mapping
function deleteBarcodeMapping(ean) {
    const mappings = loadBarcodeMappings();
    delete mappings[ean];
    localStorage.setItem('barcodeMappings', JSON.stringify(mappings));
    displayMappedBarcodes(); // Refresh the list
}

// Display all mapped barcodes in the list
function displayMappedBarcodes() {
    const mappings = loadBarcodeMappings();
    mappedBarcodesList.innerHTML = ''; // Clear existing list

    if (Object.keys(mappings).length === 0) {
        mappedBarcodesList.innerHTML = '<li>No products mapped yet.</li>';
        return;
    }

    for (const ean in mappings) {
        const properties = mappings[ean];
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <div class="item-details">
                <strong>EAN: ${ean}</strong><br>
                Name: ${properties.productName}<br>
                Price: ${properties.price}
            </div>
            <button data-ean="${ean}">Delete</button>
        `;
        mappedBarcodesList.appendChild(listItem);
    }

    // Add event listeners to delete buttons
    mappedBarcodesList.querySelectorAll('button[data-ean]').forEach(button => {
        button.addEventListener('click', (event) => {
            const eanToDelete = event.target.dataset.ean;
            if (confirm(`Are you sure you want to delete the product with EAN "${eanToDelete}"?`)) {
                deleteBarcodeMapping(eanToDelete);
            }
        });
    });
}

// --- Event Listeners ---
barcodePropertiesForm.addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent form submission

    const ean = eanNumberInput.value.trim();
    const productName = productNameInput.value.trim();
    const price = priceInput.value.trim();

    if (!ean || !productName || !price) {
        alert('Please fill in all required fields: EAN Number, Product Name, and Price.');
        return;
    }

    const properties = {
        productName: productName,
        price: price
    };

    saveBarcodeMapping(ean, properties);
    alert(`Product "${productName}" (EAN: ${ean}) saved!`);

    // Clear form for next entry
    eanNumberInput.value = '';
    productNameInput.value = '';
    priceInput.value = '';
    eanNumberInput.focus(); // Keep focus on EAN for quick entry
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    displayMappedBarcodes();
});