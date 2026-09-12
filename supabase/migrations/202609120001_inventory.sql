create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.inventory_status as enum ('in_stock', 'low_stock', 'out_of_stock');
create type public.inventory_data_type as enum ('demo_simulated', 'live', 'estimated');
create type public.inventory_import_status as enum ('running', 'completed', 'failed');

create table public.stores (
  id text primary key,
  name text not null,
  timezone text not null default 'America/New_York',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  upc text,
  product_name text not null,
  brand text not null,
  category text not null,
  subcategory text not null,
  search_aliases text[] not null default '{}',
  size text,
  source_verified boolean not null default false,
  source_url text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_not_blank check (btrim(sku) <> ''),
  constraint products_name_not_blank check (btrim(product_name) <> ''),
  constraint products_upc_not_blank check (upc is null or btrim(upc) <> '')
);

create unique index products_upc_unique_when_present
  on public.products (upc) where upc is not null;
create index products_name_trgm on public.products using gin (product_name extensions.gin_trgm_ops);
create index products_search_aliases_gin on public.products using gin (search_aliases);
create index products_category_subcategory on public.products (category, subcategory);

create table public.store_inventory (
  store_id text not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price_usd numeric(10, 2) not null,
  inventory_status public.inventory_status not null,
  quantity_on_hand integer not null,
  aisle integer not null,
  section text not null,
  rack integer not null,
  shelf_level integer not null,
  position integer not null,
  location_instructions text not null,
  sponsored boolean not null default false,
  inventory_data_type public.inventory_data_type not null,
  inventory_updated_at timestamptz not null,
  imported_at timestamptz not null default now(),
  primary key (store_id, product_id),
  constraint store_inventory_price_nonnegative check (price_usd >= 0),
  constraint store_inventory_quantity_nonnegative check (quantity_on_hand >= 0),
  constraint store_inventory_location_positive check (
    aisle > 0 and rack > 0 and shelf_level > 0 and position > 0
  ),
  constraint store_inventory_status_matches_quantity check (
    (quantity_on_hand = 0 and inventory_status = 'out_of_stock') or
    (quantity_on_hand between 1 and 4 and inventory_status = 'low_stock') or
    (quantity_on_hand >= 5 and inventory_status = 'in_stock')
  )
);

create index store_inventory_status_idx on public.store_inventory (store_id, inventory_status);
create index store_inventory_location_idx on public.store_inventory (store_id, aisle, section);

create table public.store_product_alternatives (
  store_id text not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alternative_product_id uuid not null references public.products(id) on delete cascade,
  rank smallint not null,
  primary key (store_id, product_id, alternative_product_id),
  unique (store_id, product_id, rank),
  constraint alternative_is_different check (product_id <> alternative_product_id),
  constraint alternative_rank_positive check (rank > 0)
);

create table public.inventory_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  source_checksum text not null unique,
  status public.inventory_import_status not null default 'running',
  row_count integer not null default 0,
  products_upserted integer not null default 0,
  inventory_upserted integer not null default 0,
  alternatives_inserted integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.store_inventory enable row level security;
alter table public.store_product_alternatives enable row level security;
alter table public.inventory_import_runs enable row level security;

revoke all on public.stores, public.products, public.store_inventory,
  public.store_product_alternatives, public.inventory_import_runs from anon, authenticated;

create policy "Public catalog is readable"
  on public.products for select to anon, authenticated using (true);
create policy "Public store inventory is readable"
  on public.store_inventory for select to anon, authenticated using (true);

grant select (
  id, sku, product_name, brand, category, subcategory, search_aliases, size
) on public.products to anon, authenticated;
grant select (
  store_id, product_id, price_usd, inventory_status, quantity_on_hand, aisle,
  section, rack, shelf_level, position, location_instructions, sponsored,
  inventory_data_type, inventory_updated_at
) on public.store_inventory to anon, authenticated;

create view public.public_inventory
with (security_barrier = true, security_invoker = true)
as
select
  si.store_id,
  p.sku,
  p.product_name,
  p.brand,
  p.category,
  p.subcategory,
  p.search_aliases,
  p.size,
  si.price_usd,
  si.inventory_status,
  si.quantity_on_hand,
  si.aisle,
  si.section,
  si.rack,
  si.shelf_level,
  si.position,
  si.location_instructions,
  si.sponsored,
  si.inventory_data_type,
  si.inventory_updated_at
from public.store_inventory si
join public.products p on p.id = si.product_id;

revoke all on public.public_inventory from public;
grant select on public.public_inventory to anon, authenticated;

