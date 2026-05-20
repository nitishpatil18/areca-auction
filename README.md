# Areca Auction Platform

[![backend ci](https://github.com/nitishpatil18/areca-auction/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/nitishpatil18/areca-auction/actions/workflows/backend-ci.yml)


Real-time arecanut auction system with blockchain integration. Built as a final-year project, Computer Science and Engineering (AI & ML), Ramaiah Institute of Technology.

A hybrid platform where farmers list arecanut lots, buyers bid in real-time via WebSockets, and every auction is mirrored on the Ethereum blockchain for tamper-proof records.

---

## Features

### For farmers
- List arecanut lots with variety, grade, weight, region, moisture details
- Schedule auctions with custom start time and duration
- View earnings and download PDF invoices for sold lots
- Real-time view of bids on active auctions

### For buyers
- Browse lots with filters (variety, grade, region, price)
- Place bids in real-time with millisecond updates
- Wallet system with held/available balance tracking
- View bid history with status (winning, outbid, won, lost)
- Bid on-chain via MetaMask
- Download PDF invoices for won auctions

### For admins
- User management with role assignment
- Force-close auctions and resolve disputes
- View all auctions and on-chain references
- Dashboard with platform-wide statistics

### Platform features
- Real-time bidding via Socket.IO
- Atomic bid handling preventing race conditions
- Anti-snipe (auctions extend 30s on last-second bids)
- Ethereum smart contract integration with reentrancy-safe pull payments
- Analytics dashboard with price trends, regional comparison, bid activity
- PDF invoice generation with blockchain audit trail
- JWT authentication with role-based access control

---

## Architecture
+-------------+    REST + WebSocket    +-------------+   Mongoose   +---------+
|  React UI   | <--------------------> |   Express   | <----------> | MongoDB |
| (port 5173) |                        | (port 8000) |              +---------+
+------+------+                        +------+------+
|                                      |
| MetaMask + ethers v6                 | ethers v6 (admin signer)
v                                      v
+----------------------------------------------------+
|        Hardhat Local Node (port 8545)              |
|        ArecaAuction.sol smart contract             |
+----------------------------------------------------+

**Off-chain (fast layer)**: lots, users, bids, wallet balances, real-time bidding via WebSockets.
**On-chain (trust layer)**: tamper-proof auction record, settled bids, pull-payment refunds.

This hybrid approach gives users millisecond-fast bidding while preserving cryptographic auditability.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Redux Toolkit, React Router, Socket.IO client, ethers v6, Recharts, Lucide icons, react-hot-toast |
| Backend | Node.js 22, Express, Mongoose, Socket.IO, JWT, bcrypt, Joi, Helmet, ethers v6, PDFKit |
| Database | MongoDB |
| Blockchain | Solidity 0.8.24, Hardhat 2, Ethereum |
| Dev | nodemon, mongosh, MetaMask |

---

## Prerequisites

- Node.js v22 (LTS). Use `nvm` if you need to switch.
- MongoDB running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI.
- MetaMask browser extension (for on-chain bidding).
- macOS / Linux / WSL.

---

## Setup

### 1. Clone and install

```bash
git clone <repository-url> areca-auction
cd areca-auction

cd backend     && npm install && cd ..
cd frontend    && npm install && cd ..
cd blockchain  && npm install && cd ..
```

### 2. Configure environment

Create three `.env` files:

**`backend/.env`**

```env
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017/areca
JWT_SECRET=<generate one: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_EXPIRES=7d
CORS_ORIGIN=http://localhost:5173
RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=
ADMIN_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
MIN_BID_INCREMENT=1
ANTISNIPE_WINDOW_MS=30000
ANTISNIPE_EXTEND_MS=30000
```

**`frontend/.env`**

```env
VITE_API_URL=/api
VITE_SOCKET_URL=
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=
```

**`blockchain/.env`**

```env
ALCHEMY_OR_INFURA_RPC=
DEPLOYER_PK=
```

Leave blockchain env empty for local-only development.

### 3. Start the local blockchain

```bash
cd blockchain
npx hardhat node
```

Leave running. It boots a chain on port 8545 with 20 pre-funded test accounts.

### 4. Deploy the contract

In another terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
node scripts/exportAbi.js
```

The deploy script prints a contract address. Paste it into:
- `backend/.env` as `CONTRACT_ADDRESS=...`
- `frontend/.env` as `VITE_CONTRACT_ADDRESS=...`

### 5. Start the backend

```bash
cd backend
npm run dev
```

Expected log:
INFO  mongo connected
INFO  chain connected to http://127.0.0.1:8545 (chainId 31337), contract 0x...
INFO  server listening on http://localhost:8000

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Demo flow

### Off-chain bidding

1. Register a farmer at `/register` with role *farmer*
2. Register two buyers with role *buyer*
3. Each buyer tops up their wallet at `/buyer` (e.g. ₹100,000)
4. As farmer, go to `/farmer`, create a lot, click *schedule auction* (1 min start, 5 min duration)
5. Open the lot detail page in two browser tabs as different buyers
6. Wait for status to flip from *scheduled* to *live*
7. Bid in either tab. The other updates instantly with a toast notification.
8. After end time, both tabs show *closed* and wallet balances settle automatically.

### On-chain bidding

1. Install MetaMask, import test mnemonic: `test test test test test test test test test test test junk`
2. Switch to Hardhat Local network (chainId 31337, RPC `http://127.0.0.1:8545`)
3. Use Account 2 (Account 1 is the seller and cannot bid on its own auctions)
4. On the lot detail page, scroll to *on-chain mirror*
5. Click *connect MetaMask*, approve the network switch
6. Enter ETH amount, click *bid on-chain*, confirm in MetaMask

### Anti-snipe demo

Schedule a 2-minute auction. Wait until ~25 seconds remain. Place a bid. The timer extends back to 30 seconds and a toast announces *auction extended · last-second bid*.

---

## API reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register a farmer or buyer |
| POST | `/api/auth/login` | — | Get a JWT token |
| GET | `/api/auth/me` | yes | Get current user |

### Lots

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lots` | — | Browse with filters: `variety`, `grade`, `region`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` |
| GET | `/api/lots/:id` | — | Lot detail |
| GET | `/api/lots/mine` | farmer | List my lots |
| POST | `/api/lots` | farmer | Create lot |
| PATCH | `/api/lots/:id` | farmer | Update lot |
| DELETE | `/api/lots/:id` | farmer | Delete lot |

### Auctions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auctions` | — | List auctions (filter by `status`) |
| GET | `/api/auctions/:id` | — | Auction detail |
| GET | `/api/auctions/:id/bids` | — | Bid history |
| GET | `/api/auctions/:id/invoice` | yes | Download PDF invoice (winner, farmer, or admin only) |
| GET | `/api/auctions/my/bids` | buyer | My bid history with status |
| POST | `/api/auctions` | farmer | Schedule auction (mirrors on-chain) |
| POST | `/api/auctions/:id/bids` | buyer | Place a bid |
| POST | `/api/auctions/:id/cancel` | farmer/admin | Cancel scheduled auction |

### Wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wallet` | yes | Get balance, held amount, available |
| POST | `/api/wallet/topup` | yes | Mock payment top-up |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/summary` | — | Aggregated platform stats |
| GET | `/api/analytics/trends` | — | Price trends by variety (last 90 days) |
| GET | `/api/analytics/regions` | — | Regional price comparison |
| GET | `/api/analytics/activity` | — | Bid frequency per day (last 30 days) |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | admin | Dashboard statistics |
| GET | `/api/admin/users` | admin | List all users |
| PATCH | `/api/admin/users/:id/role` | admin | Change user role |
| GET | `/api/admin/auctions` | admin | List all auctions |
| POST | `/api/admin/auctions/:id/close` | admin | Force close an auction |

---

## WebSocket events

Clients authenticate via `auth: { token }` in the connection handshake.

### Client → server

| Event | Payload | Description |
|-------|---------|-------------|
| `auction:join` | `auctionId: string` | Subscribe to live updates |
| `auction:leave` | `auctionId: string` | Unsubscribe |
| `bid:place` | `{ auctionId, pricePerKg }` | Place a bid (acks with `{ ok, error? }`) |

### Server → client (broadcast to room)

| Event | Payload |
|-------|---------|
| `bid:new` | `{ auctionId, pricePerKg, highestBidder, bidCount, at }` |
| `auction:started` | `{ auctionId, endAt }` |
| `auction:closed` | `{ auctionId, winner, finalPricePerKg, finalAmount }` |
| `auction:extended` | `{ auctionId, endAt }` |

---

## Smart contract

`ArecaAuction.sol` deployed on Hardhat local chain (chainId 31337, port 8545).

| Function | Description |
|----------|-------------|
| `createAuction(basePrice, endTime)` | Create an auction, returns the auction id |
| `placeBid(id) payable` | Place a bid; must be greater than current highest, not from the seller |
| `closeAuction(id)` | Close after `endTime`; pays seller |
| `withdraw()` | Losing bidders pull their refund (reentrancy-safe pattern) |
| `getAuction(id)` | View helper for full auction state |

Run the test suite:

```bash
cd blockchain
npx hardhat test
```

Expected: 10 tests passing.

---

## Promote a user to admin

```bash
mongosh
use areca
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
exit
```

Logout and login again to get a fresh JWT containing `role: admin`.

---

## Key technical decisions

### Race-free bidding via atomic Mongo update

The bid path uses `Auction.findOneAndUpdate()` with a conditional filter:

```js
{ _id: auctionId, status: 'live', endAt: { $gt: now },
  currentBidPerKg: { $lt: pricePerKg } }
```

Concurrent bids at the same price collapse to a single winner because MongoDB enforces the `$lt` predicate atomically at the document level. No optimistic locking, no transactions needed for the hot path.

### Reentrancy-safe contract via pull payments

Instead of pushing refunds to outbid buyers (which would expose the contract to reentrancy attacks), losing bidders' funds are queued in `pendingReturns` and the bidder calls `withdraw()` themselves. The `withdraw()` function follows the checks-effects-interactions pattern, zeroing the bidder's balance before the external call.

### Hybrid on-chain / off-chain architecture

Real-time bidding (off-chain) handles the hot path with millisecond latency. Auction creation and settlement are mirrored on-chain for tamper-proof audit trails. This avoids the cost and latency of putting every bid on-chain (each Ethereum transaction takes seconds and costs gas) while preserving cryptographic verifiability for the events that matter.

### Anti-snipe (soft close)

Bids landing in the last 30 seconds extend `endAt` by 30 seconds. Prevents last-second snipe wins and gives all participants a fair chance to respond. The extension is broadcast to all connected clients via the `auction:extended` socket event.

---

## Folder structure
areca-auction/
├── README.md
├── TROUBLESHOOTING.md
├── .gitignore
├── backend/
│   ├── .env, .env.example
│   ├── package.json
│   ├── public/
│   │   └── auction.html      # legacy demo page (pre-React)
│   └── src/
│       ├── server.js, app.js
│       ├── config/db.js
│       ├── models/           # User, Lot, Auction, Bid, Transaction
│       ├── controllers/      # auth, lot, auction, wallet, admin, analytics, invoice
│       ├── services/         # authService, bidService, auctionService, chainService, walletService, invoiceService
│       ├── routes/
│       ├── middleware/       # auth, role, validate, error
│       ├── sockets/          # auctionSocket
│       ├── jobs/             # auctionCloser (scheduled → live → closed)
│       ├── utils/            # logger, httpError
│       ├── validators/       # joi schemas
│       └── abi/              # contract ABI (generated)
├── frontend/
│   ├── .env
│   ├── package.json, vite.config.js, tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx, App.jsx, index.css
│       ├── pages/            # Login, Register, Home, BrowseLots, LotDetail, FarmerDashboard, BuyerDashboard, MyBids, Admin, Analytics
│       ├── components/       # Navbar, LotCard, AuctionRoom, OnChainPanel, ProtectedRoute, CountdownTimer, PriceChart
│       ├── store/            # Redux slices
│       ├── hooks/            # useSocket
│       ├── api/              # axios wrappers
│       ├── lib/              # web3.js
│       └── abi/              # contract ABI (generated)
└── blockchain/
├── .env
├── package.json, hardhat.config.js
├── contracts/
│   └── ArecaAuction.sol
├── scripts/              # deploy.js, exportAbi.js
└── test/
└── areca.test.js     # 10 unit tests

---

## Edge cases handled

- Simultaneous bids on the same auction → atomic update collapses to single winner
- Late bids near auction end → anti-snipe extends timer 30s
- Bids below minimum (base price + increment) → rejected with helpful error
- Insufficient wallet balance → rejected, accounting for amounts already held on other live auctions
- Farmer attempting to bid on own auction → rejected at smart contract and off-chain
- Buyer attempting to create lots → rejected by role middleware
- Lot deletion during active auction → blocked
- Direct API access without JWT → 401 from auth middleware
- Cross-tab session sync → token persisted in localStorage, rehydrated on reload
- Auction creation with chain offline → falls back gracefully (auction works off-chain only)

---

## Acknowledgments

- Atomic bid update pattern adapted from typical MongoDB optimistic concurrency control idioms
- Pull-payment auction pattern follows the [Solidity documentation recommendation](https://docs.soliditylang.org/en/latest/common-patterns.html#withdrawal-from-contracts) for reentrancy-safe ether refunds
- Hardhat default test mnemonic is industry-standard for local Ethereum development

---

## License

Academic project. Not licensed for commercial use.
