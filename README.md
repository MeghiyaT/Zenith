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

### v1.1 Features

- **Payment Tracker:** Real-time outbound payment tracking with SSE-based status updates. Tracks PENDING, CONFIRMED, and FAILED statuses with live badge updates — no page reload required.
- **Watch Addresses:** Monitor up to 5 additional addresses for payment activity during your session.
- **Error Handling:** Three distinct error types handled in the tracker: wallet rejection, destination not found, and network timeout with manual retry.
- **Soroban Contract Integration:** On-chain payment intent recording via a Soroban smart contract deployed to testnet. Each payment logs sender, recipient, amount, and timestamp to the contract before the XLM transfer.
- **3-Step Send Flow:** Visual step progress in the review modal — contract recording → payment signing → network broadcasting.
- **Network Context Banners:** Persistent banners indicating Stellar Testnet and Soroban Testnet connectivity.

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
- **Smart Contracts:** Soroban (Rust) on Stellar Testnet
- **Styling:** Vanilla CSS (8pt Grid System)
- **Icons:** Custom SVG components
- **State Management:** React Context + `useReducer`

## 📜 Soroban Contract

The payment record contract is deployed on the Stellar Soroban testnet. It acts as an on-chain log for payment intents and does not hold any funds.

**Contract ID:** `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2RLGN7V6`

**Network:** Soroban Testnet (`https://soroban-testnet.stellar.org`)

**Functions:**
| Function | Signature | Description |
|---|---|---|
| `record_payment` | `(sender: Address, recipient: Address, amount: i128) -> u32` | Records a payment intent, returns auto-incrementing ID |
| `get_payment` | `(payment_id: u32) -> PaymentRecord` | Retrieves a stored payment record by ID |

**Contract source:** [`contracts/payment_record/src/lib.rs`](./contracts/payment_record/src/lib.rs)

### Building the Contract

```bash
# Requires Rust + soroban-cli
cd contracts/payment_record
cargo build --target wasm32-unknown-unknown --release
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_record.wasm \
  --network testnet
```

## ⚖️ License

Distributed under the Apache 2.0 License. See `LICENSE` for more information.
