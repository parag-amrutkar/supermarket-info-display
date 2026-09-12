create or replace function public.search_inventory(
  search_query text,
  requested_store_id text default 'CVS-DEMO-001',
  result_limit integer default 8
)
returns table (
  store_id text, sku text, product_name text, brand text, category text,
  subcategory text, size text, price_usd numeric,
  inventory_status public.inventory_status, quantity_on_hand integer,
  aisle integer, section text, rack integer, shelf_level integer,
  "position" integer, location_instructions text, sponsored boolean,
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
