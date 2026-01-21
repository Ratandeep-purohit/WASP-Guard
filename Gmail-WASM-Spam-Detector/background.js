// Helper to race a promise with a timeout
function timeoutPromise(ms, promise) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Timeout waiting for analysis (WASM Loading?)"));
        }, ms);
        promise.then((res) => {
            clearTimeout(timer);
            resolve(res);
        }).catch((err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// Background Service Worker
let creating;

async function setupOffscreenDocument(path) {
    // Check if an offscreen document already exists using getContexts
    if (chrome.runtime.getContexts) {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [path]
        });
        if (existingContexts.length > 0) return;
    }

    // Try to create it, capturing the specific error if it already exists (race condition protection)
    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['WORKERS'],
            justification: 'Run Pyodide for spam detection',
        }).catch(err => {
            if (err.message.includes('Only a single offscreen')) {
                // Determine if this is actually a problem or just a race
                console.log("Offscreen doc already exists, moving on.");
                return;
            }
            throw err;
        });
        await creating;
        creating = null;
    }
}

// New Helper: Wait for Offscreen to be "Listening"
async function waitForOffscreenReady() {
    await setupOffscreenDocument('offscreen.html');

    // Poll up to 5 times with 1s delay
    for (let i = 0; i < 5; i++) {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'ping' });
            if (response && response.status === 'ok') {
                return true;
            }
        } catch (e) {
            // Ignore error, offscreen might still be initializing script
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("Offscreen document failed to initialize");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'check_spam') {
        handleSpamCheck(request.data, sendResponse);
        return true;
    }
});

async function handleSpamCheck(data, sendResponse) {
    try {
        // 1. Ensure Offscreen is Ready & Listening
        await waitForOffscreenReady();

        // 2. Send Data with LONG timeout (60s for download)
        // We use a keep-alive interval to prevent Service Worker death while waiting
        const keepAlive = setInterval(() => {
            // Trivial fetch to keep SW active? 
            // Or mostly relying on the promise await. logic
            // In MV3, prolonged await can still die. 
            // We just hope 60s is enough.
        }, 20000);

        const response = await timeoutPromise(60000, chrome.runtime.sendMessage({
            action: 'analyze_email',
            data: data
        }));

        clearInterval(keepAlive);

        if (response && response.is_spam) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Spam Detected',
                message: `Confidence: ${response.confidence_score}%\n${response.explanation}`,
                priority: 2
            });
        }

        sendResponse(response);
    } catch (err) {
        console.error("Failed to contact offscreen:", err);
        sendResponse({
            is_spam: false,
            confidence_score: 0,
            explanation: `Analysis Failed: ${err.message}`
        });
    }
}
