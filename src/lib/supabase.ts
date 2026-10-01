import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, StockMovement } from '../types/inventory';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to convert database row to Product
export function mapDbProduct(row: any): Product {
  return {
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
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// SQL Schema string for user reference / database initialization in Supabase
export const SUPABASE_SQL_SCHEMA = `
-- ==============================================================================
-- cadastreprod - SCRIPT SQL COMPLETO COM POLÍTICAS DE ARMAZENAMENTO E RLS ATIVADAS
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- 1. TABELA DE PRODUTOS
create table if not exists public.products (
  id text primary key,
  name text not null,
  sku text not null unique,
  category text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  min_quantity integer not null default 5 check (min_quantity >= 0),
  unit text not null default 'un',
  supplier text,
  description text,
  image_url text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_products_sku on public.products(sku);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_quantity on public.products(quantity);

-- 2. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
create table if not exists public.stock_movements (
  id text primary key,
  product_id text references public.products(id) on delete cascade,
  product_name text not null,
  type text not null check (type in ('in', 'out', 'adjustment')),
  quantity integer not null check (quantity > 0),
  reason text,
  previous_quantity integer not null,
  new_quantity integer not null,
  user_id uuid references auth.users(id) on delete set null,
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_movements_date on public.stock_movements(date desc);

-- 3. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) NAS TABELAS
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

-- Políticas de RLS para a tabela de produtos
drop policy if exists "Permitir leitura de produtos" on public.products;
create policy "Permitir leitura de produtos" on public.products for select using (true);

drop policy if exists "Permitir inserção de produtos" on public.products;
create policy "Permitir inserção de produtos" on public.products for insert with check (true);

drop policy if exists "Permitir atualização de produtos" on public.products;
create policy "Permitir atualização de produtos" on public.products for update using (true) with check (true);

drop policy if exists "Permitir exclusão de produtos" on public.products;
create policy "Permitir exclusão de produtos" on public.products for delete using (true);

-- Políticas de RLS para a tabela de movimentações
drop policy if exists "Permitir leitura de movimentações" on public.stock_movements;
create policy "Permitir leitura de movimentações" on public.stock_movements for select using (true);

drop policy if exists "Permitir inserção de movimentações" on public.stock_movements;
create policy "Permitir inserção de movimentações" on public.stock_movements for insert with check (true);

drop policy if exists "Permitir exclusão de movimentações" on public.stock_movements;
create policy "Permitir exclusão de movimentações" on public.stock_movements for delete using (true);

-- 4. BUCKET DE ARMAZENAMENTO E POLÍTICAS DE STORAGE (SUPABASE STORAGE)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cadastreprod-storage', 
  'cadastreprod-storage', 
  true, 
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set public = true;

-- NOTA: O Supabase já ativa o RLS na tabela storage.objects por padrão.
drop policy if exists "Leitura pública de arquivos no cadastreprod" on storage.objects;
create policy "Leitura pública de arquivos no cadastreprod"
on storage.objects for select
using (bucket_id = 'cadastreprod-storage');

drop policy if exists "Upload de arquivos no cadastreprod" on storage.objects;
create policy "Upload de arquivos no cadastreprod"
on storage.objects for insert
with check (bucket_id = 'cadastreprod-storage');

drop policy if exists "Atualização de arquivos no cadastreprod" on storage.objects;
create policy "Atualização de arquivos no cadastreprod"
on storage.objects for update
using (bucket_id = 'cadastreprod-storage')
with check (bucket_id = 'cadastreprod-storage');

drop policy if exists "Exclusão de arquivos no cadastreprod" on storage.objects;
create policy "Exclusão de arquivos no cadastreprod"
on storage.objects for delete
using (bucket_id = 'cadastreprod-storage');

-- 5. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.handle_updated_at();
`.trim();
