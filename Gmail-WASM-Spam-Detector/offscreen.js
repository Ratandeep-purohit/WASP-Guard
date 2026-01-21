// Offscreen script to handle Pyodide and Python execution

// 1. Register Listener IMMEDIATELY
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
        sendResponse({ status: 'ok', pythonLoaded: pythonLoaded });
        return false;
    }

    if (message.action === 'analyze_email') {
        analyzeEmail(message.data, sendResponse);
        return true;
    }
});

let pyodide = null;
let pythonLoaded = false;
let loadingPromise = null;

async function loadPyodideAndPackages() {
    if (pythonLoaded) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        try {
            console.log("Initializing Pyodide (Local Mode)...");

            if (typeof loadPyodide === 'undefined') {
                throw new Error("loadPyodide is undefined. Check if lib/pyodide.js is loaded.");
            }

            // Load Pyodide from LOCAL resources (lib/)
            // We MUST specify indexURL to point to the extension's lib folder
            // otherwise it might try relative paths which fail in some contexts
            pyodide = await loadPyodide({
                indexURL: chrome.runtime.getURL("lib/"),
                // If local lock file is present, it might be looked up automatically, 
                // but explicitness helps if logic differs.
                env: { HOME: "/tmp" } // Fix for some file system issues in older pyodide
            });

            // Load the engine script
            const response = await fetch(chrome.runtime.getURL('python/spam_engine.py'));
            const pythonCode = await response.text();

            await pyodide.runPythonAsync(pythonCode);

            pythonLoaded = true;
            console.log("Python engine loaded successfully.");
            return true;
        } catch (err) {
            console.error("Failed to load Pyodide:", err);
            pythonLoaded = false;
            loadingPromise = null;
            throw err;
        }
    })();

    return loadingPromise;
}

// Start loading immediately
loadPyodideAndPackages();

async function analyzeEmail(data, sendResponse) {
    try {
        await loadPyodideAndPackages();

        const { subject, body, sender } = data;

        pyodide.globals.set("py_subject", subject);
        pyodide.globals.set("py_body", body);
        pyodide.globals.set("py_sender", sender);

        const resultProxy = await pyodide.runPythonAsync(`
            import json
            result = check_spam(py_subject, py_body, py_sender)
            json.dumps(result)
        `);

        const result = JSON.parse(resultProxy);
        sendResponse(result);

    } catch (error) {
        console.error("Python Execution Error: ", error);
        sendResponse({
            is_spam: false,
            confidence_score: 0,
            explanation: `Engine Error: ${error.message || "WASM Failed"}`
        });
    }
}
