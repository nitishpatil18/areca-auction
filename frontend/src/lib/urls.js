// strip the /api suffix to get the backend origin
function origin() {
  const base = import.meta.env.VITE_API_URL || '/api';
  return base.replace(/\/api\/?$/, '');
}

// resolve a path returned by the backend (e.g. '/uploads/lots/abc.jpg')
// to a fully qualified url the browser can request directly.
export function imageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return origin() + path;
}
