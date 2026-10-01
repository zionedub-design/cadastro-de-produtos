-- ==============================================================================
-- cadastreprod - SCRIPT SQL CORRIGIDO COM POLÍTICAS DE RLS E STORAGE
-- Banco de Dados: Supabase (PostgreSQL + Supabase Storage)
-- ==============================================================================

-- 1. EXTENSÃO PARA UUIDs
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. TABELA DE PRODUTOS (public.products)
-- ==============================================================================
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

-- ==============================================================================
-- 3. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (public.stock_movements)
-- ==============================================================================
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

-- ==============================================================================
-- 4. POLÍTICAS DE RLS (ROW LEVEL SECURITY) NAS TABELAS PÚBLICAS
-- ==============================================================================
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

-- Limpeza de políticas anteriores para evitar duplicidade
drop policy if exists "Permitir leitura de produtos" on public.products;
drop policy if exists "Permitir inserção de produtos" on public.products;
drop policy if exists "Permitir atualização de produtos" on public.products;
drop policy if exists "Permitir exclusão de produtos" on public.products;

drop policy if exists "Permitir leitura de movimentações" on public.stock_movements;
drop policy if exists "Permitir inserção de movimentações" on public.stock_movements;
drop policy if exists "Permitir exclusão de movimentações" on public.stock_movements;

-- Políticas da tabela products
create policy "Permitir leitura de produtos" 
on public.products for select 
using (true);

create policy "Permitir inserção de produtos" 
on public.products for insert 
with check (true);

create policy "Permitir atualização de produtos" 
on public.products for update 
using (true) with check (true);

create policy "Permitir exclusão de produtos" 
on public.products for delete 
using (true);

-- Políticas da tabela stock_movements
create policy "Permitir leitura de movimentações" 
on public.stock_movements for select 
using (true);

create policy "Permitir inserção de movimentações" 
on public.stock_movements for insert 
with check (true);

create policy "Permitir exclusão de movimentações" 
on public.stock_movements for delete 
using (true);

-- ==============================================================================
-- 5. BUCKET DE ARMAZENAMENTO E POLÍTICAS DO SUPABASE STORAGE
-- ATENÇÃO: NÃO executar 'alter table storage.objects enable row level security'
-- pois o Supabase já gerencia e ativa o RLS nessa tabela internamente via sistema.
-- ==============================================================================

-- Criar bucket público para armazenamento de arquivos/fotos do cadastreprod
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cadastreprod-storage', 
  'cadastreprod-storage', 
  true, 
  10485760, -- limite de 10MB por arquivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 10485760;

-- Limpar e recriar as políticas específicas do bucket no Storage
drop policy if exists "Leitura pública de arquivos no cadastreprod" on storage.objects;
drop policy if exists "Upload de arquivos no cadastreprod" on storage.objects;
drop policy if exists "Atualização de arquivos no cadastreprod" on storage.objects;
drop policy if exists "Exclusão de arquivos no cadastreprod" on storage.objects;

-- POLÍTICA 1: Leitura pública de arquivos/imagens do bucket
create policy "Leitura pública de arquivos no cadastreprod"
on storage.objects for select
using (bucket_id = 'cadastreprod-storage');

-- POLÍTICA 2: Upload de arquivos no bucket
create policy "Upload de arquivos no cadastreprod"
on storage.objects for insert
with check (bucket_id = 'cadastreprod-storage');

-- POLÍTICA 3: Atualização de arquivos no bucket
create policy "Atualização de arquivos no cadastreprod"
on storage.objects for update
using (bucket_id = 'cadastreprod-storage')
with check (bucket_id = 'cadastreprod-storage');

-- POLÍTICA 4: Exclusão de arquivos no bucket
create policy "Exclusão de arquivos no cadastreprod"
on storage.objects for delete
using (bucket_id = 'cadastreprod-storage');

-- ==============================================================================
-- 6. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
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
