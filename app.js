const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

const productDisplay = document.getElementById('productDisplay');
const productNameDisplay = document.getElementById('productNameDisplay');
const productPriceDisplay = document.getElementById('productPriceDisplay');
const payButton = document.getElementById('payButton');

let codeReader; // Will hold the ZXing CodeReader instance
let currentStream; // To store the MediaStream for applying constraints

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
            selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId;
            console.log(`Using camera: ${videoInputDevices[videoInputDevices.length - 1].label || 'Default'}`);
        } else {
            throw new Error('No video input devices found.');
        }

        // --- NEW FOCUS/CONSTRAINT LOGIC ---
        // Request specific constraints for the camera stream
        const constraints = {
            video: {
                deviceId: selectedDeviceId,
                // Ideal resolution for scanning, can often improve focus behavior
                // Try different values if needed (e.g., { width: 1280, height: 720 })
                // aspect ratio, frameRate, etc.
                width: { ideal: 1920 }, // High width for better detail
                height: { ideal: 1080 }, // High height for better detail
                // Attempt to request continuous autofocus
                focusMode: 'continuous', // This is an experimental/non-standard constraint, may not work everywhere
                // Other potential constraints:
                // advanced: [{ zoom: 2 }], // Experimental zoom
                // facingMode: 'environment' // Explicitly request rear camera
            }
        };

        // Get the media stream with constraints before passing to ZXing
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
        video.play(); // Manually play the video element

        // It's possible to try applying constraints to the track directly AFTER getting the stream
        const track = currentStream.getVideoTracks()[0];
        if (track && 'applyConstraints' in track) {
            try {
                await track.applyConstraints({
                    advanced: [{
                        focusMode: 'continuous',
                        // You can try other things here like ideal zoom levels, etc.
                        // zoom: { ideal: 1.5 } // Example: if supported, request a slight zoom
                    }]
                });
                console.log('Applied advanced camera constraints for focus.');
            } catch (applyErr) {
                console.warn('Failed to apply advanced constraints (e.g., focusMode, zoom):', applyErr);
                // This is often fine, as many browsers don't fully support all advanced constraints
            }
        }
        // --- END NEW FOCUS/CONSTRAINT LOGIC ---

        // Now decode from the video element directly using the prepared stream
        await codeReader.decodeFromVideo(video, (result, err) => { // Use decodeFromVideo(video) instead of decodeFromVideoDevice
            if (result) {
                console.log('Scanned:', result.text);
                statusDiv.textContent = `Scanned: ${result.text}`;
                handleBarcode(result.text);
                stopScanner(); // Use stopScanner to ensure stream is properly closed
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
        if (currentStream) { // Ensure stream is stopped on error
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }
}

function stopScanner() {
    if (codeReader) {
        codeReader.reset();
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop()); // Stop all tracks in the stream
        currentStream = null;
    }
    video.srcObject = null; // Disconnect video element from stream
    video.style.display = 'none';
    startButton.disabled = false;
    stopButton.disabled = true;
    productDisplay.style.display = 'none';
    statusDiv.textContent = 'Camera stopped.';
}

// ... (handleBarcode, event listeners for startButton, stopButton, payButton are unchanged) ...
// Make sure to remove the `selectedDeviceId` argument from `codeReader.decodeFromVideoDevice`
// and instead just pass the `video` element to `codeReader.decodeFromVideo`.
// This is because we are now manually getting the stream.