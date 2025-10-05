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
    if (scannerRunning) {
        console.warn("Scanner is already running. Ignoring start request.");
        return; // Prevent multiple starts
    }

    startButton.disabled = true;
    stopButton.disabled = false;
    interactiveDiv.style.display = 'block'; // Show QuaggaJS viewport
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';
    console.log("Attempting to start scanner...");

    // Clear any previous QuaggaJS state, just in case
    // Quagga.stop() should handle cleanup, but good to ensure
    try {
        if (Quagga.initialized) { // Check if Quagga was previously initialized
             Quagga.stop();
             console.log("Quagga.stop() called for previous session cleanup.");
        }
    } catch (e) {
        console.warn("Error trying to stop Quagga before init (might not have been running):", e);
    }
    
    // QuaggaJS configuration
    Quagga.init({
        inputStream : {
            name : "Live",
            type : "LiveStream",
            target: interactiveDiv, // Ensure this is the correct DOM element reference
            constraints: {
                // Ensure a high resolution for better decoding
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                facingMode: "environment", // Use the back camera
                // Try adding specific device ID if you were using it previously with ZXing,
                // though facingMode usually suffices.
                // deviceId: 'your-specific-device-id-if-needed'
            },
        },
        decoder : {
            readers : ["ean_reader", "ean_8_reader"], // Only EAN codes
        },
        locator: {
            patchSize: "medium",
            halfSample: true,
            // area: { top: "20%", right: "20%", left: "20%", bottom: "20%" } // Uncomment to test focus area
        }
    }, function(err) {
        if (err) {
            console.error('QuaggaJS initialization FAILED:', err);
            statusDiv.textContent = `Error accessing camera: ${err.message || err}`;
            stopScanner(true); // Pass true to indicate an error stop, to avoid re-enabling start button prematurely
            return;
        }
        console.log("QuaggaJS initialization finished. Attempting to start scanner...");
        try {
            Quagga.start();
            scannerRunning = true;
            statusDiv.textContent = 'Camera started. Point at a barcode.';
            console.log("QuaggaJS started successfully.");
        } catch (startErr) {
            console.error('QuaggaJS start FAILED:', startErr);
            statusDiv.textContent = `Error starting scanner: ${startErr.message || startErr}`;
            stopScanner(true); // Stop on start failure
        }
    });

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
        // Only draw if scanner is actually running and not just processed a final result
        if (scannerRunning) {
            var drawingCtx = Quagga.canvas.ctx.overlay,
                drawingCanvas = Quagga.canvas.dom.overlay;

            if (drawingCtx && drawingCanvas) { // Ensure canvas elements exist
                 drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.width), parseInt(drawingCanvas.height));
                 if (result.boxes) {
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
        }
    });
}

// Add a parameter to stopScanner to indicate if it was called due to an error
function stopScanner(isError = false) {
    if (scannerRunning) {
        Quagga.stop();
        scannerRunning = false;
        console.log('QuaggaJS stopped.');
    }
    interactiveDiv.style.display = 'none'; // Hide QuaggaJS viewport

    // Only re-enable start button if not stopping due to an error immediately after trying to start
    if (!isError) {
        startButton.disabled = false;
    } else {
        // If it's an error stop, leave startButton disabled,
        // or re-enable if user can potentially fix (e.g., allow camera access).
        // For now, let's re-enable it on error too, assuming user might try again.
        startButton.disabled = false;
    }
    
    stopButton.disabled = true;
    productDisplay.style.display = 'none';
    if (statusDiv.textContent.includes('Error') === false) { // Don't overwrite error message
        statusDiv.textContent = 'Camera stopped.';
    }
    console.log("Scanner cleanup complete.");
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