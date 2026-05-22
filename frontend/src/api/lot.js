import api from './client.js';

export const listLots   = (params) => api.get('/lots', { params }).then(r => r.data);
export const getLot     = (id)     => api.get(`/lots/${id}`).then(r => r.data);
export const myLots     = ()       => api.get('/lots/mine').then(r => r.data);
export const createLot  = (data)   => api.post('/lots', data).then(r => r.data);
export const updateLot  = (id, d)  => api.patch(`/lots/${id}`, d).then(r => r.data);
export const deleteLot  = (id)     => api.delete(`/lots/${id}`).then(r => r.data);

export const uploadImages = (id, files) => {
  const fd = new FormData();
  for (const f of files) fd.append('images', f);
  return api.post(`/lots/${id}/images`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const deleteImage  = (id, filename) => api.delete(`/lots/${id}/images/${filename}`).then(r => r.data);
