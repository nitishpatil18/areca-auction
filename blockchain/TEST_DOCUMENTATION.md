# ArecaAuction Smart Contract — Test Case Documentation

23 Hardhat unit tests covering the full auction lifecycle.
Run with: `cd blockchain && npx hardhat test`

## Test Case Table

| # | Test Case | Category | Expected Outcome |
|---|-----------|----------|-----------------|
| 1 | creates an auction | Auction Creation | Auction stored with correct seller, basePrice, highestBid=0, closed=false |
| 2 | rejects bids below base price | Bid Validation | Reverts with "bid too low" |
| 3 | accepts a valid bid | Bid Placement | Emits BidPlaced event; highestBid and highestBidder updated |
| 4 | rejects a bid not higher than current | Bid Validation | Reverts with "bid too low" when bid equals current highest |
| 5 | refunds previous high bidder via pendingReturns | Refund Mechanism | Previous bidder's amount added to pendingReturns mapping |
| 6 | lets a refunded bidder withdraw | Pull Payment | Bidder receives exact refund minus gas; pendingReturns set to 0 |
| 7 | rejects bids from the seller | Access Control | Reverts with "seller cannot bid" |
| 8 | rejects close before end time | Settlement Timing | Reverts with "not yet" |
| 9 | closes after end time and pays seller | Settlement | Seller receives winning bid amount; auction marked closed |
| 10 | rejects bids on a closed auction | State Machine | Reverts with "closed" |
| 11 | does NOT extend endTime for early bids | Anti-Snipe | endTime unchanged when bid placed outside anti-snipe window |
| 12 | extends endTime when bid lands in anti-snipe window | Anti-Snipe | endTime extended by ANTISNIPE_EXTEND (30s) on last-second bid |
| 13 | emits AuctionExtended when anti-snipe fires | Anti-Snipe Events | AuctionExtended event emitted with new endTime |
| 14 | does NOT emit AuctionExtended on normal bid | Anti-Snipe Events | No AuctionExtended event on bid placed outside window |
| 15 | keeps extending on consecutive last-second bids | Anti-Snipe | Each last-second bid pushes endTime further forward |
| 16 | lets the seller cancel an auction with no bids | Cancellation | Emits AuctionCancelled; cancelled flag set to true |
| 17 | rejects cancel from non-seller | Access Control | Reverts with "only seller" |
| 18 | rejects cancel if any bid was placed | Cancellation Guard | Reverts with "has bids" — protects bidders |
| 19 | rejects double-cancel | State Machine | Reverts with "already cancelled" |
| 20 | rejects bids on a cancelled auction | State Machine | Reverts with "cancelled" |
| 21 | rejects close on a cancelled auction | State Machine | Reverts with "cancelled" |
| 22 | emits AuctionCreated with correct args | Event Verification | AuctionCreated event contains correct id, seller, basePrice, endTime |
| 23 | getAuction returns the cancelled field | Data Integrity | cancelled field correctly reflects state before and after cancellation |

## Coverage Summary

| Category | Tests | Coverage |
|---|---|---|
| Auction Creation | 2 | createAuction, AuctionCreated event |
| Bid Validation | 3 | min increment, seller restriction, closed/cancelled guards |
| Bid Placement | 1 | state update, BidPlaced event |
| Refund Mechanism | 2 | pendingReturns update, pull-payment withdraw |
| Settlement | 2 | timing enforcement, seller payment, closed flag |
| Anti-Snipe | 5 | extension trigger, extension amount, event emission, consecutive bids |
| Cancellation | 4 | happy path, access control, bid guard, double-cancel |
| State Machine | 3 | closed/cancelled guards across all operations |
| Event Verification | 1 | AuctionCreated event args |

## Gas Costs (Sepolia Testnet — measured empirically)

| Operation | Gas Used | Cost (ETH at ~10 gwei) |
|---|---|---|
| Contract Deploy | 866,912 | 0.00087 ETH |
| createAuction | 115,289 | 0.00012 ETH |
| placeBid | 55,915 | 0.00006 ETH |
| closeAuction | 40,392 | 0.00004 ETH |

Deployed on Sepolia at: `0x01395Ff5b9E0623026d66D6D603EF71A356D19D0`
Verify: https://sepolia.etherscan.io/address/0x01395Ff5b9E0623026d66D6D603EF71A356D19D0
