# Zenith — XLM Payments

Zenith is a focused, high-performance decentralized application (dApp) built for the Stellar network. It provides a clean, zero-noise interface for sending XLM (Stellar Lumens) from any Freighter-connected wallet to any valid Stellar address.

Designed with a strict 8pt grid system, Zenith offers a premium user experience with both light and dark mode support, real-time transaction validation, and a seamless payment history overview.

## 🚀 Key Features

- **Freighter Wallet Integration:** Securely connect and sign transactions using the [Freighter extension](https://www.freighter.app/).
- **Stellar Testnet Optimized:** Primarily designed for high-speed testing on the Stellar Testnet.
- **Real-Time Data:** Fetched balances, account reserves, and transaction history directly from the Horizon API.
- **Smart Validation:** Automatic checks for recipient accuracy, minimum balance requirements, and network reserves.
- **Transaction History:** Instant feedback and history for incoming and outgoing payments.
- **Modern Aesthetics:** A premium, responsive UI featuring smooth micro-animations and a dark-first design system.

## 📸 Screenshots

### 1. Landing & Connection
The entry point of the application, designed for a fast onboarding experience.

![Zenith Landing Page](./screenshots/landing.png)

### 2. Wallet Connected & Balance
Once connected, Zenith displays the **Wallet connected state** with your available **Balance displayed** (accounting for reserves), alongside the main dashboard layout.

![Zenith Dashboard](./screenshots/dashboard.png)

### 3. Successful Testnet Transaction & Result
Instant feedback for any broadcasted transaction. The **Successful testnet transaction** shows a success screen and **The transaction result is shown to the user** in the permanent history log beneath the form.

![Zenith Transaction Success](./screenshots/success.png)

---

## 🛠️ Local Setup

Follow these steps to run Zenith on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Freighter Wallet Extension](https://www.freighter.app/) (configured to Stellar Testnet)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Zenith
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   Navigate to `http://localhost:5173`.

### Configuration for Testnet

To use Zenith, please ensure your Freighter extension is set to **Test Net**:
1. Click the **Freighter icon** in your browser.
2. Click **Settings (⚙️)** -> **Network**.
3. Select **Test Net**.
4. If you need test XLM, visit the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=testnet) to fund your account.

---

## 🏗️ Technical Stack

- **Framework:** React 18 + Vite
- **Blockchain SDK:** `@stellar/stellar-sdk` & `@stellar/freighter-api`
- **Styling:** Vanilla CSS (8pt Grid System)
- **Icons:** Custom SVG components
- **State Management:** React Context + `useReducer`

## ⚖️ License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
