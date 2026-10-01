import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Trash2, Sparkles, Loader2, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Product, InventoryStats, ChatMessage, AIStatus } from '../types/inventory';

interface ChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stats: InventoryStats;
  aiStatus: AIStatus | null;
}

const QUICK_QUESTIONS = [
  'Quais produtos estão com estoque baixo ou zerados?',
  'Qual o valor total investido no estoque e a margem?',
  'Quais são os 3 produtos mais caros cadastrados?',
  'Faça uma análise de reposição e recomende o que comprar.',
  'Qual categoria concentra o maior valor financeiro?',
];

export const ChatbotDrawer: React.FC<ChatbotDrawerProps> = ({
  isOpen,
  onClose,
  products,
  stats,
  aiStatus,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      role: 'assistant',
      content: products.length > 0 
        ? `Olá! Sou o assistente de estoque Groq do **cadastreprod**.\n\nTenho visibilidade em tempo real sobre os **${products.length} produtos** cadastrados no sistema, categorias, quantidades físicas, preços de venda e custos.\n\nVocê pode me perguntar qualquer dúvida sobre o inventário, itens críticos para reposição, valores totais ou sugestões de pedidos!`
        : `Olá! Sou o assistente de estoque Groq do **cadastreprod**.\n\nSeu estoque está atualmente pronto e limpo (0 produtos). Assim que você cadastrar produtos manualmente por categoria e preço, poderei analisar seus itens, níveis de reposição, valor patrimonial e responder qualquer dúvida em tempo real!`,
      timestamp: new Date().toISOString(),
      provider: aiStatus?.provider || 'groq',
      model: aiStatus?.model || 'openai-gpt-oss-20b',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setErrorMsg(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          inventory: products,
          stats,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar o agente de estoque.');
      }

      const assistantMessage: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        provider: data.provider,
        model: data.model,
        note: data.note,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: `Histórico limpo. Estou pronto para novas consultas sobre seus **${products.length} itens** em estoque!`,
        timestamp: new Date().toISOString(),
        provider: aiStatus?.provider,
        model: aiStatus?.model,
      },
    ]);
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[520px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Agente de Estoque Groq
              </h2>
              <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400">
                {aiStatus?.groqConfigured ? (aiStatus.model || 'openai-gpt-oss-20b') : (aiStatus?.model || 'openai-gpt-oss-20b')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-2xs text-slate-400 mt-0.5">
              <span>{products.length} SKUs monitorados</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Em tempo real
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClearChat}
            title="Limpar conversa"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-3xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Dúvidas Frequentes sobre o Estoque:
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="text-left text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded px-2.5 py-1 text-slate-300 hover:text-white whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-lg p-3.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-xs'
                }`}
              >
                {/* Format content with clean markdown-like paragraphs and bolding */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Optional note from provider */}
                {msg.note && (
                  <div className="mt-2 pt-2 border-t border-slate-700/60 text-3xs text-slate-400 italic">
                    {msg.note}
                  </div>
                )}
              </div>

              {/* Timestamp & Metadata */}
              <div className="text-3xs text-slate-500 mt-1 px-1 flex items-center gap-1.5">
                <span>{new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                {!isUser && msg.model && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-400">{msg.model}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg max-w-[80%] text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Consultando dados e calculando métricas de estoque...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro na consulta</p>
              <p className="text-red-300 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/95">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre estoque, preços, reposição..."
            disabled={isLoading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-md transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-3xs text-slate-500 text-center mt-2">
          O agente analisa todo o inventário atual para fornecer respostas precisas e imediatas.
        </p>
      </div>
    </div>
  );
};
