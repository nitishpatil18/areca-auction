# Troubleshooting

Common issues and fixes.

## Backend won't start

**`MONGO_URI is missing`**
Your `.env` isn't being loaded. Make sure the file is at `backend/.env`, not at the project root. Restart the dev server after editing.

**`Invalid scheme, expected mongodb://`**
The URI is malformed. Common cause: accidentally writing `MONGO_URI=MONGO_URI=mongodb://...` (double prefix). Open `backend/.env` and check the value starts cleanly with `mongodb://` or `mongodb+srv://`.

**`EADDRINUSE :::8000`**
Another process is on port 8000.
```bash
lsof -ti:8000 | xargs kill -9
```
Or change `PORT` in `backend/.env`.

**`chain disabled` warning at startup**
Fine if you're not using blockchain features. To enable: set `RPC_URL`, `ADMIN_PK`, and `CONTRACT_ADDRESS` in `backend/.env`, ensure the Hardhat node is running, and restart the backend.

**`chain init failed`**
Hardhat node isn't running, or the contract address is wrong. Verify with:
```bash
curl -s http://127.0.0.1:8545
```
If connection refused, start the node:
```bash
cd blockchain && npx hardhat node
```

## Auctions

**Stuck in `scheduled`, never goes live**
The auction-closer job is in `backend/src/jobs/auctionCloser.js` and runs every second. It transitions `scheduled → live` when `startAt` is reached and `live → closed` when `endAt` is reached. If it isn't transitioning:
1. Check the backend log for `auction <id> now live`. If absent, restart the backend.
2. Verify your system clock is correct.

**`auction is not live` when bidding**
The auction's `endAt` already passed, or you're trying to bid on a different auction id than the one currently live. Verify with:
```bash
curl -s http://localhost:8000/api/auctions/<id> | jq '.auction | {status, startAt, endAt}'
```

**`bid rejected: outbid or auction closed`**
Either someone bid higher between your check and your submit (atomic update doing its job), or the auction ended. Refresh and retry.

## Frontend

**Can't reach backend (CORS or 404)**
Verify Vite proxy in `vite.config.js`:
```js
proxy: {
  '/api':       { target: 'http://localhost:8000', changeOrigin: true },
  '/socket.io': { target: 'http://localhost:8000', ws: true, changeOrigin: true },
}
```
Restart Vite after editing.

**Token rotated mid-session**
Logout and login again. The token in localStorage may be stale.

## MetaMask + on-chain

**`insufficient ETH for fees`**
Wrong network or wrong account selected.
1. Top of MetaMask must say *Hardhat Local* (chainId 31337)
2. Selected account must be one derived from the test mnemonic (`test test test test test test test test test test test junk`)
3. Use Account 2, not Account 1 (Account 1 is the backend's seller signer)

**`not mirrored on chain`**
The auction was created before the chain integration was working. Backend mirroring only happens at create time. Solution: create a new auction. The old one will continue to work off-chain.

**Hardhat node restarted, contract gone**
Hardhat local chain state is wiped on every restart.
1. Redeploy: `cd blockchain && npx hardhat run scripts/deploy.js --network localhost`
2. Update `CONTRACT_ADDRESS` in both `backend/.env` and `frontend/.env`
3. Re-export ABI: `node scripts/exportAbi.js`
4. Restart backend and frontend
5. In MetaMask: Settings → Advanced → Clear activity tab data
6. Create a new auction (old `onChainAuctionId` references no longer exist)

## PDF invoice

**`failed to load PDF document` in browser**
Either the auction has `finalAmount: null` (no winning bid) or you're not authorized (only winner, farmer, or admin can download). Check via:
```bash
curl -i http://localhost:8000/api/auctions/<id>/invoice -H "Authorization: Bearer <your-token>"
```
A 200 response should return `Content-Type: application/pdf`.

## Tokens, jq, terminal

**`paste-id-here: command not found`**
You typed the literal placeholder. Replace `<paste-id-here>` with the actual id, no angle brackets.

**Email autolinks in pasted commands**
Many chat clients autolink email addresses to `[email@x.com](mailto:email@x.com)` on copy. Type emails by hand, or use a plain-text editor as an intermediate step.

**Variables empty in new terminal tab**
Variables like `$FARMER`, `$BUYER1`, `$AUCTION_ID` are local to a single terminal session. Reset them at the start of each session.