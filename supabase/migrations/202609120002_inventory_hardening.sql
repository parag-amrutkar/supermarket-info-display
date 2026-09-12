create index store_inventory_product_id_idx
  on public.store_inventory (product_id);

create index store_product_alternatives_product_id_idx
  on public.store_product_alternatives (product_id);

create index store_product_alternatives_alternative_product_id_idx
  on public.store_product_alternatives (alternative_product_id);

-- This project-level helper is an event-trigger function, not a public RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
