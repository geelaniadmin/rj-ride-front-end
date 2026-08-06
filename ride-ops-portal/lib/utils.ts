/** Format minor units (cents) as dollars. Kept currency-neutral for legacy callers. */
export function formatMinor(minor: number): string {
  return `$${(minor / 100).toFixed(2)}`;
}

export function maskPii(value: string): string {
  if (value.length <= 2) return '***';
  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
