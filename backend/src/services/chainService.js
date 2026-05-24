import { ethers } from 'ethers';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let provider = null;
let wallet = null;
let contract = null;

export function isChainEnabled() {
  return Boolean(provider && contract && wallet);
}

export async function initChain() {
  const rpc = process.env.RPC_URL;
  const pk = process.env.ADMIN_PK;
  const address = process.env.CONTRACT_ADDRESS;

  if (!rpc || !pk || !address) {
    logger.warn('chain disabled: missing env', { missing: ['RPC_URL','ADMIN_PK','CONTRACT_ADDRESS'].filter(k => !process.env[k]) });
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(rpc);
    wallet = new ethers.Wallet(pk, provider);

    const abiPath = path.resolve(__dirname, '../abi/ArecaAuction.json');
    const { abi } = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

    contract = new ethers.Contract(address, abi, wallet);

    const net = await provider.getNetwork();
    logger.info('chain connected', { rpc, chainId: Number(net.chainId), contract: address });
  } catch (e) {
    logger.error('chain init failed', { error: e.message });
    provider = null; wallet = null; contract = null;
  }
}

/**
 * mirror an off-chain auction onto the contract.
 * returns { onChainAuctionId, txHash } or null if chain disabled / failed.
 */
export async function createOnChainAuction({ basePricePerKg, weightKg, endAt }) {
  if (!isChainEnabled()) return null;
  try {
    const basePriceWei = ethers.parseEther(String(basePricePerKg * weightKg / 1e6 || 0.001));
    const endTimeSec = BigInt(Math.floor(new Date(endAt).getTime() / 1000));

    const tx = await contract.createAuction(basePriceWei, endTimeSec);
    const receipt = await tx.wait();

    // pull the AuctionCreated event to find the new id
    const log = receipt.logs.find((l) => {
      try { return contract.interface.parseLog(l)?.name === 'AuctionCreated'; }
      catch { return false; }
    });
    const parsed = contract.interface.parseLog(log);
    const onChainId = Number(parsed.args.id);

    return { onChainAuctionId: onChainId, txHash: receipt.hash };
  } catch (e) {
    logger.error('createOnChainAuction failed', { error: e.message });
    return null;
  }
}

export async function closeOnChainAuction(onChainAuctionId) {
  if (!isChainEnabled()) return null;
  try {
    const tx = await contract.closeAuction(onChainAuctionId);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  } catch (e) {
    logger.error('closeOnChainAuction failed', { error: e.message });
    return null;
  }
}

export async function getOnChainAuction(onChainAuctionId) {
  if (!isChainEnabled()) return null;
  try {
    const a = await contract.getAuction(onChainAuctionId);
    return {
      seller: a[0],
      basePrice: a[1].toString(),
      highestBid: a[2].toString(),
      highestBidder: a[3],
      endTime: Number(a[4]),
      closed: a[5],
    };
  } catch {
    return null;
  }
}

export function getContractAddress() {
  return process.env.CONTRACT_ADDRESS || null;
}