# PriceForge

### Stop overpaying for games.

PriceForge is a Steam browser extension that analyses game prices and tells you **whether now is a good time to buy**.

Instead of simply showing a price, PriceForge looks at recent pricing behaviour and gives you a clear **BUY NOW, GOOD TIME, or WAIT** verdict.

<img width="1562" height="770" alt="image" src="https://github.com/user-attachments/assets/3cee0297-a83f-46a9-9e9a-c28a1c13e86b" />
<img width="1565" height="779" alt="image" src="https://github.com/user-attachments/assets/3223f7d1-a063-4004-90e0-b017c6765852" />
<img width="1570" height="773" alt="image" src="https://github.com/user-attachments/assets/4b87c9df-439b-40f9-9921-07284f398914" />
<img width="1573" height="778" alt="image" src="https://github.com/user-attachments/assets/b0f87c08-fafa-4e4e-a00c-768f86f2dcde" />
<img width="1563" height="775" alt="image" src="https://github.com/user-attachments/assets/639525e8-d79f-4c44-842c-43a795cdb7a2" />




---

## ✨ Features

* 🎯 **Price Verdicts** — BUY NOW, GOOD TIME, or WAIT
* 💬 **Human-readable explanations** — understand *why* the verdict was given
* 📊 **Price Analysis** — compare the current price with normal and sale prices
* 📉 **3-month price history** — see recent pricing trends
* 💰 **Typical Sale Price** — identify what the game usually costs during sales
* 🏆 **Recent Low** — compare against the lowest recent price
* 📅 **Sale Frequency** — see how often the game tends to go on sale
* 🔑 **Cheaper Key Check** — see whether a cheaper game key is currently available
* 🔽 **Collapsible Interface** — minimise PriceForge when you don't need it
* 🐛 **Bug Reporting** — quickly flag problems through the built-in feedback link
* ☕ **Developer Support** — optional Buy Me a Coffee link

---

## 🧠 How It Works

PriceForge combines Steam's current price with historical pricing data from **IsThereAnyDeal**.

The PriceForge Verdict Engine analyses signals such as:

* Current price
* Normal price
* Typical sale price
* Recent lowest price
* Average price
* Sale frequency
* Time since the last sale
* Previous prices below the current price

These signals are then used to produce a simple verdict.

> **BUY NOW**
> The current price is unusually good compared with recent pricing.

> **GOOD TIME**
> The price is reasonable and represents a good opportunity.

> **WAIT**
> The game has recently been cheaper or the current price is relatively high.

The goal is to make price history **easy to understand**, rather than forcing users to interpret charts themselves.

---

## 🖥️ Designed for Steam

PriceForge appears directly on Steam game pages without changing the Steam experience.

The interface is designed to be:

* Minimal
* Fast
* Non-intrusive
* Easy to understand
* Consistent with Steam's dark aesthetic

The extension UI is isolated using **Shadow DOM** to minimise conflicts with Steam's existing styles.

---

## 🔧 Architecture

PriceForge currently consists of:

```text
Steam
  ↓
Chrome Extension
  ↓
Background Service Worker - Render
  ↓
PriceForge API
  ↓
IsThereAnyDeal
  ↓
Verdict Engine
  ↓
PriceForge UI
```

The extension handles the Steam interface, while the backend processes pricing data and generates the verdict.

---

## 📁 Project Structure

```text
priceforge-extension/
│
├── content.js
├── background.js
├── manifest.json
├── test.png
│
└── server/
    └── ...
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/patrykgawrysiak/priceforge-extension.git
```

### 2. Load the extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Select **Load unpacked**
5. Choose the PriceForge project folder

### 3. Start the backend

Run the API server from the `server` directory.

The extension currently connects to the local development API.

---

## 🛣️ Roadmap

PriceForge is still in early development.

Planned improvements include:

* More intelligent sale-cadence analysis
* Better confidence scoring
* More detailed price insights
* Improved verdict explanations
* Expanded external store/key comparisons
* Hosted production API
* Chrome Web Store release
* Potential affiliate integration

The long-term goal is to make PriceForge a **proper price intelligence tool for Steam**, rather than just another price tracker.

---

## 🐛 Feedback

Found a problem?

Use the **Flag a bug** link inside PriceForge to report it.

---

## ☕ Support

If you find PriceForge useful and want to support development:

**Buy Me a Coffee:**
https://www.buymeacoffee.com/pgdev

---

## ⚠️ Disclaimer

PriceForge provides price analysis and recommendations based on available pricing data. Prices and availability can change at any time.

PriceForge is an independent project and is **not affiliated with Valve or Steam**.

---

## 📄 License

This project is currently intended as an independent development project.
