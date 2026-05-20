import { Link } from 'react-router-dom';
import { Scale, MapPin, Droplets, Tag } from 'lucide-react';

export default function LotCard({ lot }) {
  const statusBadge = {
    listed:     'badge-scheduled',
    in_auction: 'badge-live',
    sold:       'badge-closed',
    cancelled:  'badge-cancelled',
    draft:      'badge-closed',
  }[lot.status] || 'badge-closed';

  const statusLabel = {
    listed: 'Listed',
    in_auction: 'Live',
    sold: 'Sold',
    cancelled: 'Cancelled',
    draft: 'Draft',
  }[lot.status] || lot.status;

  return (
    <Link
      to={`/lots/${lot._id}`}
      className="card p-5 hover:shadow-md hover:border-emerald-200 transition-all group"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg group-hover:text-emerald-700 transition-colors">
              {lot.variety}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
              Grade {lot.grade}
            </span>
          </div>
          <p className="text-sm text-slate-500 truncate">
            By {lot.farmer?.name || '—'}
          </p>
        </div>
        <span className={statusBadge}>
          {lot.status === 'in_auction' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />}
          {statusLabel}
        </span>
      </div>

      <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
        <Row icon={Scale}    label="Weight"     value={`${lot.weightKg} kg`} />
        <Row icon={Tag}      label="Base Price" value={`₹${lot.basePricePerKg}/kg`} highlight />
        <Row icon={MapPin}   label="Region"     value={lot.region} />
        {lot.moisturePct != null && (
          <Row icon={Droplets} label="Moisture" value={`${lot.moisturePct}%`} />
        )}
      </div>
    </Link>
  );
}

function Row({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-slate-500">{label}:</span>
      <span className={`ml-auto font-medium ${highlight ? 'text-emerald-700 font-bold' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}