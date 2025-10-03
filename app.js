const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const productDisplay = document.getElementById('productDisplay');
const productNameDisplay = document.getElementById('productNameDisplay');
const productPriceDisplay = document.getElementById('productPriceDisplay');
const payButton = document.getElementById('payButton');

let codeReader = null; // Initialize as null to clearly indicate no active reader

const PAYMENT_BASE_URL = 'https://payment.site/'; // Ensure this is HTTPS for production/deployment!

async function startScanner() {
    startButton.disabled = true;
    stopButton.disabled = false;
    video.style.display = 'block';
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';

    // --- CRITICAL: Ensure previous stream is completely stopped before starting a new one ---
    // If a reader somehow exists from a previous failed attempt or incomplete stop, reset it.
    if (codeReader) {
        codeReader.reset();
        codeReader = null; // Clear the reference
    }
    // Also explicitly clear the video element's source
    video.srcObject = null;
    video.load(); // Try reloading the video element to clear its state
    // --- END CRITICAL CLEANUP ---


    try {
        codeReader = new ZXing.BrowserMultiFormatReader();

        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        let selectedDeviceId;
        if (videoInputDevices.length > 0) {
            // Prefer the last device, which is often the back camera on mobile
            selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
            console.log(`Using camera: ${videoInputDevices[videoInputDevices.length - 1].label || 'Default'}`);
        } else {
            throw new Error('No video input devices found.');
        }

        const constraints = {
            deviceId: { exact: selectedDeviceId }, // Explicitly select device
            width: { ideal: 1920 }, // High width for better detail
            height: { ideal: 1080 }, // High height for better detail
            // Attempt to request continuous autofocus
            focusMode: 'continuous', // This is an experimental/non-standard constraint
            // facingMode: 'environment' // Explicitly request rear camera
        };

        await codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result) {
                console.log('Scanned:', result.text);
                statusDiv.textContent = `Scanned: ${result.text}`;
                handleBarcode(result.text);
                stopScanner(); // Stop camera after successful scan
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                statusDiv.textContent = `Error: ${err}`;
            }
        }, constraints); // Pass the constraints object here!

        statusDiv.textContent = 'Camera started. Point at a barcode.';
    } catch (error) {
        console.error('Error starting camera:', error);
        statusDiv.textContent = `Error accessing camera: ${error.message}`;
        
        // Ensure buttons are reset even if camera fails to start
        startButton.disabled = false;
        stopButton.disabled = true;
        video.style.display = 'none';
        
        // Ensure codeReader is null on failure to prevent stale state
        if (codeReader) {
            codeReader.reset();
            codeReader = null;
        }
        video.srcObject = null; // Clear source on error
        video.load();
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset(); // This properly stops the camera stream when using decodeFromVideoDevice
        codeReader = null; // Clear the reference to the reader
    }
    video.srcObject = null; // Crucial: Disconnect video element from any stream
    video.load(); // Important: Reload the video element to fully reset its state
    video.style.display = 'none';
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