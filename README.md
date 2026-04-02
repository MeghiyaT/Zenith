# ⭐ Zenith — XLM Payments

**Live Demo:** [https://zenith-woad.vercel.app/](https://zenith-woad.vercel.app/)

Zenith is a focused, high-performance decentralized application (dApp) built for the Stellar network. It provides a clean, zero-noise interface for sending XLM (Stellar Lumens) from any Freighter-connected wallet to any valid Stellar address.

Designed with a strict 8pt grid system, Zenith offers a premium user experience with both light and dark mode support, real-time transaction validation, and a seamless payment history overview.

---

## 📸 Demo & Screenshots

### 🎥 Demo Video
[Watch the 1-minute v1.2 demo on Loom](https://www.loom.com/share/bba83a3f3e89489f8118bd3bd3c3475d)
> *Covers: Wallet connect, 3-step progress pills, SSE tracker status, and passing Vitest suite.*

### 🛠️ Visual Polish
| Landing & Connection | Dashboard & Balance | Success Feedback |
|---|---|---|
| ![Landing Page](./screenshots/landing.png) | ![Dashboard](./screenshots/dashboard.png) | ![Success](./screenshots/success.png) |

---

## 🚀 Key Features

- **Freighter Wallet Integration:** Securely connect and sign transactions using the [Freighter extension](https://www.freighter.app/).
- **Production-Grade Loading:** Shimmering skeleton loaders (1.4s) and unified button spinners for all async states.
- **3-Step Send Flow:** Visual step progress (Contract Recording → Wallet Signing → Network Broadcasting) with pill-shaped indicators.
- **Real-Time Payment Tracker:** SSE-based status updates for PENDING, CONFIRMED, and FAILED states with a live connectivity indicator.
- **In-Memory Caching:** High-performance caching layer for account balances (15s), address existence (60s), and contract records.
- **Smart Validation:** Real-time checks for recipient syntax, account existence, and reserve requirements.

---

## 🛠️ Local Setup

### Prerequisites
- Node.js (v18+)
- [Freighter Wallet Extension](https://www.freighter.app/) (configured to Stellar Testnet)

### Installation
1. **Clone & Install:**
   ```bash
   git clone <repository-url>
   cd Zenith
   npm install
   ```
2. **Environment Setup:**
   ```bash
   cp .env.example .env
   # Add your VITE_WALLETCONNECT_PROJECT_ID and VITE_CONTRACT_ID
   ```
3. **Run:**
   ```bash
   npm run dev
   ```

---

## 🏗️ Technical Stack

- **Framework:** React 18 + Vite
- **Blockchain SDK:** `@stellar/stellar-sdk` & `@stellar/freighter-api`
- **Smart Contracts:** Soroban (Rust) on Stellar Testnet
- **Testing:** Vitest (13 passing tests)
- **Styling:** Vanilla CSS (8pt Grid System)

---

## 📜 Soroban Contract

**Contract ID (Testnet):** `CDQK7PDQQIDV25QN6XDEGFD3SADJCXIT5KAJ566OBGUBGWA74MPUTQUK`

**Example Contract Call Transaction Hash:**
[`c0f6bfa592260cb772b5ccb7f743a761520b93f9b20abb26a2985070d3b1306b`](https://stellar.expert/explorer/testnet/tx/c0f6bfa592260cb772b5ccb7f743a761520b93f9b20abb26a2985070d3b1306b)

### Contract Functions
| Function | Parameters | Description |
|---|---|---|
| `record_payment` | `sender, recipient, amount` | Logs payment intent on-chain; returns unique ID |
| `get_payment` | `payment_id` | Retrieves a stored payment intent record |

### Building & Deploying
```bash
# Requires Rust + stellar-cli
cd contracts/payment_record
cargo build --target wasm32-unknown-unknown --release
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_record.wasm \
  --network testnet
```

---

## 🧪 Testing

All critical utilities are covered by a Vitest suite. Run them with:
```bash
npm test
```
- **validation.test.ts:** 5 cases for address syntax.
- **format.test.ts:** 4 cases for XLM/Stroop precision.
- **cache.test.ts:** 4 cases for TTL and invalidation logic.

---

## 📜 v1.2 Milestone History

- **[f55758e]** `feat: implement loading states, skeletons, and send flow progress indicator`
- **[ab69cba]** `feat: add in-memory caching for balance, address existence, and contract records`
- **[bda6d5d]** `test: add validation, cache, and amount formatting test suites`
- **[32ea4aa]** `docs: add complete README, .env.example, and demo video link`

---

## ⚖️ License
Distributed under the Apache 2.0 License.
