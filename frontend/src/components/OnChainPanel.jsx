import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { connectWallet, getReadOnlyContract, hasMetaMask } from '../lib/web3.js';

export default function OnChainPanel({ onChainAuctionId, basePricePerKg, weightKg }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [chainState, setChainState] = useState(null);
  const [bidEth, setBidEth] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // load on-chain state once
  useEffect(() => {
    if (!onChainAuctionId) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await getReadOnlyContract();
        if (!c) return;
        const a = await c.getAuction(onChainAuctionId);
        if (cancelled) return;
        setChainState({
          seller: a[0],
          basePriceEth: ethers.formatEther(a[1]),
          highestBidEth: ethers.formatEther(a[2]),
          highestBidder: a[3],
          endTime: Number(a[4]),
          closed: a[5],
        });
      } catch (e) {
        setMsg('could not read chain state: ' + e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [onChainAuctionId, busy]);

  async function connect() {
    setBusy(true); setMsg('');
    try {
      const { address } = await connectWallet();
      setWalletAddress(address);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function placeBidOnChain(e) {
    e.preventDefault();
    if (!bidEth) return;
    setBusy(true); setMsg('');
    try {
      const { contract } = await connectWallet();
      const valueWei = ethers.parseEther(bidEth);
      const tx = await contract.placeBid(onChainAuctionId, { value: valueWei });
      setMsg(`tx submitted: ${tx.hash.slice(0, 12)}... waiting for confirmation`);
      await tx.wait();
      setMsg(`bid confirmed on chain: ${bidEth} ETH`);
      setBidEth('');
    } catch (e) {
      setMsg('on-chain bid failed: ' + (e.shortMessage || e.message));
    } finally {
      setBusy(false);
    }
  }

  if (!onChainAuctionId) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded p-4 text-sm text-amber-800">
        not mirrored on chain. (created before chain was up, or chain init failed)
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded bg-white p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">on-chain mirror</h3>
          <p className="text-xs text-slate-500">contract auction id: {onChainAuctionId}</p>
        </div>
        {hasMetaMask() && !walletAddress && (
          <button onClick={connect} disabled={busy} className="text-sm px-3 py-1 border border-slate-300 rounded">
            connect metamask
          </button>
        )}
        {walletAddress && (
          <span className="text-xs font-mono text-slate-500">
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </span>
        )}
      </div>

      {!hasMetaMask() && (
        <div className="text-sm text-slate-500 mb-3">
          metamask not installed. install from metamask.io to bid on-chain.
        </div>
      )}

      {chainState && (
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <Stat label="base price" value={`${chainState.basePriceEth} ETH`} />
          <Stat label="highest bid" value={`${chainState.highestBidEth} ETH`} />
          <Stat label="bidder" value={
            chainState.highestBidder === ethers.ZeroAddress
              ? '—'
              : `${chainState.highestBidder.slice(0, 6)}…${chainState.highestBidder.slice(-4)}`
          } />
          <Stat label="status" value={chainState.closed ? 'closed' : 'open'} />
        </div>
      )}

      {walletAddress && chainState && !chainState.closed && (
        <form onSubmit={placeBidOnChain} className="flex gap-2">
          <input
            type="number" step="0.0001" min="0"
            placeholder="amount in ETH"
            value={bidEth}
            onChange={(e) => setBidEth(e.target.value)}
            className="flex-1 border border-slate-300 rounded px-3 py-2"
            required
          />
          <button disabled={busy} className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-60">
            {busy ? 'sending...' : 'bid on-chain'}
          </button>
        </form>
      )}

      {msg && <div className="text-sm mt-3 text-slate-600">{msg}</div>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="font-mono mt-1">{value}</div>
    </div>
  );
}