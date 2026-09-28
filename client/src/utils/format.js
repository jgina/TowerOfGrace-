const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value) => nairaFormatter.format(Number(value) || 0);

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', options);
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : formatDate(value);
}

export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const humanize = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

export const compactNumber = (value) =>
  new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

export function priceRange(product) {
  if (!product) return '';
  const { priceFrom, priceTo } = product;
  if (priceFrom && priceTo && priceTo > priceFrom) return `${formatCurrency(priceFrom)} – ${formatCurrency(priceTo)}`;
  return formatCurrency(priceFrom ?? product.effectivePrice ?? product.price);
}

export const whatsappLink = (number, text = '') => {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
