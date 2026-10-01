import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, SlidersHorizontal, Search, Trash2 } from 'lucide-react';
import { StockMovement } from '../types/inventory';
import { formatDate } from '../utils/formatters';

interface MovementsHistoryProps {
  movements: StockMovement[];
  onClearHistory: () => void;
}

export const MovementsHistory: React.FC<MovementsHistoryProps> = ({
  movements,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por produto ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Segmented Filter */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('in')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                typeFilter === 'in' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter('out')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                typeFilter === 'out' ? 'bg-white text-red-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saídas
            </button>
            <button
              onClick={() => setTypeFilter('adjustment')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                typeFilter === 'adjustment' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ajustes
            </button>
          </div>

          {movements.length > 0 && (
            <button
              onClick={onClearHistory}
              title="Limpar histórico"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-semibold">
              <th className="py-2.5 px-4">Data/Hora</th>
              <th className="py-2.5 px-4">Tipo</th>
              <th className="py-2.5 px-4">Produto</th>
              <th className="py-2.5 px-4 text-right">Qtd Movimentada</th>
              <th className="py-2.5 px-4 text-right">Saldo Anterior → Novo</th>
              <th className="py-2.5 px-4">Motivo / Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Nenhuma movimentação registrada no histórico.
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const isEntry = m.type === 'in';
                const isExit = m.type === 'out';
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 font-mono tabular-nums whitespace-nowrap">
                      {formatDate(m.date)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isEntry && (
                          <span className="flex items-center gap-1 text-emerald-700 font-medium">
                            <ArrowDownRight className="w-3.5 h-3.5" /> Entrada
                          </span>
                        )}
                        {isExit && (
                          <span className="flex items-center gap-1 text-red-700 font-medium">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Saída
                          </span>
                        )}
                        {m.type === 'adjustment' && (
                          <span className="flex items-center gap-1 text-blue-700 font-medium">
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Ajuste
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {m.productName}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums ${
                      isEntry ? 'text-emerald-700' : isExit ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {isEntry ? `+${m.quantity}` : isExit ? `-${m.quantity}` : `${m.quantity}`}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 tabular-nums">
                      <span>{m.previousQuantity}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-semibold text-slate-800">{m.newQuantity}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate" title={m.reason}>
                      {m.reason || 'Sem observação'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
