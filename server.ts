import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Supabase Server Client Initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabaseServer = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Supabase Status Endpoint
app.get('/api/supabase/status', async (req, res) => {
  if (!supabaseServer) {
    return res.json({
      connected: false,
      configured: false,
      url: null,
      message: 'Supabase não configurado nas variáveis de ambiente.',
    });
  }

  try {
    const { count, error } = await supabaseServer
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return res.json({
        connected: false,
        configured: true,
        url: supabaseUrl,
        error: error.message,
      });
    }

    res.json({
      connected: true,
      configured: true,
      url: supabaseUrl,
      productCount: count || 0,
    });
  } catch (err: any) {
    res.json({
      connected: false,
      configured: true,
      error: err.message,
    });
  }
});

// Products API Routes (Direct sync with Supabase)
app.get('/api/products', async (req, res) => {
  if (!supabaseServer) {
    return res.json({ products: [], source: 'local' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar produtos no Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      price: Number(row.price) || 0,
      costPrice: Number(row.cost_price ?? row.costPrice) || 0,
      quantity: Number(row.quantity) || 0,
      minQuantity: Number(row.min_quantity ?? row.minQuantity) || 0,
      unit: row.unit || 'un',
      supplier: row.supplier || undefined,
      description: row.description || undefined,
      imageUrl: row.image_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ products: mapped, source: 'supabase' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, source: 'local' });
  }

  try {
    const p = req.body;
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer.from('products').insert([
      {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        price: p.price,
        cost_price: p.costPrice,
        quantity: p.quantity,
        min_quantity: p.minQuantity,
        unit: p.unit || 'un',
        supplier: p.supplier || null,
        description: p.description || null,
        image_url: p.imageUrl || null,
        created_at: p.createdAt || now,
        updated_at: p.updatedAt || now,
      }
    ]).select();

    if (error) {
      console.warn('Erro ao inserir no Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data, source: 'supabase' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, source: 'local' });
  }

  try {
    const p = req.body;
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer.from('products').update({
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price,
      cost_price: p.costPrice,
      quantity: p.quantity,
      min_quantity: p.minQuantity,
      unit: p.unit || 'un',
      supplier: p.supplier || null,
      description: p.description || null,
      updated_at: now,
    }).eq('id', req.params.id).select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data, source: 'supabase' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, source: 'local' });
  }

  try {
    const { error } = await supabaseServer.from('products').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, source: 'supabase' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to build inventory summary for the LLM
function buildInventoryContext(inventory: any[] = [], stats: any = {}) {
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValue = inventory.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
  const totalCost = inventory.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.quantity) || 0)), 0);

  const lowStockItems = inventory.filter(item => Number(item.quantity) <= Number(item.minQuantity) && Number(item.quantity) > 0);
  const outOfStockItems = inventory.filter(item => Number(item.quantity) === 0);

  const categoriesMap: Record<string, { count: number; value: number }> = {};
  inventory.forEach(item => {
    const cat = item.category || 'Sem Categoria';
    if (!categoriesMap[cat]) categoriesMap[cat] = { count: 0, value: 0 };
    categoriesMap[cat].count += Number(item.quantity) || 0;
    categoriesMap[cat].value += (Number(item.price) || 0) * (Number(item.quantity) || 0);
  });

  const productRows = inventory.map(item => {
    const status = Number(item.quantity) === 0 
      ? 'ZERADO' 
      : Number(item.quantity) <= Number(item.minQuantity) 
        ? 'ESTOQUE BAIXO' 
        : 'NORMAL';
    return `- [${item.sku || 'S/N'}] ${item.name} | Categoria: ${item.category} | Preço Venda: R$ ${Number(item.price).toFixed(2)} | Custo: R$ ${Number(item.costPrice || 0).toFixed(2)} | Qtd: ${item.quantity} ${item.unit || 'un'} (Mínimo: ${item.minQuantity || 0}) | Status: ${status} | Fornecedor: ${item.supplier || 'N/I'}`;
  }).join('\n');

  return `
ESTADO ATUAL DO ESTOQUE:
- Total de SKUs cadastrados: ${totalItems}
- Quantidade total de unidades em estoque: ${totalQuantity}
- Valor total a preço de venda: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Custo total investido: R$ ${totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Margem bruta potencial: R$ ${(totalValue - totalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Produtos esgotados (0 unidades): ${outOfStockItems.length} (${outOfStockItems.map(i => i.name).join(', ') || 'Nenhum'})
- Produtos com estoque baixo (em ponto de reposição): ${lowStockItems.length} (${lowStockItems.map(i => `${i.name} [restam ${i.quantity}]`).join(', ') || 'Nenhum'})

RESUMO POR CATEGORIA:
${Object.entries(categoriesMap).map(([cat, data]) => `* ${cat}: ${data.count} unidades, R$ ${data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join('\n')}

