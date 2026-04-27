import api from './client.js';

export const listAuctions = (params) => api.get('/auctions', { params }).then(r => r.data);
export const getAuction   = (id)     => api.get(`/auctions/${id}`).then(r => r.data);
export const bidHistory   = (id)     => api.get(`/auctions/${id}/bids`).then(r => r.data);
export const createAuction = (data)  => api.post('/auctions', data).then(r => r.data);
export const placeBid     = (id, d)  => api.post(`/auctions/${id}/bids`, d).then(r => r.data);
export const cancelAuction = (id)    => api.post(`/auctions/${id}/cancel`).then(r => r.data);
export const myBids = () => api.get('/auctions/my/bids').then(r => r.data);

export function invoiceUrl(auctionId) {
  const token = localStorage.getItem('token');
  // browser handles the download via a fetch+blob to inject auth header,
  // since you can't put headers on <a href>. helper below.
  return { auctionId, token };
}

export async function downloadInvoice(auctionId) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/auctions/${auctionId}/invoice`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'failed to download invoice');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${auctionId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}