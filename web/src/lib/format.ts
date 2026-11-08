export function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export function formatTime(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDate(value)} ${hours}:${minutes}`;
}

export function formatPrice(value: number): string {
  return `¥${Number(value).toFixed(0)}`;
}

export function padNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function readingMinutes(content: string): number {
  return Math.max(1, Math.round(content.replace(/\s/g, "").length / 400));
}
