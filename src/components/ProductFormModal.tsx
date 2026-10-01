import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { Product, UnitType } from '../types/inventory';
import { calculateMargin, generateSuggestedSku, formatCurrency } from '../utils/formatters';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  productToEdit?: Product | null;
  existingCategories: string[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  existingCategories,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [minQuantity, setMinQuantity] = useState<string>('5');
  const [unit, setUnit] = useState<UnitType>('un');
  const [supplier, setSupplier] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      if (existingCategories.includes(productToEdit.category)) {
        setCategory(productToEdit.category);
        setIsCustomCategory(false);
      } else {
        setCategory('custom');
        setIsCustomCategory(true);
        setCustomCategory(productToEdit.category);
      }
      setPrice(productToEdit.price.toString());
      setCostPrice(productToEdit.costPrice.toString());
      setQuantity(productToEdit.quantity.toString());
      setMinQuantity(productToEdit.minQuantity.toString());
      setUnit(productToEdit.unit);
      setSupplier(productToEdit.supplier || '');
      setDescription(productToEdit.description || '');
      setErrors({});
    } else {
      resetForm();
    }
  }, [productToEdit, isOpen]);

  const resetForm = () => {
    setName('');
    setSku('');
    setCategory(existingCategories[0] || 'Geral');
    setIsCustomCategory(false);
    setCustomCategory('');
    setPrice('');
    setCostPrice('');
    setQuantity('10');
    setMinQuantity('5');
    setUnit('un');
    setSupplier('');
    setDescription('');
    setErrors({});
  };

  if (!isOpen) return null;

  const handleGenerateSku = () => {
    const finalCat = isCustomCategory ? customCategory : category;
    const generated = generateSuggestedSku(finalCat, name);
    setSku(generated);
    if (errors.sku) {
      setErrors(prev => ({ ...prev, sku: '' }));
    }
  };

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCategory(true);
      setCategory('custom');
    } else {
      setIsCustomCategory(false);
      setCategory(val);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'O nome do produto é obrigatório.';
    if (!sku.trim()) newErrors.sku = 'O código SKU é obrigatório.';
    
    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();
    if (!finalCategory) newErrors.category = 'Selecione ou informe uma categoria.';

    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Informe um preço de venda válido maior que zero.';
    }

    const parsedCost = costPrice ? parseFloat(costPrice.replace(',', '.')) : 0;
    if (isNaN(parsedCost) || parsedCost < 0) {
      newErrors.costPrice = 'Informe um preço de custo válido.';
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      newErrors.quantity = 'A quantidade em estoque deve ser um número maior ou igual a zero.';
    }

    const parsedMin = parseInt(minQuantity, 10);
    if (isNaN(parsedMin) || parsedMin < 0) {
      newErrors.minQuantity = 'O estoque mínimo deve ser maior ou igual a zero.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCategory = isCustomCategory ? customCategory.trim() : category.trim();
    const parsedPrice = parseFloat(price.replace(',', '.'));
    const parsedCost = costPrice ? parseFloat(costPrice.replace(',', '.')) : 0;
    const parsedQty = parseInt(quantity, 10) || 0;
    const parsedMin = parseInt(minQuantity, 10) || 0;

    onSave(
      {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: finalCategory,
        price: parsedPrice,
        costPrice: parsedCost,
        quantity: parsedQty,
        minQuantity: parsedMin,
        unit,
        supplier: supplier.trim() || undefined,
        description: description.trim() || undefined,
      },
      productToEdit?.id
    );
    onClose();
  };

  const numPrice = parseFloat(price.replace(',', '.')) || 0;
  const numCost = parseFloat(costPrice.replace(',', '.')) || 0;
  const margin = calculateMargin(numPrice, numCost);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Preencha os dados manuais de estoque, precificação e categoria.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Produto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              placeholder="Ex: Café Especial Torrado e Moído 500g"
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors ${
                errors.name ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Grid: SKU e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Código / SKU <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Gerar SKU
                </button>
              </div>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  if (errors.sku) setErrors(prev => ({ ...prev, sku: '' }));
                }}
                placeholder="Ex: ALIM-CAF-001"
                className={`w-full px-3 py-2 text-sm font-mono uppercase border rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors ${
                  errors.sku ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {errors.sku && <p className="text-xs text-red-600 mt-1">{errors.sku}</p>}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria do Produto <span className="text-red-500">*</span>
              </label>
              {!isCustomCategory ? (
                <div className="space-y-1.5">
                  <select
                    value={category}
                    onChange={handleCategorySelectChange}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Cadastrar Nova Categoria...</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Nome da nova categoria"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCategory(existingCategories[0] || 'Geral');
                      }}
                      className="px-2 py-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-300"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
              {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
            </div>
          </div>

          {/* Grid: Preço de Venda, Preço de Custo e Margem */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                    }}
                    placeholder="0,00"
                    className={`w-full pl-8 pr-3 py-1.5 text-sm font-mono border rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white ${
                      errors.price ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço de Custo (R$)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-8 pr-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Indicador de Margem e Lucro Unitário */}
              <div className="text-xs text-slate-600 pb-1">
                <span className="text-slate-500 block text-2xs uppercase tracking-wider">Lucro Bruto Unitário</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatCurrency(margin.value)}
                </span>
                <span className={`ml-1.5 font-mono ${margin.percent >= 30 ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`}>
                  ({margin.percent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Grid: Quantidade, Estoque Mínimo e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qtd Atual em Estoque <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errors.quantity) setErrors(prev => ({ ...prev, quantity: '' }));
                }}
                className={`w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 ${
                  errors.quantity ? 'border-red-400 bg-red-50/30' : 'border-slate-300'
                }`}
              />
              {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-2xs text-slate-500 block mt-0.5">Avisa quando estoque estiver $\le$ a este valor</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="un">un (Unidade)</option>
                <option value="pct">pct (Pacote)</option>
                <option value="cx">cx (Caixa)</option>
                <option value="kg">kg (Quilograma)</option>
                <option value="lt">lt (Litro)</option>
                <option value="m">m (Metro)</option>
                <option value="par">par (Par)</option>
              </select>
            </div>
          </div>

          {/* Grid: Fornecedor e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor / Distribuidor (Opcional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ex: Distribuidora Brasil Ltda"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição ou Observações (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Grãos selecionados, lote 2026-A"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              {productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
