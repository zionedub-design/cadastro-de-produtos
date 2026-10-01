import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { Product, MovementType } from '../types/inventory';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirmMovement: (
    productId: string,
    type: MovementType,
    quantity: number,
    reason: string
  ) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirmMovement,
}) => {
  const [type, setType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('Entrada de compra / reposição');
  const [error, setError] = useState<string>('');

  if (!isOpen || !product) return null;

  const handleTypeChange = (newType: MovementType) => {
    setType(newType);
    if (newType === 'in') setReason('Entrada de compra / reposição');
    else if (newType === 'out') setReason('Saída por venda direta');
    else setReason('Ajuste de inventário / contagem');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('A quantidade deve ser um número inteiro positivo.');
      return;
    }

    if (type === 'out' && qty > product.quantity) {
      setError(`Quantidade insuficiente em estoque. O saldo atual é de ${product.quantity} ${product.unit}.`);
      return;
    }

    onConfirmMovement(product.id, type, qty, reason.trim());
    onClose();
  };

  const calculatedNewQty = () => {
    const qty = parseInt(quantity, 10) || 0;
    if (type === 'in') return product.quantity + qty;
    if (type === 'out') return Math.max(0, product.quantity - qty);
    return qty; // For adjustment, sets target quantity
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full overflow-hidden text-slate-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Movimentação de Estoque
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {product.name} ({product.sku})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Movement Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('in')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  type === 'in'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600 mb-1" />
                <span>Entrada (+)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('out')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  type === 'out'
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-red-600 mb-1" />
                <span>Saída (-)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('adjustment')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  type === 'adjustment'
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600 mb-1" />
                <span>Ajuste Balanço</span>
              </button>
            </div>
          </div>

          {/* Current vs Projected quantity indicator */}
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Saldo Atual:</span>
              <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                {product.quantity} {product.unit}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Novo Saldo Projetado:</span>
              <span className="font-mono font-bold text-emerald-700 text-sm tabular-nums">
                {calculatedNewQty()} {product.unit}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {type === 'adjustment' ? 'Nova Quantidade Real Contada' : 'Quantidade a Movimentar'}
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo ou Referência da Movimentação
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra NF-e #1420, Venda direta balcão, Perda por validade..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Confirmar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
