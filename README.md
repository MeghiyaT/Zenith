# ⭐ Zenith — XLM Payments

**Live Demo:** [https://zenith-woad.vercel.app/](https://zenith-woad.vercel.app/)
**GitHub Repository:** [https://github.com/MeghiyaT/Zenith](https://github.com/MeghiyaT/Zenith)

[![Zenith CI](https://github.com/MeghiyaT/Zenith/actions/workflows/ci.yml/badge.svg)](https://github.com/MeghiyaT/Zenith/actions/workflows/ci.yml)

Zenith is a focused, high-performance decentralized application (dApp) built for the Stellar network. It provides a clean, zero-noise interface for sending XLM from any Freighter-connected wallet and interacting with a secure Soroban-based Vault.

---

## 📸 Demo & Screenshots

### 📱 Mobile Responsive View
<img src="./screenshots/mobile.png" alt="Mobile Responsive View" width="250">

### 🛠️ Visual Polish
| Landing & Connection | Dashboard & Balance | Success Feedback |
|---|---|---|
| ![Landing Page](./screenshots/landing.png) | ![Dashboard](./screenshots/dashboard.png) | ![Success](./screenshots/success.png) |

---

## 🚀 Key Features

- **Freighter Wallet Integration:** Securely connect and sign transactions using the [Freighter extension](https://www.freighter.app/).
- **Production-Grade Loading:** Shimmering skeleton loaders (1.4s) and unified button spinners for all async states.
- **3-Step Send Flow:** Visual step progress (Contract Recording → Wallet Signing → Network Broadcasting) with pill-shaped indicators.
- **Zenith Vault (v2.0):** Advanced time-locked savings vault featuring **inter-contract calls** to the Stellar Asset Contract (SAC).
- **Mobile First Design:** Fully responsive 8pt grid system.
- **CI/CD Pipeline:** Automated GitHub Actions for Rust contract testing and React frontend.

---

## 📜 Soroban Contracts & Addresses

### 1. Payment Record
**Contract ID:** `CDNGSYWX7GJEYBO7DG4ZKIMYGEKQT3WUL2B7LWA4LBFIOV2H52ZDKO4C`
**Deployment Tx:** [dd2952d591b025b725df2d50395c43662af486dac6d3a18cb9570658814cfc57](https://stellar.expert/explorer/testnet/tx/dd2952d591b025b725df2d50395c43662af486dac6d3a18cb9570658814cfc57)
Logs payment metadata for indexing.

### 2. Zenith Vault (Inter-Contract Calls)
**Contract ID:** `CANRFTYHEFAZWJ2CKHOBXYZWFUCZCF5SWALAXAODAP4FBDEKME664ZU5`
**Deployment Tx:** [354b7917aaa4aefb463f54733b893cae8678a3c3ecc875a4f057971fec763f82](https://stellar.expert/explorer/testnet/tx/354b7917aaa4aefb463f54733b893cae8678a3c3ecc875a4f057971fec763f82)
**Asset Used:** Native XLM Stellar Asset Contract (SAC) `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`

Handles time-locked XLM deposits via inter-contract calls to the Native XLM SAC.

### Contract Functions (Vault)
| Function | Parameters | Description |
|---|---|---|
| `deposit` | `user, token_id, amount` | Transfers tokens from user to vault (Inter-contract call) |
| `withdraw` | `user, token_id, amount` | Transfers tokens back to user after 60s lock |
| `get_balance` | `user, token_id` | Returns the vault balance for a specific user and token |

---

## 🧪 Testing & CI/CD

### Automated Pipeline
Zenith uses GitHub Actions (`.github/workflows/ci.yml`) to ensure every push is production-ready.
- **Frontend:** `npm run test` (Vitest)
- **Contracts:** `cargo test` (Soroban SDK testutils)

### Manual Testing
```bash
# Run contract tests
cd contracts/zenith_vault && cargo test

# Run frontend tests
npm test
```

---

## 📜 Milestone History

### v2.0 — Advanced Ecosystem
- **[bed1cff]** `feat: implement Zenith Vault UI and frontend integration`
- **[dc9d9ae]** `style: enhance mobile responsiveness for dashboard and vault`
- **[241ed9b]** `ci: add zenith ci/cd workflow for contracts and frontend`
- **[f19e4d3]** `feat: refine vault balance fetching and error handling`

### v1.2 — Production Polish
- **[f55758e]** `feat: implement loading states, skeletons, and send flow progress indicator`
- **[ab69cba]** `feat: add in-memory caching for balance, address existence, and contract records`

---

## ⚖️ License
Distributed under the Apache 2.0 License.