LISTA COMPLETA DE PRODUTOS:
${productRows || 'Nenhum produto cadastrado no momento.'}
`.trim();
}

// Endpoint to inspect AI provider status
app.get('/api/ai-status', (req, res) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const groqModel = process.env.GROQ_MODEL || 'openai-gpt-oss-20b';

  res.json({
    provider: hasGroq ? 'groq' : (hasGemini ? 'gemini' : 'none'),
    model: hasGroq ? groqModel : (hasGemini ? 'gemini-3.8-flash' : 'nenhum'),
    groqConfigured: hasGroq,
    geminiConfigured: hasGemini,
  });
});

// Endpoint for chatbot interactions
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], inventory = [], stats = {} } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem fornecida.' });
    }

    const inventoryContext = buildInventoryContext(inventory, stats);

    const systemPrompt = `Você é o "Agente de Estoque Inteligente", um assistente operacional e analista de inventário especializado.
Você tem acesso em tempo real a todos os produtos, categorias, quantidades, preços de venda, preços de custo, fornecedores e níveis mínimos de reposição do sistema de estoque.

SEU OBJETIVO:
1. Responder dúvidas do usuário com precisão cirúrgica baseando-se nos dados fornecidos abaixo.
2. Fornecer análises de estoque (itens com estoque baixo, produtos zerados, valor financeiro total investido, produtos mais caros/baratos, margens de lucro, distribuição por categoria).
3. Se perguntado sobre reposição ou sugestão de compras, identifique quais produtos estão abaixo do estoque mínimo e recomende quantidades lógicas de pedido.
4. Responda sempre em português brasileiro de forma profissional, clara, cordial e objetiva.
5. Use formatação limpa (tópicos quando conveniente, valores em R$ formatados como R$ X,XX e números com separador de milhar).
6. Se o usuário perguntar algo que não está cadastrado no estoque, diga educadamente que o produto não foi encontrado no inventário atual.

${inventoryContext}`;

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    // Prioritize Groq API as requested
    if (groqKey) {
      try {
        const groqModel = process.env.GROQ_MODEL || 'openai-gpt-oss-20b';
        const groqMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || '',
          })),
        ];

        let groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        // If the model name has a prefix or fallback needed, try alternatives gracefully
        if (!groqResponse.ok && groqResponse.status === 404) {
          const fallbackModels = ['openai/gpt-oss-20b', 'gpt-oss-20b', 'llama-3.3-70b-versatile'];
          for (const altModel of fallbackModels) {
            if (altModel === groqModel) continue;
            console.log(`Tentando modelo alternativo Groq: ${altModel}`);
            const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`,
              },
              body: JSON.stringify({
                model: altModel,
                messages: groqMessages,
                temperature: 0.3,
                max_tokens: 1500,
              }),
            });
            if (retryRes.ok) {
              groqResponse = retryRes;
              break;
            }
          }
        }

        if (!groqResponse.ok) {
          const errText = await groqResponse.text();
          console.error('Erro na chamada Groq:', groqResponse.status, errText);
          throw new Error(`Groq API error (${groqResponse.status}): ${errText}`);
        }

        const data = await groqResponse.json();
        const reply = data.choices?.[0]?.message?.content || 'Não foi possível gerar uma resposta no momento.';
        const actualModel = data.model || groqModel;

        return res.json({
          reply,
          provider: 'groq',
          model: actualModel,
        });
      } catch (groqErr: any) {
        console.warn('Falha na API Groq, tentando fallback:', groqErr.message);
        // Fallback to Gemini if Groq fails
        if (!geminiKey) {
          return res.status(500).json({
            error: `Erro ao comunicar com a API do Groq: ${groqErr.message}. Verifique a validade da sua GROQ_API_KEY.`,
          });
        }
      }
    }

    // Fallback: Gemini API if Groq key is not present or failed
    if (geminiKey) {
      const ai = new GoogleGenAI();
      const conversationHistory = messages.map((m: any) => `${m.role === 'assistant' ? 'Assistente' : 'Usuário'}: ${m.content}`).join('\n\n');
      const latestMessage = messages[messages.length - 1]?.content || '';

      const prompt = `${systemPrompt}

HISTÓRICO DA CONVERSA:
${conversationHistory}

Responda à última mensagem do usuário considerando todo o contexto e dados de estoque acima.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const replyText = result.text || 'Não foi possível obter uma resposta do modelo.';
      return res.json({
        reply: replyText,
        provider: 'gemini',
        model: 'gemini-3.8-flash',
        note: !groqKey ? 'Operando via motor Gemini. Para ativar o Groq Llama 3, defina a variável GROQ_API_KEY no arquivo .env.' : undefined,
      });
    }

    // Neither key configured
    return res.status(500).json({
      error: 'Nenhuma chave de API configurada. Por favor, adicione sua GROQ_API_KEY no arquivo .env ou Secrets.',
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Erro interno no processamento da consulta de estoque.',
    });
  }
});

// Setup Vite in Dev or Static files in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor de Estoque rodando em http://0.0.0.0:${port}`);
  });
}

startServer();
