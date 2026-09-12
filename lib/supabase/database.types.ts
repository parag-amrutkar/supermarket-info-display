export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";
export type InventoryDataType = "demo_simulated" | "live" | "estimated";

export type PublicInventoryRow = {
  store_id: string;
  sku: string;
  product_name: string;
  brand: string;
  category: string;
  subcategory: string;
  search_aliases: string[];
  size: string | null;
  price_usd: number;
  inventory_status: InventoryStatus;
  quantity_on_hand: number;
  aisle: number;
  section: string;
  rack: number;
  shelf_level: number;
  position: number;
  location_instructions: string;
  sponsored: boolean;
  inventory_data_type: InventoryDataType;
  inventory_updated_at: string;
};

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: {
      public_inventory: {
        Row: PublicInventoryRow;
        Relationships: [];
      };
    };
    Functions: {
      search_inventory: {
        Args: {
          search_query: string;
          requested_store_id: string;
          result_limit: number;
        };
        Returns: Omit<PublicInventoryRow, "search_aliases">[];
      };
    };
    Enums: {
      inventory_status: InventoryStatus;
      inventory_data_type: InventoryDataType;
      inventory_import_status: "running" | "completed" | "failed";
    };
    CompositeTypes: Record<string, never>;
  };
};
