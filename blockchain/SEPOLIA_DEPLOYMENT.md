# Sepolia Testnet Deployment Guide

## Prerequisites

1. Get free Sepolia ETH from https://sepoliafaucet.com or https://faucets.chain.link/sepolia

2. Get a free RPC endpoint from https://alchemy.com (Ethereum Sepolia network)

3. Create blockchain/.env (never commit this file):
   ALCHEMY_OR_INFURA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   DEPLOYER_PK=0xYOUR_WALLET_PRIVATE_KEY

## Deploy

   cd blockchain
   npx hardhat run scripts/deploy-sepolia.js --network sepolia

## Expected Gas Costs (at ~10 gwei)

| Operation       | Gas Used  | Cost (ETH) |
|----------------|-----------|------------|
| Contract Deploy | ~800,000  | ~0.008     |
| createAuction   | ~80,000   | ~0.0008    |
| placeBid        | ~50,000   | ~0.0005    |
| settleAndClose  | ~60,000   | ~0.0006    |

## Verify on Etherscan

After deployment, view at:
https://sepolia.etherscan.io/address/CONTRACT_ADDRESS

## Note for Paper

The Hardhat local node (chainId: 31337) used in development produces
identical smart contract behaviour to Sepolia. The Sepolia deployment
provides real gas cost measurements and public verifiability.
