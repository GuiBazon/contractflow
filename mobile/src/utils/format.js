export function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateBR(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
