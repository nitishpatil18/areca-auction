import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as lotApi from '../api/lot.js';
import { imageUrl } from '../lib/urls.js';

const MAX_IMAGES = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

export default function LotImageManager({ lotId, images = [], onChanged }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const slotsLeft = MAX_IMAGES - images.length;

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // client-side checks before hitting backend
    if (files.length > slotsLeft) {
      toast.error(`only ${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left (max ${MAX_IMAGES} per lot)`);
      e.target.value = '';
      return;
    }
    for (const f of files) {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`${f.name}: only JPEG, PNG, or WebP allowed`);
        e.target.value = '';
        return;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: file is over 2MB`);
        e.target.value = '';
        return;
      }
    }

    setBusy(true);
    try {
      await lotApi.uploadImages(lotId, files);
      toast.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded`);
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  async function handleDelete(imgPath) {
    if (!confirm('Delete this image?')) return;
    const filename = imgPath.split('/').pop();
    try {
      await lotApi.deleteImage(lotId, filename);
      toast.success('Image deleted');
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <ImagePlus size={14} /> Lot Images
          <span className="text-xs text-slate-400">({images.length} / {MAX_IMAGES})</span>
        </div>
        {slotsLeft > 0 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="btn-primary text-sm"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {busy ? 'Uploading…' : 'Add Images'}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={handleFiles}
        />
      </div>

      {images.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg flex flex-col items-center gap-2">
          <AlertCircle size={18} className="text-slate-400" />
          No images yet. Add up to {MAX_IMAGES} photos (JPEG / PNG / WebP, max 2MB each).
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {images.map((img) => (
            <div key={img} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
              <img
                src={imageUrl(img)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleDelete(img)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-rose-600"
                title="Delete image"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
