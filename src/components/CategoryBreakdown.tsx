import React from 'react';
import { Layers, Package, DollarSign } from 'lucide-react';
import { Product } from '../types/inventory';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface CategoryBreakdownProps {
  products: Product[];
  onSelectCategory: (category: string) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  products,
  onSelectCategory,
}) => {
  const categoryStats = React.useMemo(() => {
    const map: Record<
      string,
      { count: number; quantity: number; salesValue: number; costValue: number }
    > = {};

    let totalVal = 0;

    products.forEach((p) => {
      const cat = p.category || 'Geral';
      if (!map[cat]) {
        map[cat] = { count: 0, quantity: 0, salesValue: 0, costValue: 0 };
      }
      map[cat].count += 1;
      map[cat].quantity += p.quantity;
      const val = p.price * p.quantity;
      map[cat].salesValue += val;
      map[cat].costValue += p.costPrice * p.quantity;
      totalVal += val;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      percentOfTotal: totalVal > 0 ? (data.salesValue / totalVal) * 100 : 0,
    })).sort((a, b) => b.salesValue - a.salesValue);
  }, [products]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Distribuição por Categoria
          </h3>
          <p className="text-xs text-slate-500">
            Volume de produtos e valor financeiro concentrado em cada segmento
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {categoryStats.length} categorias ativas
        </div>
      </div>

      <div className="space-y-4">
        {categoryStats.map((cat) => (
          <div
            key={cat.name}
            onClick={() => onSelectCategory(cat.name)}
            className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{cat.name}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{cat.count} SKUs</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono text-slate-600 tabular-nums">
                  {formatNumber(cat.quantity)} un
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {formatCurrency(cat.salesValue)}
                </span>
                <span className="text-2xs text-slate-400 font-mono tabular-nums">
                  ({cat.percentOfTotal.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(4, cat.percentOfTotal))}%` }}
              />
            </div>
          </div>
        ))}

        {categoryStats.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            Nenhuma categoria para exibir no momento.
          </p>
        )}
      </div>
    </div>
  );
};
