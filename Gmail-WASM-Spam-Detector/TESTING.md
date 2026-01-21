# 🧪 Testing Guide: Gmail WASM Spam Detector

This guide will help you verify the "WASP-Guard" extension.

## 1. Installation
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer Mode** (top right switch).
3. Click **Load unpacked**.
4. Select the folder: `d:\projects\Chrome-extension\Gmail-WASM-Spam-Detector`.

## 2. Verify Background Workers
1. In the extensions page, look for the "WASP-Guard (WASM)" card.
2. You should see "Service worker" and possibly "Offscreen document" (inactive until used).
3. Click "service worker" to open the DevTools for the background script.
   - Go to the **Console** tab.
   - Keep this open to see logs.

## 3. Real-World Testing in Gmail
1. Open [Gmail](https://mail.google.com).
2. Refresh the page to ensure the content script is loaded.
3. Open an email.

### ✅ Test Case A: Safe Email
- **Action**: Open a normal email from a friend or service.
- **Expected Result**: 
    - No banner should appear.
    - (Optional) Check the DevTools console (F12 on Gmail tab) -> You should see "WASP-Guard Result: { is_spam: false, ... }".

### ✅ Test Case B: Simulated Spam
Since you might not have a perfect spam email handy, you can "Inspect Element" to trick the detector for testing purposes.

1. Open any email.
2. Right-click the body text and select **Inspect**.
3. Find the div with class `a3s aiL` (the email body).
4. **Edit as HTML** and paste the following:
   ```html
   <div class="a3s aiL">
       <h2>URGENT: WINNER ANNOUNCEMENT</h2>
       <p>You have won a generic PRIZE! Click here to claim immediately via WIRE TRANSFER.</p>
       <p>Account verification required. Act now!</p>
       <p>Contact: admin@192.168.1.1</p>
   </div>
   ```
5. Click somewhere else to apply the change.
6. The extension observes DOM changes. It might trigger automatically, or you might need to refresh and try to send a "Spam" email to yourself with these keywords:
   - **Subject**: URGENT WINNER WIRE TRANSFER
   - **Body**: Please verify your account immediately to claim your prize. Act now! Bank details required.

- **Expected Result**:
    - A **Red Warning Banner** will slide down at the top of the email.
    - A **System Notification** will appear in the corner of your screen.
    - The console will log "Potential Spam Detected".

## 4. Troubleshooting
- **"Analysis service unavailable"**: This means the Offscreen document (Python) crashed or didn't load. Reload the extension in `chrome://extensions`.
- **Pyodide Loading**: The first run might take a few seconds to fetch Pyodide from the CDN. Subsequent runs will use the cache.
