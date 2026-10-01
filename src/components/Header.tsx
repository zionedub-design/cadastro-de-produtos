import React from 'react';
import { Plus, Bot, Download, LogOut, RefreshCw } from 'lucide-react';
import { AIStatus, User } from '../types/inventory';

export interface SupabaseStatusInfo {
  connected: boolean;
  configured: boolean;
  url: string | null;
  productCount?: number;
  error?: string;
}

interface HeaderProps {
  activeTab: 'overview' | 'products' | 'movements' | 'categories';
  setActiveTab: (tab: 'overview' | 'products' | 'movements' | 'categories') => void;
  onOpenNewProduct: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  aiStatus: AIStatus | null;
  onExportCSV: () => void;
  onResetSeed: () => void;
  currentUser: User | null;
  onLogout: () => void;
  supabaseStatus: SupabaseStatusInfo | null;
  onSyncSupabase: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewProduct,
  onToggleChat,
  isChatOpen,
  aiStatus,
  onExportCSV,
  currentUser,
  onLogout,
  onSyncSupabase,
  isSyncing = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Brand Wordmark (Single text element: cadastreprod) */}
          <div className="flex items-center gap-3">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}
              className="text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors"
            >
              cadastreprod
            </a>

            {/* AI Model Tag */}
            <span className="hidden sm:inline-block text-2xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {aiStatus?.groqConfigured ? (aiStatus.model || 'openai-gpt-oss-20b') : 'openai-gpt-oss-20b'}
            </span>
          </div>

          {/* Zone 2: Navigation Links (Clean text links with hover) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Painel Geral
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'products'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Produtos em Estoque
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'movements'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`transition-colors pb-1 border-b-2 ${
                activeTab === 'categories'
                  ? 'border-emerald-500 text-white font-semibold'
                  : 'border-transparent text-slate-300 hover:text-white'
              }`}
            >
              Categorias
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2">
            {/* Atualizar / Sincronizar Estoque */}
            <button
              type="button"
              onClick={onSyncSupabase}
              disabled={isSyncing}
              title="Atualizar estoque"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 rounded-md border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              type="button"
              onClick={onExportCSV}
              title="Exportar dados para CSV"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-md border border-slate-700/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Chatbot Agent Trigger */}
            <button
              type="button"
              onClick={onToggleChat}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                isChatOpen
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-900/50'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-750 hover:text-emerald-300 hover:border-slate-600'
              }`}
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">IA Groq</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Cadastrar Produto Manual */}
            <button
              type="button"
              onClick={onOpenNewProduct}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>Novo Produto</span>
            </button>

            {/* User profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:block text-right">
                  <div className="text-2xs font-semibold text-slate-200 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-3xs text-slate-400 truncate max-w-[100px]">
                    {currentUser.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sair da conta"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1 ${activeTab === 'overview' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-1 ${activeTab === 'products' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Produtos
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-1 ${activeTab === 'movements' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Movimentos
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-1 ${activeTab === 'categories' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
          >
            Categorias
          </button>
        </div>
      </div>
    </header>
  );
};
