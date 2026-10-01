/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  AlertTriangle,
  Bot,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Database,
  Code
} from 'lucide-react';
import { Product, StockMovement, InventoryStats, AIStatus, MovementType, User } from './types/inventory';
import { Header, SupabaseStatusInfo } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ProductTable } from './components/ProductTable';
import { ProductFormModal } from './components/ProductFormModal';
import { StockMovementModal } from './components/StockMovementModal';
import { MovementsHistory } from './components/MovementsHistoryModal';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { ChatbotDrawer } from './components/ChatbotDrawer';
import { LoginScreen } from './components/LoginScreen';
import { exportProductsToCSV, formatCurrency } from './utils/formatters';
import { supabase, isSupabaseConfigured, mapDbProduct, SUPABASE_SQL_SCHEMA } from './lib/supabase';

const STORAGE_KEY_PRODUCTS = 'cadastreprod_products_v2';
const STORAGE_KEY_MOVEMENTS = 'cadastreprod_movements_v2';
const STORAGE_KEY_USER = 'cadastreprod_session_user';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Falha ao restaurar sessão:', e);
    }
    return null;
  });

  // Products State - Initialized empty as requested: "não deve ter produtos preenchidos"
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Falha ao carregar produtos:', e);
    }
    return []; // Clean empty inventory
  });

  // Movements History State - Initialized empty
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Falha ao carregar movimentações:', e);
    }
    return [];
  });

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'movements' | 'categories'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'normal' | 'low' | 'out'>('all');

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);

  // Supabase Live Sync State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Success Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Erro ao salvar produtos no localStorage:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error('Erro ao salvar movimentações no localStorage:', e);
    }
  }, [movements]);

  // Comprehensive Supabase Sync Function
  const syncWithSupabase = async (showNotification = false) => {
    setIsSyncing(true);
    try {
      // 1. Fetch Supabase connection status
      const statusRes = await fetch('/api/supabase/status');
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setSupabaseStatus(sData);
      }

      // 2. Fetch products from Supabase
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const data = await prodRes.json();
        if (Array.isArray(data.products)) {
          if (data.products.length > 0) {
            setProducts(data.products);
            if (showNotification) {
              showToast(`${data.products.length} produto(s) atualizados.`);
            }
          } else if (showNotification) {
            showToast('Estoque atualizado.');
          }
        }
      }
    } catch (err: any) {
      console.warn('Erro ao sincronizar estoque:', err);
      if (showNotification) {
        showToast('Não foi possível atualizar os produtos no momento.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Run synchronization on mount and when user session changes
  useEffect(() => {
    syncWithSupabase(false);
  }, [currentUser]);

  // Fetch AI status from server
  useEffect(() => {
    const fetchAiStatus = async () => {
      try {
        const res = await fetch('/api/ai-status');
        if (res.ok) {
          const data = await res.json();
          setAiStatus(data);
        }
      } catch (err) {
        console.warn('Servidor de IA não respondeu ao status:', err);
      }
    };
    fetchAiStatus();
  }, []);

  // Compute Categories dynamically from registered products
  const existingCategories = useMemo(() => {
    const defaultCategories = [
      'Alimentos & Bebidas',
      'Eletrônicos & Informática',
      'Material de Escritório',
      'Limpeza & Descartáveis',
      'Ferramentas & Ferragens',
      'Vestuário & Acessórios',
    ];
    const set = new Set<string>(defaultCategories);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Compute Real-Time Inventory Stats
  const stats: InventoryStats = useMemo(() => {
    const totalItems = products.length;
    let totalQuantity = 0;
    let totalSalesValue = 0;
    let totalCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const q = Number(p.quantity) || 0;
      const price = Number(p.price) || 0;
      const cost = Number(p.costPrice) || 0;
      const min = Number(p.minQuantity) || 0;

      totalQuantity += q;
      totalSalesValue += price * q;
      totalCostValue += cost * q;

      if (q === 0) {
        outOfStockCount++;
      } else if (q <= min) {
        lowStockCount++;
      }
    });

    const potentialProfit = totalSalesValue - totalCostValue;
    const profitMarginPercent =
      totalCostValue > 0 ? Math.round((potentialProfit / totalCostValue) * 1000) / 10 : 0;

    // Count categories that actually have products
    const activeCategoriesCount = new Set(products.map(p => p.category)).size;

    return {
      totalItems,
      totalQuantity,
      totalSalesValue,
      totalCostValue,
      potentialProfit,
      profitMarginPercent,
      lowStockCount,
      outOfStockCount,
      categoriesCount: activeCategoriesCount,
    };
  }, [products]);

  // Authentication Handlers
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {}
    showToast(`Bem-vindo ao cadastreprod, ${user.name}!`);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    showToast('Sessão encerrada com sucesso.');
  };

  // Product CRUD Handlers
  const handleSaveProduct = async (
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const now = new Date().toISOString();

    if (editId) {
      // Edit existing product
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === editId) {
            if (p.quantity !== data.quantity) {
              const diff = data.quantity - p.quantity;
              const newMov: StockMovement = {
                id: `mov-${Date.now()}`,
                productId: editId,
                productName: data.name,
                type: diff > 0 ? 'in' : 'out',
                quantity: Math.abs(diff),
                reason: 'Ajuste manual no cadastro',
                date: now,
                previousQuantity: p.quantity,
                newQuantity: data.quantity,
              };
              setMovements((m) => [newMov, ...m]);
            }

            return {
              ...p,
              ...data,
              updatedAt: now,
            };
          }
          return p;
        })
      );

      // Sync to Server / Supabase
      fetch(`/api/products/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(e => console.warn('Falha no update /api/products:', e));

      // Direct client sync if active
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('products').update({
            name: data.name,
            sku: data.sku,
            category: data.category,
            price: data.price,
            cost_price: data.costPrice,
            quantity: data.quantity,
            min_quantity: data.minQuantity,
            unit: data.unit,
            supplier: data.supplier,
            description: data.description,
            updated_at: now,
          }).eq('id', editId);
        } catch (e) {
          console.warn('Supabase direct update failed:', e);
        }
      }

      showToast(`Produto "${data.name}" atualizado com sucesso!`);
    } else {
      // Create new product
      const newId = `prod-${Date.now()}`;
      const newProduct: Product = {
        ...data,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };

      setProducts((prev) => [newProduct, ...prev]);

      if (data.quantity > 0) {
        const newMov: StockMovement = {
          id: `mov-${Date.now()}`,
          productId: newId,
          productName: data.name,
          type: 'in',
          quantity: data.quantity,
          reason: 'Cadastro inicial de estoque manual',
          date: now,
          previousQuantity: 0,
          newQuantity: data.quantity,
        };
        setMovements((m) => [newMov, ...m]);
      }

      // Sync to Server / Supabase
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      }).then(() => {
        fetch('/api/supabase/status').then(r => r.json()).then(setSupabaseStatus).catch(() => {});
      }).catch(e => console.warn('Falha no insert /api/products:', e));

      // Direct client sync if active
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('products').insert([
            {
              id: newId,
              name: data.name,
              sku: data.sku,
              category: data.category,
              price: data.price,
              cost_price: data.costPrice,
              quantity: data.quantity,
              min_quantity: data.minQuantity,
              unit: data.unit,
              supplier: data.supplier,
              description: data.description,
              created_at: now,
              updated_at: now,
            },
          ]);
        } catch (e) {
          console.warn('Supabase direct insert failed:', e);
        }
      }

      showToast(`Produto "${data.name}" cadastrado com sucesso!`);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (window.confirm(`Tem certeza de que deseja excluir o produto "${prod.name}" (${prod.sku})?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));

      fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      }).then(() => {
        fetch('/api/supabase/status').then(r => r.json()).then(setSupabaseStatus).catch(() => {});
      }).catch(e => console.warn('Falha no delete /api/products:', e));

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('products').delete().eq('id', productId);
        } catch (e) {
          console.warn('Supabase delete failed:', e);
        }
      }

      showToast(`Produto "${prod.name}" removido do estoque.`);
    }
  };

  const handleDuplicateProduct = (product: Product) => {
    const now = new Date().toISOString();
    const duplicated: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      name: `${product.name} (Cópia)`,
      sku: `${product.sku}-CP`,
      createdAt: now,
      updatedAt: now,
    };
    setProducts((prev) => [duplicated, ...prev]);
    showToast(`Produto duplicado como "${duplicated.name}".`);
  };

  const handleQuickAdjustQuantity = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newQty = Math.max(0, prod.quantity + delta);
    if (newQty === prod.quantity) return;

    const now = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: newQty, updatedAt: now } : p))
    );

    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      type: delta > 0 ? 'in' : 'out',
      quantity: Math.abs(delta),
      reason: delta > 0 ? 'Ajuste rápido (+1 un)' : 'Ajuste rápido (-1 un)',
      date: now,
      previousQuantity: prod.quantity,
      newQuantity: newQty,
    };
    setMovements((prev) => [mov, ...prev]);
  };

  const handleConfirmMovement = (
    productId: string,
    type: MovementType,
    qty: number,
    reason: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const prevQty = prod.quantity;
    let nextQty = prevQty;

    if (type === 'in') nextQty = prevQty + qty;
    else if (type === 'out') nextQty = Math.max(0, prevQty - qty);
    else if (type === 'adjustment') nextQty = qty;

    const now = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: nextQty, updatedAt: now } : p))
    );

    const mov: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: type === 'adjustment' ? Math.abs(nextQty - prevQty) : qty,
      reason,
      date: now,
      previousQuantity: prevQty,
      newQuantity: nextQty,
    };
    setMovements((prev) => [mov, ...prev]);
    showToast(`Movimentação de ${type === 'in' ? 'entrada' : type === 'out' ? 'saída' : 'ajuste'} concluída!`);
  };

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar todo o histórico de movimentações?')) {
      setMovements([]);
      showToast('Histórico de movimentações limpo.');
    }
  };

  // If user is not logged in, render LoginScreen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg border border-slate-700 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract Navigation: cadastreprod */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewProduct={() => {
          setProductToEdit(null);
          setIsProductModalOpen(true);
        }}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
        isChatOpen={isChatOpen}
        aiStatus={aiStatus}
        onExportCSV={() => exportProductsToCSV(products)}
        onResetSeed={() => {
          if (window.confirm('Deseja limpar o estoque atual para reiniciar o cadastro do zero?')) {
            setProducts([]);
            setMovements([]);
            showToast('Estoque limpo.');
          }
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        supabaseStatus={supabaseStatus}
        onSyncSupabase={() => syncWithSupabase(true)}
        isSyncing={isSyncing}
      />

      {/* Main Container - 1440px Desktop Baseline Presence */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metric Overview */}
        <StatsCards
          stats={stats}
          onFilterLowStock={() => {
            setActiveTab('products');
            setStatusFilter('low');
          }}
          onFilterOutOfStock={() => {
            setActiveTab('products');
            setStatusFilter('out');
          }}
          onFilterAll={() => {
            setActiveTab('products');
            setStatusFilter('all');
          }}
        />

        {/* Database & Empty Onboarding Banner if 0 products */}
        {products.length === 0 && (
          <div className="bg-slate-900 text-white rounded-lg p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-400">cadastreprod</span>
                <span className="text-2xs text-slate-400">·</span>
                <span className="text-xs text-slate-300">Estoque inicial pronto para cadastro manual</span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Nenhum produto cadastrado no momento. Cadastre produtos manualmente informando categoria e preço.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Cadastrar Primeiro Produto</span>
              </button>
            </div>
          </div>
        )}

        {/* Urgent Action Alert Banner when items are low or out of stock */}
        {(stats.outOfStockCount > 0 || stats.lowStockCount > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">Atenção ao Inventário: </span>
                <span>
                  {stats.outOfStockCount > 0 && `${stats.outOfStockCount} item(s) com estoque zerado. `}
                  {stats.lowStockCount > 0 && `${stats.lowStockCount} item(s) atingiram o ponto de reposição.`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('products');
                  setStatusFilter(stats.outOfStockCount > 0 ? 'out' : 'low');
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs transition-colors"
              >
                Filtrar Críticos
              </button>
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="px-3 py-1 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 font-medium rounded text-xs transition-colors flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pedir Sugestão à IA</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Valuation Breakdown (1 col) */}
              <div className="lg:col-span-1">
                <CategoryBreakdown
                  products={products}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setActiveTab('products');
                  }}
                />
              </div>

              {/* Quick Products Preview & Management (2 cols) */}
              <div className="lg:col-span-2">
                <ProductTable
                  products={products}
                  categories={existingCategories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  isConnectedToSupabase={supabaseStatus?.connected}
                  supabaseUrl={supabaseStatus?.url}
                  onEditProduct={(p) => {
                    setProductToEdit(p);
                    setIsProductModalOpen(true);
                  }}
                  onDeleteProduct={handleDeleteProduct}
                  onDuplicateProduct={handleDuplicateProduct}
                  onQuickAdjustQuantity={handleQuickAdjustQuantity}
                  onOpenMovementModal={(p) => {
                    setMovementProduct(p);
                    setIsMovementModalOpen(true);
                  }}
                  onOpenNewProduct={() => {
                    setProductToEdit(null);
                    setIsProductModalOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Product Table */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Gerenciamento de Produtos
                </h2>
                <p className="text-xs text-slate-500">
                  Cadastre produtos manualmente, categorize, estipule preços e acompanhe níveis em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Produto Manualmente</span>
              </button>
            </div>

            <ProductTable
              products={products}
              categories={existingCategories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              isConnectedToSupabase={supabaseStatus?.connected}
              supabaseUrl={supabaseStatus?.url}
              onEditProduct={(p) => {
                setProductToEdit(p);
                setIsProductModalOpen(true);
              }}
              onDeleteProduct={handleDeleteProduct}
              onDuplicateProduct={handleDuplicateProduct}
              onQuickAdjustQuantity={handleQuickAdjustQuantity}
              onOpenMovementModal={(p) => {
                setMovementProduct(p);
                setIsMovementModalOpen(true);
              }}
              onOpenNewProduct={() => {
                setProductToEdit(null);
                setIsProductModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Tab 3: Movements History */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Histórico de Movimentações
              </h2>
              <p className="text-xs text-slate-500">
                Registro de entradas por compra, saídas por venda e ajustes de inventário.
              </p>
            </div>

            <MovementsHistory
              movements={movements}
              onClearHistory={handleClearHistory}
            />
          </div>
        )}

        {/* Tab 4: Categories Breakdown */}
        {activeTab === 'categories' && (
          <div className="space-y-4 max-w-4xl">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Segmentação por Categorias
              </h2>
              <p className="text-xs text-slate-500">
                Distribuição patrimonial e saldo de estoque por categoria cadastrada.
              </p>
            </div>

            <CategoryBreakdown
              products={products}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setActiveTab('products');
              }}
            />
          </div>
        )}
      </main>

      {/* Floating Groq Chatbot Agent Button on Mobile & Bottom Right */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700 transition-all hover:scale-105"
        >
          <Bot className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">Consultar IA Groq</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Slide-over Chatbot Drawer */}
      <ChatbotDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        products={products}
        stats={stats}
        aiStatus={aiStatus}
      />

      {/* Manual Product Registration & Edit Modal */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        existingCategories={existingCategories}
      />

      {/* Stock Movement Modal */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        product={movementProduct}
        onConfirmMovement={handleConfirmMovement}
      />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>cadastreprod · Sistema de Cadastro & Gestão com Agente IA Groq</span>
          <div className="flex items-center gap-3 text-2xs text-slate-400">
            <span>{products.length} itens cadastrados</span>
            <span aria-hidden="true">·</span>
            <span>Total: {formatCurrency(stats.totalSalesValue)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
