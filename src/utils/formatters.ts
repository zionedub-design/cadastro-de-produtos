import { Product } from '../types/inventory';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export function calculateMargin(price: number, costPrice: number): { percent: number; value: number } {
  const p = Number(price) || 0;
  const c = Number(costPrice) || 0;
  const profit = p - c;
  const percent = c > 0 ? (profit / c) * 100 : (p > 0 ? 100 : 0);
  return {
    percent: Math.round(percent * 10) / 10,
    value: Math.round(profit * 100) / 100,
  };
}

export function generateSuggestedSku(category: string, name: string): string {
  const cleanCat = (category || 'GERAL')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase() || 'PROD';

  const cleanName = (name || 'ITEM')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'ITM';

  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${cleanCat}-${cleanName}-${randomNum}`;
}

export function exportProductsToCSV(products: Product[]): void {
  const headers = ['ID', 'SKU', 'Nome', 'Categoria', 'Preço Venda (R$)', 'Preço Custo (R$)', 'Quantidade', 'Estoque Mínimo', 'Unidade', 'Fornecedor', 'Descrição', 'Atualizado Em'];
  
  const rows = products.map(p => [
    p.id,
    `"${p.sku.replace(/"/g, '""')}"`,
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.category.replace(/"/g, '""')}"`,
    p.price.toFixed(2),
    p.costPrice.toFixed(2),
    p.quantity,
    p.minQuantity,
    p.unit,
    `"${(p.supplier || '').replace(/"/g, '""')}"`,
    `"${(p.description || '').replace(/"/g, '""')}"`,
    p.updatedAt,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `estoque_produtos_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportProductsToJSON(products: Product[]): void {
  const jsonString = JSON.stringify(products, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `backup_estoque_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
