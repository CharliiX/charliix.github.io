const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const productDisplay = document.getElementById('productDisplay');
const productNameDisplay = document.getElementById('productNameDisplay');
const productPriceDisplay = document.getElementById('productPriceDisplay');
const payButton = document.getElementById('payButton');

let codeReader; // Will hold the ZXing CodeReader instance

const PAYMENT_BASE_URL = 'https://payment.site/'; // Ensure this is HTTPS for production/deployment!

async function startScanner() {
    startButton.disabled = true;
    stopButton.disabled = false;
    video.style.display = 'block';
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Starting camera...';

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

        // --- REFINED CONSTRAINTS FOR DECODEFROMVIDEODEVICE ---
        // Pass the constraints directly to decodeFromVideoDevice
        const constraints = {
            deviceId: { exact: selectedDeviceId }, // Explicitly select device
            // Ideal resolution for scanning, can often improve focus behavior
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
                stopScanner();
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error(err);
                statusDiv.textContent = `Error: ${err}`;
            }
        }, constraints); // Pass the constraints object here!
        // --- END REFINED CONSTRAINTS ---

        statusDiv.textContent = 'Camera started. Point at a barcode.';
    } catch (error) {
        console.error('Error starting camera:', error);
        statusDiv.textContent = `Error accessing camera: ${error.message}`;
        startButton.disabled = false;
        stopButton.disabled = true;
        video.style.display = 'none';
        // No need to stop currentStream here, as ZXing-JS manages it internally for this call type
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset(); // This properly stops the camera stream when using decodeFromVideoDevice
    }
    video.srcObject = null; // Clear srcObject to ensure video stops visually
    video.style.display = 'none';
    startButton.disabled = false;
    stopButton.disabled = true;
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Camera stopped.';
}

// ... (handleBarcode, event listeners for startButton, stopButton, payButton are unchanged) ...