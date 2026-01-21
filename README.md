# WASP-Guard: Offline Spam Email Detection (WASM)

## 🚀 Project Overview
This repository contains an advanced Chrome Extension (Manifest V3) that performs **client-side spam detection** directly within the Gmail interface. 

Unlike traditional extensions that send private email data to a cloud server for analysis, **WASP-Guard** runs a full Python-based inference engine **inside the user's browser** using **WebAssembly (Pyodide)**. This ensures zero data leakage, works offline, and demonstrates the power of edge-computing in web security.

### 🌟 Key Features
- **Privacy First**: No data ever leaves the browser.
- **Serverless Architecture**: 100% client-side execution using Pyodide (Python to WASM).
- **Advanced Heuristics**: Custom Python engine detecting keyword density, entropy (gibberish), urgency patterns, and suspicious link structures.
- **Seamless Integration**: Injects a premium, non-intrusive warning header into Gmail only when threats are detected.

---

## 🛠 Technology Architecture

### 1. The Core: Python via WebAssembly
We utilize **Pyodide**, a port of CPython to WebAssembly, to run a persistent Python environment in a background "Offscreen Document". 
- **Language**: Python 3.11+ (via Pyodide)
- **Execution**: The browser downloads the WASM binary once, caches it, and executes it in a sandboxed thread.
- **Communication**: Javascript (Content Script) -> Background Service Worker -> Offscreen Document (Python) -> Result.

### 2. Chrome Manifest V3
Strictly adheres to the latest MV3 security standards:
- **No Remote Code Execution (Remotely Hosted Code)**: The logic is contained.
- **Offscreen API**: Used to legally run the heavy WASM workload without blocking the main UI thread.

---

## 📂 Project Structure
```
Gmail-WASM-Spam-Detector/
├── manifest.json          # MV3 Configuration
├── background.js          # Service Worker & Message Routing
├── content.js             # DOM Observer & Gmail Injection
├── offscreen.html         # WASM Host Environment
├── offscreen.js           # Pyodide Bridge
├── styles.css             # Premium UI Styles
├── create_icons.py        # Utility to generate assets
├── python/
│   └── spam_engine.py     # The Python Brain (Heuristics & ML Logic)
└── icons/                 # Generated App Icons
```

---

## 💡 Viva / Evaluation Guide

### Q1: Why WebAssembly (WASM)?
**Answer**: 
1.  **Portability**: It allows us to reuse powerful Python data processing libraries (and potentially scikit-learn in V2) directly in the browser without rewriting complex logic in JavaScript.
2.  **Performance**: WASM executes at near-native speed, far outperforming standard JS for heavy computational tasks like entropy calculation or regex scanning on large bodies of text.

### Q2: Why is there no Backend?
**Answer**: 
To eliminate **privacy risks** and **latency**. Sending emails to a backend requires user trust, API keys, and network overhead. By running locally, we guarantee GDPR/CCPA compliance by design—the data physically cannot be intercepted because it never traverses a network.

### Q3: How is this "Advanced"?
**Answer**:
Most browser extensions are simple wrappers around API calls. This project implements a **Browser-Embedded Runtime**. We are essentially shipping a miniature Operating System (CPython) inside the browser tab. We manage inter-process communication (IPC) between the UI thread and the WASM worker, handle memory states, and perform real-time text analysis on dynamic DOM elements.

### Q4: Security & Offline Capability
**Answer**:
- **Security**: The "Sandbox" nature of WASM means the Python code cannot access the file system or arbitrary network endpoints unless explicitly allowed.
- **Offline**: Once the Pyodide/WASM binaries are cached by the Service Worker/Browser Cache, the extension requires ZERO internet connection to function. You can disconnect Wi-Fi and it will still flag spam.

---

## ⚡ How to Install & Test

1. **Clone/Open** this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (top right toggle).
4. Click **Load unpacked** and select this folder (`Gmail-WASM-Spam-Detector`).
5. Open **Gmail** (refresh if already open).
6. Open an email. If it contains suspicious keywords (e.g., "Urgent", "Winner", "Bank", "Wire Transfer"), the **WASP-Guard Shield** will appear.

### Test Cases
- **Spam**: Subject: "URGENT WINNER", Body: "Click here to claim your prize securely via wire transfer!!!" -> **Flags as Spam**.
- **Safe**: Subject: "Meeting notes", Body: "Hi, let's meet tomorrow." -> **No Banner**.

---

## 🔮 Future Scope
- **TensorFlow.js / Scikit-learn**: Upgrade the heuristic engine to a full Random Forest model running in WASM.
- **Outlook/Yahoo Support**: Abstract the DOM extraction layer to support multiple providers.
- **Phishing URL Database**: Bundle a Bloom Filter of known malicious URLs for O(1) lookups.

---
*Engineered by Ratandeep Purohit*
