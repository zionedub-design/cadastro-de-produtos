export type UnitType = 'un' | 'kg' | 'pct' | 'lt' | 'cx' | 'm' | 'par';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number; // Preço de venda unitário (R$)
  costPrice: number; // Preço de custo unitário (R$)
  quantity: number; // Quantidade atual em estoque
  minQuantity: number; // Ponto de pedido / estoque mínimo
  unit: UnitType;
  supplier?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  reason: string;
  date: string;
  previousQuantity: number;
  newQuantity: number;
}

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  totalSalesValue: number;
  totalCostValue: number;
  potentialProfit: number;
  profitMarginPercent: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoriesCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: 'groq' | 'gemini' | 'none';
  model?: string;
  note?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AIStatus {
  provider: 'groq' | 'gemini' | 'none';
  model: string;
  groqConfigured: boolean;
  geminiConfigured: boolean;
}
