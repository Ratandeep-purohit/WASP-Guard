/* content.js - Gmail Integration & UI Injection */

// Utility to create the warning banner
function createWarningBanner(result) {
    // Remove existing banners if any
    const existing = document.getElementById('wasp-guard-start-scan-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    // Set ID for the scanning banner so we can remove it later
    if (result.explanation === "Running local Python analysis...") {
        banner.id = 'wasp-guard-start-scan-banner';
    }

    // Determine style class
    let styleClass = 'wg-safe';
    if (result.is_spam || (result.explanation && result.explanation.startsWith('Connection Failed'))) styleClass = 'wg-danger';
    if (result.explanation === "Running local Python analysis...") styleClass = 'wg-scanning';

    banner.className = `wg-banner ${styleClass}`;

    let icon = result.is_spam ? '⚠️' : '🛡️';
    let title = result.is_spam ? 'Potential Spam Detected' : 'Email Verified Safe';

    if (result.explanation === "Running local Python analysis...") {
        icon = '⏳';
        title = 'Analyzing Email...';
    }

    if (result.explanation && result.explanation.startsWith('Connection Failed')) {
        icon = '❌';
        title = 'Analysis Failed';
    }

    banner.innerHTML = `
        <div class="wg-banner-content">
            <div class="wg-icon">${icon}</div>
            <div class="wg-text">
                <div class="wg-header">
                    <strong>${title}</strong>
                    ${result.is_spam && result.confidence_score > 0 ? `<span class="wg-score">Risk: ${result.confidence_score}%</span>` : ''}
                </div>
                ${result.summary ? `<div class="wg-summary" style="margin-bottom:4px; font-weight:500; color:#4a5568;">💡 ${result.summary}</div>` : ''}
                <p class="wg-explanation" style="font-size:13px; color:#718096;">
                    ${result.is_spam ? '⚠️ Triggers: ' : '✅ Status: '} ${result.explanation}
                </p>
            </div>
            <button class="wg-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    return banner;
}

// Function to extract email content
function extractEmailContent() {
    const subjectNode = document.querySelector('h2[data-thread-perm-id]') || document.querySelector('h2.hP');
    const bodyNode = document.querySelector('.a3s.aiL');

    // Debug info
    if (!subjectNode) console.log("WASP-Guard: Subject node not found");
    if (!bodyNode) console.log("WASP-Guard: Body node not found");

    if (!subjectNode && !bodyNode) return null;

    return {
        subject: subjectNode ? subjectNode.innerText : '',
        body: bodyNode ? bodyNode.innerText : '',
        sender: '' // Sender extraction is flaky, optional for now
    };
}

// Helper to inject banner in the right place
function injectBanner(banner) {
    // Strategy 1: The standards container above the email body
    const container = document.querySelector('.nH.hx');

    // Strategy 2: Above the message body wrapper
    const bodyWrapper = document.querySelector('.a3s.aiL');

    // Strategy 3: The subject header container
    const subjectHeader = document.querySelector('h2[data-thread-perm-id]') || document.querySelector('h2.hP');

    if (container) {
        container.insertBefore(banner, container.firstChild);
        console.log("WASP-Guard: Injected banner via Container .nH.hx");
    } else if (subjectHeader && subjectHeader.parentElement) {
        // Inject after subject
        subjectHeader.parentElement.insertBefore(banner, subjectHeader.nextSibling);
        console.log("WASP-Guard: Injected banner via Subject Header");
    } else if (bodyWrapper && bodyWrapper.parentElement) {
        bodyWrapper.parentElement.insertBefore(banner, bodyWrapper);
        console.log("WASP-Guard: Injected banner via Body Wrapper");
    } else {
        console.warn("WASP-Guard: Could not find suitable place to inject banner");
    }
}

// Observer to detect when an email is opened
const observer = new MutationObserver(() => {
    // Check if the URL changed (navigation) or if the specific email view container appeared
    const emailBody = document.querySelector('.a3s.aiL');
    if (emailBody && !document.getElementById('wasp-guard-processed-flag')) {
        // Mark as scanned or ready to scan to avoid infinite loops
        emailBody.setAttribute('id', 'wasp-guard-processed-flag');
        runAnalysis();
    }
});

observer.observe(document.body, { subtree: true, childList: true });

async function runAnalysis() {
    const data = extractEmailContent();
    if (!data) return;

    if (!data.body || data.body.length < 5) return;

    console.log("WASP-Guard: Starting analysis...");

    // 1. Show "Scanning" State
    const scanningBanner = createWarningBanner({
        is_spam: false,
        confidence_score: 0,
        explanation: "Running local Python analysis..."
    });
    injectBanner(scanningBanner);

    // Progressive Feedback Timers
    const timer1 = setTimeout(() => {
        const b = document.getElementById('wasp-guard-start-scan-banner');
        if (b) {
            b.querySelector('.wg-text strong').innerText = 'Initializing WASM Engine...';
            b.querySelector('.wg-explanation').innerText = 'Downloading Python environment (this happens once)...';
        }
    }, 3000);

    const timer2 = setTimeout(() => {
        const b = document.getElementById('wasp-guard-start-scan-banner');
        if (b) {
            b.querySelector('.wg-text strong').innerText = 'Still Loading...';
            b.querySelector('.wg-explanation').innerText = 'Please check internet connection or console logs.';
        }
    }, 12000);

    // 2. Send to background -> offscreen(python)
    chrome.runtime.sendMessage({
        action: 'check_spam',
        data: data
    }, (response) => {
        // Clear timers
        clearTimeout(timer1);
        clearTimeout(timer2);

        // Remove scanning banner
        const existingScan = document.getElementById('wasp-guard-start-scan-banner');
        if (existingScan) existingScan.remove();

        // Check for runtime errors
        if (chrome.runtime.lastError) {
            console.error("WASP-Guard Runtime Error:", chrome.runtime.lastError);
            const errorBanner = createWarningBanner({
                is_spam: false,
                confidence_score: 0,
                explanation: `Connection Failed: ${chrome.runtime.lastError.message}. Reload page.`
            });
            injectBanner(errorBanner);
            return;
        }

        if (response) {
            console.log("WASP-Guard Result:", response);
            // Handle generic error response from background
            if (response.explanation && response.explanation.startsWith("Analysis Failed")) {
                const errorBanner = createWarningBanner({
                    is_spam: false,
                    confidence_score: 0,
                    explanation: response.explanation
                });
                errorBanner.classList.add('wg-danger');
                injectBanner(errorBanner);
                return;
            }

            if (response.is_spam) {
                const banner = createWarningBanner(response);
                injectBanner(banner);
            } else {
                // User requested banner in ALL conditions, including safe
                const banner = createWarningBanner(response);
                injectBanner(banner);
                console.log("WASP-Guard: Email safe, showing green banner.");
            }
        }
    });
}

console.log("WASP-Guard Extension Loaded");
