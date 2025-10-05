const interactiveDiv = document.getElementById('interactive');
const videoElement = document.getElementById('barcode-video'); // Reference the new video element
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
    if (scannerRunning) return;

    startButton.disabled = true;
    stopButton.disabled = false;
    interactiveDiv.style.display = 'block'; // Show QuaggaJS viewport
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';

    // Ensure video element is ready for a new stream
    videoElement.srcObject = null;
    videoElement.load();

    // QuaggaJS configuration
    Quagga.init({
        inputStream : {
            name : "Live",
            type : "LiveStream",
            target: videoElement, // Direct QuaggaJS to use our specific video element
            constraints: {
                width: { min: 640, ideal: 1280 }, // Using ideal instead of max for robustness
                height: { min: 480, ideal: 720 },
                facingMode: "environment", // Use the back camera
                // Try explicitly requesting continuous autofocus
                advanced: [{ focusMode: "continuous" }] // QuaggaJS passes these to getUserMedia
            },
            // The following `area` and `singleChannel` settings are often helpful for performance
            // area: { // defines the coodinates where the code should be located
            //     top: "0%",    // upper-limit of the rectangle
            //     right: "0%",  // right-limit
            //     left: "0%",   // left-limit
            //     bottom: "0%"  // lower-limit
            // },
            // singleChannel: false // true: only one channel per 1D-reader
        },
        decoder : {
            readers : ["ean_reader", "ean_8_reader"],
            debug: { // Enable debug to see if processing is happening on the canvas
                showCanvas: true,
                showPatches: true,
                showFoundBox: true,
                showSkeleton: true,
                showLabels: true,
                showPoint: true,
                showRemaining: true,
                boxFromPatches: {
                    showTransformed: true,
                    showTransformedBox: true,
                    showBB: true
                }
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true,
            // xFactor: '0.8', // Higher value might capture more of the code
            // yFactor: '0.8',
            // debug: {
            //     showCanvas: true,
            //     showPatches: true,
            //     showFoundBox: true,
            //     showSkeleton: true,
            //     showLabels: true,
            //     showPoint: true,
            //     showRemaining: true,
            //     boxFromPatches: {
            //         showTransformed: true,
            //         showTransformedBox: true,
            //         showBB: true
            //     }
            // }
        },
        frequency: 10 // How many times per second to decode. Lower for less CPU, higher for faster reads.
    }, function(err) {
        if (err) {
            console.error('QuaggaJS init error:', err);
            statusDiv.textContent = `Error accessing camera: ${err.message || err}`;
            stopScanner();
            return;
        }
        console.log("QuaggaJS initialization finished. Starting scanner...");
        Quagga.start();
        scannerRunning = true;
        statusDiv.textContent = 'Camera started. Point at a barcode.';
        // Ensure video plays after init, sometimes needed on mobile
        videoElement.play(); 
    });

    Quagga.onDetected(function(result) {
        if (result && result.codeResult && result.codeResult.code) {
            const barcode = result.codeResult.code;
            console.log('QuaggaJS Detected:', barcode);
            statusDiv.textContent = `Scanned: ${barcode}`;
            handleBarcode(barcode);
            stopScanner(); 
        }
    });

    Quagga.onProcessed(function(result) {
        // Only draw if debug is enabled or you want permanent visual feedback
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (drawingCtx && drawingCanvas && result) {
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

    // Clean up Quagga's injected elements if any, and our video element
    if (videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    videoElement.load();
    // Remove any canvas elements Quagga might have created if not reusing the target
    // This is less necessary if you always target the same video element.
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

stopButton.disabled = true;
productDisplay.style.display = 'none';
interactiveDiv.style.display = 'none'; // Hide QuaggaJS viewport on load