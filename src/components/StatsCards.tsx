import React from 'react';
import { Package, DollarSign, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { InventoryStats } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface StatsCardsProps {
  stats: InventoryStats;
  onFilterLowStock: () => void;
  onFilterOutOfStock: () => void;
  onFilterAll: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  onFilterLowStock,
  onFilterOutOfStock,
  onFilterAll,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Valor em Estoque */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 transition-shadow hover:border-slate-300">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Patrimônio em Estoque</span>
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {formatCurrency(stats.totalSalesValue)}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span>Custo total:</span>
          <span className="font-mono font-medium text-slate-700 tabular-nums">
            {formatCurrency(stats.totalCostValue)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-600 font-medium font-mono tabular-nums">
            +{stats.profitMarginPercent}% margem
          </span>
        </div>
      </div>

      {/* Card 2: Quantidade de Produtos */}
      <div 
        onClick={onFilterAll}
        className="bg-white border border-slate-200 rounded-lg p-5 cursor-pointer transition-shadow hover:border-slate-300"
      >
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Volumes & SKUs</span>
          <Package className="w-4 h-4 text-blue-600" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {formatNumber(stats.totalQuantity)} <span className="text-sm font-normal text-slate-500">unidades</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-mono font-medium text-slate-700 tabular-nums">
            {stats.totalItems} SKUs
          </span>
          <span aria-hidden="true">·</span>
          <span>{stats.categoriesCount} categorias ativas</span>
        </div>
      </div>

      {/* Card 3: Alertas de Reposição */}
      <div 
        onClick={onFilterLowStock}
        className={`bg-white border rounded-lg p-5 cursor-pointer transition-colors ${
          stats.lowStockCount > 0
            ? 'border-amber-300 hover:border-amber-400 bg-amber-50/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className={stats.lowStockCount > 0 ? 'text-amber-700 font-semibold' : ''}>
            Estoque Baixo (Reposição)
          </span>
          <AlertTriangle className={`w-4 h-4 ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 tabular-nums">
          {stats.lowStockCount} <span className="text-sm font-normal text-slate-500">itens</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span>Abaixo do limite mínimo</span>
          <span aria-hidden="true">·</span>
          <span className="text-amber-700 font-medium">Atenção requerida</span>
        </div>
      </div>

      {/* Card 4: Produtos Esgotados */}
      <div 
        onClick={onFilterOutOfStock}
        className={`bg-white border rounded-lg p-5 cursor-pointer transition-colors ${
          stats.outOfStockCount > 0
            ? 'border-red-300 hover:border-red-400 bg-red-50/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className={stats.outOfStockCount > 0 ? 'text-red-700 font-semibold' : ''}>
            Itens Esgotados
          </span>
          <AlertTriangle className={`w-4 h-4 ${stats.outOfStockCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-red-600 tabular-nums">
          {stats.outOfStockCount} <span className="text-sm font-normal text-slate-500">zerados</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <span>Sem saldo em estoque</span>
          <span aria-hidden="true">·</span>
          <span className="text-red-600 font-medium">Comprar urgente</span>
        </div>
      </div>
    </div>
  );
};
