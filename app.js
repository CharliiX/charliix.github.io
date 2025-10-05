const interactiveDiv = document.getElementById('interactive');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const productDisplay = document.getElementById('productDisplay');
const productNameDisplay = document.getElementById('productNameDisplay');
const productPriceDisplay = document.getElementById('productPriceDisplay');
const payButton = document.getElementById('payButton');

const PAYMENT_BASE_URL = 'https://payment.site/'; // Ensure this is HTTPS for production/deployment!

let scannerRunning = false; // Flag to track scanner state

async function startScanner() {
    if (scannerRunning) return; // Prevent multiple starts

    startButton.disabled = true;
    stopButton.disabled = false;
    interactiveDiv.style.display = 'block'; // Show QuaggaJS viewport
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';

    // QuaggaJS configuration
    // Focused on EAN codes
    Quagga.init({
        inputStream : {
            name : "Live",
            type : "LiveStream",
            target: interactiveDiv, // Or document.querySelector('#interactive')
            constraints: {
                // Ensure a high resolution for better decoding
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment" // Use the back camera
            },
        },
        decoder : {
            readers : ["ean_reader", "ean_8_reader"], // Only EAN codes
            // Other decoder properties can be added for tuning:
            // multiple: false, // Decode only one barcode per frame
            // debug: { showCanvas: true, showPatches: true },
        },
        // Optional: Locator for fine-tuning how QuaggaJS searches for barcodes
        locator: {
            patchSize: "medium", // 'x-small', 'small', 'medium', 'large', 'x-large'
            halfSample: true, // Speeds up detection
            // Set a specific area to focus scanning, e.g., the middle of the screen
            // area: { top: "20%", right: "20%", left: "20%", bottom: "20%" }
        }
    }, function(err) {
        if (err) {
            console.error('QuaggaJS init error:', err);
            statusDiv.textContent = `Error accessing camera: ${err.message || err}`;
            stopScanner(); // Attempt to stop on error
            return;
        }
        console.log("QuaggaJS initialization finished. Starting scanner...");
        Quagga.start();
        scannerRunning = true;
        statusDiv.textContent = 'Camera started. Point at a barcode.';
    });

    // QuaggaJS event listeners
    Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
            const barcode = result.codeResult.code;
            console.log('QuaggaJS Detected:', barcode);
            statusDiv.textContent = `Scanned: ${barcode}`;
            handleBarcode(barcode);
            stopScanner(); // Stop camera after successful scan
        }
    });

    Quagga.onProcessed(function(result) {
        // You can use this for visual feedback: draw detected areas on canvas
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.width), parseInt(drawingCanvas.height));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
            }
        }
    });
}

function stopScanner() {
    if (scannerRunning) {
        Quagga.stop();
        scannerRunning = false;
        console.log('QuaggaJS stopped.');
    }
    interactiveDiv.style.display = 'none'; // Hide QuaggaJS viewport
    startButton.disabled = false;
    stopButton.disabled = true;
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Camera stopped.';
}

async function handleBarcode(barcode) {
    const mappings = JSON.parse(localStorage.getItem('barcodeMappings')) || {};
    const productInfo = mappings[barcode];

    if (productInfo) {
        productNameDisplay.textContent = productInfo.productName;
        productPriceDisplay.textContent = productInfo.price;
        productDisplay.style.display = 'block';

        const encodedProductName = encodeURIComponent(productInfo.productName);
        const encodedPrice = encodeURIComponent(productInfo.price);

        const paymentUrl = `${PAYMENT_BASE_URL}${encodedProductName}&${encodedPrice}`;

        payButton.dataset.paymentUrl = paymentUrl;

        statusDiv.textContent = `Product found: ${productInfo.productName}.`;
    } else {
        productDisplay.style.display = 'none';
        statusDiv.textContent = `Scanned: ${barcode}. No properties found. Please add it in the Admin Interface.`;
        alert(`Barcode "${barcode}" not recognized. Please add it in the Admin Interface.`);
    }
}

// --- Event Listeners ---
startButton.addEventListener('click', startScanner);
stopButton.addEventListener('click', stopScanner);

payButton.addEventListener('click', () => {
    const paymentUrl = payButton.dataset.paymentUrl;
    if (paymentUrl) {
        console.log('Navigating to payment URL:', paymentUrl);
        window.location.href = paymentUrl;
    } else {
        alert('No payment URL found. Please scan a product first.');
    }
});

// Initial button states
stopButton.disabled = true;
productDisplay.style.display = 'none';
interactiveDiv.style.display = 'none'; // Hide QuaggaJS viewport on load