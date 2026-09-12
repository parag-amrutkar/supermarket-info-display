import "server-only";

import { cache } from "react";

import type { PublicInventoryRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const DEFAULT_STORE_ID = "CVS-DEMO-001";

export type InventoryResult = Omit<PublicInventoryRow, "search_aliases">;

export async function searchProducts(
  query: string,
  storeId = DEFAULT_STORE_ID,
  limit = 8,
): Promise<InventoryResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_inventory", {
    search_query: normalizedQuery,
    requested_store_id: storeId,
    result_limit: Math.min(Math.max(limit, 1), 20),
  });

  if (error) throw new Error(`Inventory search failed: ${error.message}`);
  return data ?? [];
}
export const getProductBySku = cache(async function getProductBySku(
  sku: string,
  storeId = DEFAULT_STORE_ID,
): Promise<PublicInventoryRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_inventory")
    .select("*")
    .eq("store_id", storeId)
    .eq("sku", sku)
    .maybeSingle();

  if (error) throw new Error(`Inventory lookup failed: ${error.message}`);
  return data;
});

export async function getAisleInventory(
  aisle: number,
  storeId = DEFAULT_STORE_ID,
): Promise<PublicInventoryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_inventory")
    .select("*")
    .eq("store_id", storeId)
    .eq("aisle", aisle)
    .order("section")
    .order("rack")
    .order("shelf_level")
    .order("position");

  if (error) throw new Error(`Aisle lookup failed: ${error.message}`);
  return data ?? [];
}
