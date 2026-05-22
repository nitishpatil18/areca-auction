import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as lotApi from '../api/lot.js';
import { imageUrl } from '../lib/urls.js';
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

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12 text-slate-500">Loading…</div>;
  if (err)     return <div className="max-w-3xl mx-auto px-4 py-12 text-red-600">{err}</div>;
  if (!lot)    return null;

  const statusLabel = {
    listed: 'Listed',
    in_auction: 'Live',
    sold: 'Sold',
    cancelled: 'Cancelled',
    draft: 'Draft',
  }[lot.status] || lot.status;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{lot.variety} · Grade {lot.grade}</h1>
        <p className="text-slate-500">
          By {lot.farmer?.name || '—'} · {lot.region}
        </p>
      </div>

      {lot.images?.length > 0 && (
        <div className={`grid gap-2 ${lot.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {lot.images.map((img) => (
            <a key={img} href={imageUrl(img)} target="_blank" rel="noreferrer" className="aspect-video sm:aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-300 transition">
              <img src={imageUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </a>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Box label="Weight"     value={`${lot.weightKg} kg`} />
        <Box label="Base Price" value={`₹${lot.basePricePerKg}/kg`} />
        <Box label="Moisture"   value={lot.moisturePct != null ? `${lot.moisturePct}%` : '—'} />
        <Box label="Status"     value={statusLabel} />
      </div>

      {lot.description && (
        <p className="text-slate-700">{lot.description}</p>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Auction</h2>
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
          <p className="text-slate-500 text-sm">No auction scheduled for this lot.</p>
        )}
      </div>
    </div>
  );
}

function Box({ label, value }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}