create or replace function public.search_inventory(
  search_query text,
  requested_store_id text default 'CVS-DEMO-001',
  result_limit integer default 8
)
returns table (
  store_id text,
  sku text,
  product_name text,
  brand text,
  category text,
  subcategory text,
  size text,
  price_usd numeric,
  inventory_status public.inventory_status,
  quantity_on_hand integer,
  aisle integer,
  section text,
  rack integer,
  shelf_level integer,
  "position" integer,
  location_instructions text,
  sponsored boolean,
  inventory_data_type public.inventory_data_type,
  inventory_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    v.store_id, v.sku, v.product_name, v.brand, v.category, v.subcategory,
    v.size, v.price_usd, v.inventory_status, v.quantity_on_hand, v.aisle,
    v.section, v.rack, v.shelf_level, v.position, v.location_instructions,
    v.sponsored, v.inventory_data_type, v.inventory_updated_at
  from public.public_inventory v
  where v.store_id = requested_store_id
    and (
      v.product_name ilike '%' || search_query || '%'
      or v.brand ilike '%' || search_query || '%'
      or v.category ilike '%' || search_query || '%'
      or v.subcategory ilike '%' || search_query || '%'
      or exists (
        select 1 from unnest(v.search_aliases) alias
        where alias ilike '%' || search_query || '%'
      )
    )
  order by
    case when v.product_name ilike search_query || '%' then 0 else 1 end,
    extensions.similarity(v.product_name, search_query) desc,
    v.product_name
  limit least(greatest(result_limit, 1), 20);
$$;

revoke all on function public.search_inventory(text, text, integer) from public;
grant execute on function public.search_inventory(text, text, integer) to anon, authenticated;

create or replace function public.import_inventory(
  p_payload jsonb,
  p_source_filename text,
  p_source_checksum text,
  p_import_warnings jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  imported_rows integer;
  alternative_rows integer;
  run_id uuid;
  existing_run public.inventory_import_runs%rowtype;
begin
  if jsonb_typeof(p_payload) <> 'array' then
    raise exception 'Inventory payload must be a JSON array';
  end if;

  select * into existing_run
  from public.inventory_import_runs
  where inventory_import_runs.source_checksum = p_source_checksum;

  if found and existing_run.status = 'completed' then
    return jsonb_build_object(
      'status', 'already_imported',
      'run_id', existing_run.id,
      'row_count', existing_run.row_count
    );
  end if;

  insert into public.inventory_import_runs (
    source_filename, source_checksum, status, row_count, warnings
  ) values (
    p_source_filename, p_source_checksum, 'running', jsonb_array_length(p_payload), p_import_warnings
  )
  on conflict (source_checksum) do update set
    source_filename = excluded.source_filename,
    status = 'running',
    row_count = excluded.row_count,
    warnings = excluded.warnings,
    started_at = now(),
    completed_at = null
  returning id into run_id;

  insert into public.stores (id, name, is_demo)
  select distinct
    row->>'store_id',
    case when row->>'store_id' = 'CVS-DEMO-001' then 'CVS Demo Store' else row->>'store_id' end,
    (row->>'inventory_data_type') = 'demo_simulated'
  from jsonb_array_elements(p_payload) row
  on conflict (id) do update set
    is_demo = excluded.is_demo,
    updated_at = now();

  insert into public.products (
    sku, upc, product_name, brand, category, subcategory, search_aliases,
    size, source_verified, source_url
  )
  select
    row->>'sku', nullif(row->>'upc', ''), row->>'product_name', row->>'brand',
    row->>'category', row->>'subcategory',
    string_to_array(row->>'search_aliases', '|'), nullif(row->>'size', ''),
    (row->>'source_verified')::boolean, row->>'source_url'
  from jsonb_array_elements(p_payload) row
  on conflict (sku) do update set
    upc = excluded.upc,
    product_name = excluded.product_name,
    brand = excluded.brand,
    category = excluded.category,
    subcategory = excluded.subcategory,
    search_aliases = excluded.search_aliases,
    size = excluded.size,
    source_verified = excluded.source_verified,
    source_url = excluded.source_url,
    updated_at = now();

  insert into public.store_inventory (
    store_id, product_id, price_usd, inventory_status, quantity_on_hand,
    aisle, section, rack, shelf_level, position, location_instructions,
    sponsored, inventory_data_type, inventory_updated_at
  )
  select
    row->>'store_id', p.id, (row->>'price_usd')::numeric,
    (row->>'inventory_status')::public.inventory_status,
    (row->>'quantity_on_hand')::integer, (row->>'aisle')::integer,
    row->>'section', (row->>'rack')::integer, (row->>'shelf_level')::integer,
    (row->>'position')::integer, row->>'location_instructions',
    (row->>'sponsored')::boolean,
    (row->>'inventory_data_type')::public.inventory_data_type,
    (row->>'last_updated')::timestamptz
  from jsonb_array_elements(p_payload) row
  join public.products p on p.sku = row->>'sku'
  on conflict (store_id, product_id) do update set
    price_usd = excluded.price_usd,
    inventory_status = excluded.inventory_status,
    quantity_on_hand = excluded.quantity_on_hand,
    aisle = excluded.aisle,
    section = excluded.section,
    rack = excluded.rack,
    shelf_level = excluded.shelf_level,
    position = excluded.position,
    location_instructions = excluded.location_instructions,
    sponsored = excluded.sponsored,
    inventory_data_type = excluded.inventory_data_type,
    inventory_updated_at = excluded.inventory_updated_at,
    imported_at = now();

  get diagnostics imported_rows = row_count;

  delete from public.store_product_alternatives a
  using public.products p, jsonb_array_elements(p_payload) row
  where a.product_id = p.id
    and p.sku = row->>'sku'
    and a.store_id = row->>'store_id';

  insert into public.store_product_alternatives (
    store_id, product_id, alternative_product_id, rank
  )
  select row->>'store_id', p.id, alt.id, alternatives.ordinality::smallint
  from jsonb_array_elements(p_payload) row
  join public.products p on p.sku = row->>'sku'
  cross join lateral unnest(string_to_array(row->>'alternative_skus', '|'))
    with ordinality alternatives(alternative_sku, ordinality)
  join public.products alt on alt.sku = alternatives.alternative_sku
  where coalesce(row->>'alternative_skus', '') <> '';

  get diagnostics alternative_rows = row_count;

  update public.inventory_import_runs set
    status = 'completed',
    products_upserted = jsonb_array_length(p_payload),
    inventory_upserted = imported_rows,
    alternatives_inserted = alternative_rows,
    completed_at = now()
  where id = run_id;

  return jsonb_build_object(
    'status', 'completed',
    'run_id', run_id,
    'row_count', jsonb_array_length(p_payload),
    'inventory_upserted', imported_rows,
    'alternatives_inserted', alternative_rows
  );
end;
$$;

revoke all on function public.import_inventory(jsonb, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.import_inventory(jsonb, text, text, jsonb) to service_role;
