const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const productDisplay = document.getElementById('productDisplay');
const productNameDisplay = document.getElementById('productNameDisplay');
const productPriceDisplay = document.getElementById('productPriceDisplay');
const payButton = document.getElementById('payButton');

let codeReader; // Will hold the ZXing CodeReader instance

const PAYMENT_BASE_URL = 'http://payment.site/'; // IMPORTANT: Change this to your actual payment portal base URL

async function startScanner() {
    startButton.disabled = true;
    stopButton.disabled = false;
    video.style.display = 'block';
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';

    try {
        // Instantiate the code reader first
        codeReader = new ZXing.BrowserMultiFormatReader();

        // Use the instance method to list video input devices
        const videoInputDevices = await codeReader.listVideoInputDevices();
        
        // Find the device ID of the back camera, typically the last one in the list
        let selectedDeviceId;
        if (videoInputDevices.length > 0) {
            // Prefer the last device, which is often the back camera on mobile
            selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
            console.log(`Using camera: ${videoInputDevices[videoInputDevices.length - 1].label || 'Default'}`);
        } else {
            // Fallback if no devices are found, though this is unlikely if getUserMedia works
            throw new Error('No video input devices found.');
        }

        // Now decode from the selected device
        await codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result) {
                console.log('Scanned:', result.text);
                statusDiv.textContent = `Scanned: ${result.text}`;
                handleBarcode(result.text);
                codeReader.reset(); // Stop scanning immediately after a successful scan
                video.style.display = 'none';
                startButton.disabled = false;
                stopButton.disabled = true;
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                statusDiv.textContent = `Error: ${err}`;
            }
        });
        statusDiv.textContent = 'Camera started. Point at a barcode.';
    } catch (error) {
        console.error('Error starting camera:', error);
        statusDiv.textContent = `Error accessing camera: ${error.message}`;
        startButton.disabled = false;
        stopButton.disabled = true;
        video.style.display = 'none';
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
        statusDiv.textContent = 'Camera stopped.';
    }
    video.style.display = 'none';
    startButton.disabled = false;
    stopButton.disabled = true;
    productDisplay.style.display = 'none';
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