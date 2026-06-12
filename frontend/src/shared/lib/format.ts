export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function formatRoomStatus(status: string): string {
  const labels: Record<string, string> = {
    finished: 'Selesai',
    playing: 'Berlangsung',
    waiting: 'Menunggu',
  };

  return labels[status] ?? status;
}
