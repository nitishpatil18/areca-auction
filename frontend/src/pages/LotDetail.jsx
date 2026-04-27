import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as lotApi from '../api/lot.js';
import * as auctionApi from '../api/auction.js';
import AuctionRoom from '../components/AuctionRoom.jsx';
import OnChainPanel from '../components/OnChainPanel.jsx';

export default function LotDetail() {
  const { id } = useParams();
  const [lot, setLot] = useState(null);
  const [auction, setAuction] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setErr('');
      try {
        const lotRes = await lotApi.getLot(id);
        if (cancelled) return;
        setLot(lotRes.lot);

        // try to find an auction for this lot
        const all = await auctionApi.listAuctions();
        if (cancelled) return;
        const matching = all.items.find((a) => a.lot?._id === id);
        setAuction(matching || null);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-slate-500">loading…</div>;
  if (err)     return <div className="max-w-3xl mx-auto px-4 py-12 text-red-600">{err}</div>;
  if (!lot)    return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{lot.variety} · grade {lot.grade}</h1>
        <p className="text-slate-500">
          by {lot.farmer?.name || '—'} · {lot.region}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Box label="weight"     value={`${lot.weightKg} kg`} />
        <Box label="base price" value={`₹${lot.basePricePerKg}/kg`} />
        <Box label="moisture"   value={lot.moisturePct != null ? `${lot.moisturePct}%` : '—'} />
        <Box label="status"     value={lot.status} />
      </div>

      {lot.description && (
        <p className="text-slate-700">{lot.description}</p>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">auction</h2>
        {auction ? (
            <div className="space-y-4">
                <AuctionRoom auction={auction} lot={lot} />
                <OnChainPanel
                    onChainAuctionId={auction.onChainAuctionId}
                    basePricePerKg={auction.basePricePerKg}
                    weightKg={lot.weightKg}
                />
            </div>
        ) : (
            <p className="text-slate-500 text-sm">no auction scheduled for this lot.</p>
        )}
      </div>
    </div>
  );
}

function Box({ label, value }) {
  return (
    <div className="border border-slate-200 rounded p-3 bg-white">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}