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

    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
    video.srcObject = null;
    video.load();

    try {
        // --- ZXing-JS Decoder Hints Configuration ---
        const hints = new Map();
        // Specify the barcode formats you expect to improve performance and accuracy
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]);
        
        // Add the TRY_HARDER hint
        // This makes the decoder spend more time to find and decode barcodes.
        // It can improve reliability but might increase processing time.
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        // --- End Hints Configuration ---

        // Pass the hints map to the BrowserMultiFormatReader constructor
        codeReader = new ZXing.BrowserMultiFormatReader(hints);

        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        let selectedDeviceId;
        if (videoInputDevices.length > 0) {
            selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
            console.log(`Using camera: ${videoInputDevices[videoInputDevices.length - 1].label || 'Default'}`);
        } else {
            throw new Error('No video input devices found.');
        }

        const constraints = {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'continuous',
            // facingMode: 'environment'
        };

        await codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result) {
                console.log('Scanned:', result.text);
                statusDiv.textContent = `Scanned: ${result.text}`;
                handleBarcode(result.text);
                stopScanner();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                statusDiv.textContent = `Error: ${err}`;
            }
        }, constraints);

        statusDiv.textContent = 'Camera started. Point at a barcode.';
    } catch (error) {
        console.error('Error starting camera:', error);
        statusDiv.textContent = `Error accessing camera: ${error.message}`;
        
        startButton.disabled = false;
        stopButton.disabled = true;
        video.style.display = 'none';
        
        if (codeReader) {
            codeReader.reset();
            codeReader = null;
        }
        video.srcObject = null;
        video.load();
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        codeReader = null;
    }
    video.srcObject = null;
    video.load();
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