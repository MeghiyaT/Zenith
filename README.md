# ⭐ Zenith

A minimal Stellar payment dApp. Send XLM, track transactions, and log payments on-chain via a Soroban smart contract.

---

## Live Demo

[https://zenith-stellar.vercel.app](https://zenith-stellar.vercel.app)

> If not yet deployed, this URL will be updated before milestone sign-off.

---

## Demo Video

[Watch the 1-minute demo on Loom](https://loom.com/share/placeholder)

> The video covers: wallet connect, sending XLM with the 3-step progress indicator, the tracker confirming a payment, an inline validation error, and `npm test` passing with 3 suites.

---

## Features

- Send XLM to any Stellar address with real-time status
- Track outbound payments with live SSE updates
- On-chain payment logging via Soroban contract on testnet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Blockchain SDK | `@stellar/stellar-sdk` |
| Wallet | `@stellar/freighter-api` |
| Smart Contracts | Soroban (Rust) on Stellar Testnet |
| Styling | Vanilla CSS (8pt grid system) |
| Icons | Custom SVG components |
| State Management | React Context + `useReducer` |
| Testing | Vitest |

---

## Getting Started

### Prerequisites

- Node 18+
- npm
- [Freighter browser extension](https://www.freighter.app/) configured to Stellar Testnet

### Local Setup

```bash
git clone https://github.com/yourusername/zenith
cd zenith
npm install
cp .env.example .env
# Fill in VITE_WALLETCONNECT_PROJECT_ID and VITE_CONTRACT_ID
npm run dev
```

Navigate to `http://localhost:5173`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect v2 project ID |
| `VITE_CONTRACT_ID` | Yes | Deployed Soroban contract address on testnet |
| `VITE_HORIZON_URL` | No | Defaults to `https://horizon-testnet.stellar.org` |
| `VITE_SOROBAN_RPC_URL` | No | Defaults to `https://soroban-testnet.stellar.org` |

An `.env.example` file is in the repo root with all four variables present but with empty values.

---

## Contract

**Contract ID (testnet):** `CDQK7PDQQIDV25QN6XDEGFD3SADJCXIT5KAJ566OBGUBGWA74MPUTQUK`

**Network:** Stellar Testnet

**Functions:**

| Function | Parameters | Returns | Description |
|---|---|---|---|
| `record_payment` | `sender: Address, recipient: Address, amount: i128` | `u32` | Records a payment intent and returns an auto-incrementing ID |
| `get_payment` | `payment_id: u32` | `PaymentRecord` | Retrieves a stored payment record by ID |

**How to redeploy:**

```bash
# Requires Rust + stellar CLI
cd contracts/payment_record
cargo build --target wasm32-unknown-unknown --release

stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/payment_record.wasm \
  --source <your-secret-key-or-alias> \
  --network testnet

# Copy the returned contract address into VITE_CONTRACT_ID in your .env
```

---

## Running Tests

```bash
npm test
```

Expected output: 3 test files, 13 tests passing, 0 failures.

```
RUN  v4.x
 ✓ src/__tests__/validation.test.ts (5 tests)
 ✓ src/__tests__/format.test.ts (4 tests)
 ✓ src/__tests__/cache.test.ts (4 tests)

 Test Files  3 passed (3)
      Tests  13 passed (13)
```

---

## Commit History

### v1.2 Milestone Commits

**Commit 1 — `feat: implement loading states, skeletons, and send flow progress indicator`**
Replaced all spinner placeholders with spec-compliant skeleton loaders. Implemented the 3-step horizontal pill progress row in the review modal. Added the SSE connection status indicator to the tracker header. Enforced 150ms/100ms transition timing constants across all animated elements.

**Commit 2 — `feat: add in-memory caching for balance, address existence, and contract records`**
Extracted `src/lib/cache.js` utility with `get`/`set`/`invalidate` and per-entry TTL. Wired balance fetching with a 15-second TTL and immediate post-send invalidation. Wired address existence checks with a 60-second TTL. Wired immutable contract record caching with infinite TTL.

**Commit 3 — `test: add validation, cache, and amount formatting test suites`**
`src/__tests__/validation.test.ts` — 5 cases for `isValidStellarAddress`. `src/__tests__/cache.test.ts` — 4 cases for cache get/set/invalidate/TTL with fake timers. `src/__tests__/format.test.ts` — 4 cases for `formatXLM` stroop conversion. All 13 tests pass with `npm test`, zero failures.

**Commit 4 — `docs: add complete README, .env.example, and demo video link`**
Complete 12-section README with all required content. `.env.example` with all 4 environment variables. Demo video link embedded in section 3.

---

## Known Limitations

- Testnet contract only — mainnet deployment is not in scope
- Tracker clears on page reload (sessionStorage)
- WalletConnect mobile support is best-effort on iOS Safari

---

## License

MIT
