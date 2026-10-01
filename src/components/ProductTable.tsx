import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ArrowLeftRight
} from 'lucide-react';
import { Product } from '../types/inventory';
import { formatCurrency } from '../utils/formatters';

interface ProductTableProps {
  products: Product[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  statusFilter: 'all' | 'normal' | 'low' | 'out';
  setStatusFilter: (filter: 'all' | 'normal' | 'low' | 'out') => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onDuplicateProduct: (product: Product) => void;
  onQuickAdjustQuantity: (productId: string, delta: number) => void;
  onOpenMovementModal: (product: Product) => void;
  onOpenNewProduct: () => void;
  isConnectedToSupabase?: boolean;
  supabaseUrl?: string | null;
}

type SortField = 'name' | 'category' | 'price' | 'costPrice' | 'quantity' | 'totalValue';
type SortDirection = 'asc' | 'desc';

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  statusFilter,
  setStatusFilter,
  onEditProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onQuickAdjustQuantity,
  onOpenMovementModal,
  onOpenNewProduct,
  isConnectedToSupabase = false,
  supabaseUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Search filter
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          (product.supplier && product.supplier.toLowerCase().includes(query)) ||
          product.category.toLowerCase().includes(query);

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || product.category === selectedCategory;

        // Status filter
        let matchesStatus = true;
        if (statusFilter === 'normal') {
          matchesStatus = product.quantity > product.minQuantity;
        } else if (statusFilter === 'low') {
          matchesStatus = product.quantity <= product.minQuantity && product.quantity > 0;
        } else if (statusFilter === 'out') {
          matchesStatus = product.quantity === 0;
        }

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof Product];
        let valB: any = b[sortField as keyof Product];

        if (sortField === 'totalValue') {
          valA = a.price * a.quantity;
          valB = b.price * b.quantity;
        }

        if (typeof valA === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  }, [products, searchTerm, selectedCategory, statusFilter, sortField, sortDirection]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 inline ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-900 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900 inline ml-1" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por produto, SKU, categoria ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
          />
        </div>

        {/* Filter Controls: Category & Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 hidden sm:inline">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Todas as Categorias ({products.length})</option>
              {categories.map((cat) => {
                const count = products.filter(p => p.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Segmented Control */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('normal')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'normal'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'low'
                  ? 'bg-white text-amber-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Baixo
            </button>
            <button
              onClick={() => setStatusFilter('out')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'out'
                  ? 'bg-white text-red-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zerado
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Density Product Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold select-none">
              <th
                onClick={() => handleSort('name')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                Produto & SKU {renderSortIndicator('name')}
              </th>
              <th
                onClick={() => handleSort('category')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                Categoria {renderSortIndicator('category')}
              </th>
              <th
                onClick={() => handleSort('price')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                Preço Venda {renderSortIndicator('price')}
              </th>
              <th
                onClick={() => handleSort('costPrice')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition-colors hidden sm:table-cell"
              >
                Preço Custo {renderSortIndicator('costPrice')}
              </th>
              <th
                onClick={() => handleSort('quantity')}
                className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                Saldo Estoque {renderSortIndicator('quantity')}
              </th>
              <th
                onClick={() => handleSort('totalValue')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition-colors hidden md:table-cell"
              >
                Valor Total {renderSortIndicator('totalValue')}
              </th>
              <th className="py-2.5 px-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-500">
                  {products.length === 0 ? (
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600 mb-2">
                        <Layers className="w-5 h-5 text-slate-600" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Estoque Inicial Pronto no cadastreprod
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Nenhum produto pré-carregado. Comece cadastrando seus produtos manualmente com código/SKU, categoria e preço de venda.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={onOpenNewProduct}
                          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs"
                        >
                          + Cadastrar Primeiro Produto Manualmente
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-700">Nenhum produto encontrado no filtro atual</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Tente ajustar sua busca ou limpar os filtros de categoria/status.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenNewProduct}
                        className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                      >
                        + Cadastrar Novo Produto
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredAndSortedProducts.map((product) => {
                const isOutOfStock = product.quantity === 0;
                const isLowStock = product.quantity <= product.minQuantity && !isOutOfStock;
                const totalItemValue = product.price * product.quantity;

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isOutOfStock ? 'bg-red-50/30' : isLowStock ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Produto & SKU */}
                    <td className="py-2.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={product.name}>
                        {product.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-2xs text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">{product.sku}</span>
                        {product.supplier && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[140px]">{product.supplier}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      <span>{product.category}</span>
                    </td>

                    {/* Preço de Venda */}
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </td>

                    {/* Preço de Custo */}
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap hidden sm:table-cell">
                      {formatCurrency(product.costPrice)}
                    </td>

                    {/* Saldo Estoque + Ajuste Rápido */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Quick decrement button */}
                        <button
                          type="button"
                          onClick={() => onQuickAdjustQuantity(product.id, -1)}
                          disabled={product.quantity <= 0}
                          title="Diminuir 1 unidade"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <div className="min-w-16 text-center">
                          <span
                            className={`font-mono font-bold text-xs tabular-nums ${
                              isOutOfStock
                                ? 'text-red-600'
                                : isLowStock
                                ? 'text-amber-700'
                                : 'text-slate-800'
                            }`}
                          >
                            {product.quantity}
                          </span>
                          <span className="text-2xs text-slate-500 ml-1">{product.unit}</span>
                          
                          {/* Text status for accessibility (zero-pill discipline) */}
                          {isOutOfStock && (
                            <span className="block text-3xs font-semibold text-red-600 uppercase tracking-wider">
                              Esgotado
                            </span>
                          )}
                          {isLowStock && (
                            <span className="block text-3xs font-medium text-amber-700">
                              Mín: {product.minQuantity}
                            </span>
                          )}
                        </div>

                        {/* Quick increment button */}
                        <button
                          type="button"
                          onClick={() => onQuickAdjustQuantity(product.id, 1)}
                          title="Adicionar 1 unidade"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Valor Total */}
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 tabular-nums whitespace-nowrap hidden md:table-cell">
                      {formatCurrency(totalItemValue)}
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenMovementModal(product)}
                          title="Registrar Movimentação (Entrada/Saída)"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDuplicateProduct(product)}
                          title="Duplicar Produto"
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          title="Editar Cadastro"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product.id)}
                          title="Excluir Produto"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Count */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
        <span>
          Mostrando <strong className="font-semibold text-slate-800">{filteredAndSortedProducts.length}</strong> de{' '}
          <strong className="font-semibold text-slate-800">{products.length}</strong> produtos
        </span>
        <div className="flex items-center gap-3">
          <span>
            Saldo total filtrado:{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              {filteredAndSortedProducts.reduce((sum, p) => sum + p.quantity, 0)} un
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Valor total filtrado:{' '}
            <strong className="font-mono text-slate-800 tabular-nums">
              {formatCurrency(filteredAndSortedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0))}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
