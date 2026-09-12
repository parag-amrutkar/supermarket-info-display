import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const DEFAULT_FILE = "outputs/cvs-inventory/cvs_inventory_100_products.csv";
const EXPECTED_HEADERS = [
  "store_id", "sku", "upc", "product_name", "brand", "category",
  "subcategory", "search_aliases", "size", "price_usd",
  "inventory_status", "quantity_on_hand", "aisle", "section", "rack",
  "shelf_level", "position", "location_instructions", "alternative_skus",
  "sponsored", "source_verified", "source_url", "inventory_data_type",
  "last_updated",
];

const booleanString = z.enum(["true", "false"]);
const positiveIntegerString = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive());
const nonnegativeIntegerString = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative());
const priceString = z.string().regex(/^\d+(?:\.\d{1,2})?$/).transform(Number).pipe(z.number().nonnegative());
const demoProvenanceUrl = (sku) => `urn:beacon-box:demo:${sku}`;

const inventoryRowSchema = z.object({
  store_id: z.string().min(1),
  sku: z.string().min(1),
  upc: z.string(),
  product_name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  search_aliases: z.string().min(1),
  size: z.string(),
  price_usd: priceString,
  inventory_status: z.enum(["in_stock", "low_stock", "out_of_stock"]),
  quantity_on_hand: nonnegativeIntegerString,
  aisle: positiveIntegerString,
  section: z.string().min(1),
  rack: positiveIntegerString,
  shelf_level: positiveIntegerString,
  position: positiveIntegerString,
  location_instructions: z.string().min(1),
  alternative_skus: z.string(),
  sponsored: booleanString,
  source_verified: booleanString,
  source_url: z.string(),
  inventory_data_type: z.enum(["demo_simulated", "live", "estimated"]),
  last_updated: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp"),
}).superRefine((row, context) => {
  const mayOmitSourceUrl = row.source_verified === "false" && row.inventory_data_type === "demo_simulated";
  if (!row.source_url && !mayOmitSourceUrl) {
    context.addIssue({ code: "custom", path: ["source_url"], message: "Source URL is required for verified, live, or estimated inventory." });
  }
  if (row.source_url && !z.string().url().safeParse(row.source_url).success) {
    context.addIssue({ code: "custom", path: ["source_url"], message: "Invalid URL" });
  }
});

function parseCsv(input) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("CSV ends inside a quoted field");
  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  return records;
}

function validateInventory(csvText) {
  const records = parseCsv(csvText);
  const headers = records.shift();
  if (!headers || headers.join("\0") !== EXPECTED_HEADERS.join("\0")) {
    throw new Error(`Unexpected CSV headers. Expected: ${EXPECTED_HEADERS.join(", ")}`);
  }

  const errors = [];
  const rows = records.map((values, index) => {
    if (values.length !== headers.length) {
      errors.push(`Row ${index + 2}: expected ${headers.length} columns, received ${values.length}`);
      return null;
    }
    const raw = Object.fromEntries(headers.map((header, column) => [header, values[column]]));
    const result = inventoryRowSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`Row ${index + 2}: ${z.prettifyError(result.error)}`);
      return null;
    }
    // The database requires a unique, non-null source URL. An unverified demo
    // row has no external source, so retain that truth in its data flags while
    // using a stable internal provenance URI for the database identifier.
    return {
      ...raw,
      ...result.data,
      source_url: result.data.source_url || demoProvenanceUrl(result.data.sku),
    };
  }).filter(Boolean);

  const skuCounts = new Map();
  const urlCounts = new Map();
  for (const row of rows) {
    skuCounts.set(row.sku, (skuCounts.get(row.sku) ?? 0) + 1);
    if (row.source_url) urlCounts.set(row.source_url, (urlCounts.get(row.source_url) ?? 0) + 1);
  }
  for (const [sku, count] of skuCounts) if (count > 1) errors.push(`Duplicate SKU: ${sku}`);
  for (const [url, count] of urlCounts) if (count > 1) errors.push(`Duplicate source URL: ${url}`);

  const skuSet = new Set(rows.map((row) => row.sku));
  for (const row of rows) {
    const expectedStatus = row.quantity_on_hand === 0
      ? "out_of_stock"
      : row.quantity_on_hand <= 4 ? "low_stock" : "in_stock";
    if (row.inventory_status !== expectedStatus) {
      errors.push(`${row.sku}: ${row.inventory_status} conflicts with quantity ${row.quantity_on_hand}`);
    }
    for (const alternativeSku of row.alternative_skus.split("|").filter(Boolean)) {
      if (!skuSet.has(alternativeSku)) errors.push(`${row.sku}: missing alternative ${alternativeSku}`);
      if (alternativeSku === row.sku) errors.push(`${row.sku}: product cannot be its own alternative`);
    }
  }

  if (errors.length) throw new Error(`Inventory validation failed:\n${errors.join("\n")}`);

  const warnings = [];
  const locations = new Map();
  const names = new Map();
  for (const row of rows) {
    const location = [row.store_id, row.aisle, row.rack, row.shelf_level, row.position].join("/");
    locations.set(location, [...(locations.get(location) ?? []), row.sku]);
    names.set(row.product_name, [...(names.get(row.product_name) ?? []), row.sku]);
  }
  for (const [location, skus] of locations) {
    if (skus.length > 1) warnings.push({ type: "shared_location", location, skus });
  }
  for (const [productName, skus] of names) {
    if (skus.length > 1) warnings.push({ type: "duplicate_name", product_name: productName, skus });
  }
  for (const row of rows) {
    if (
      row.category === "Health & Medicine" &&
      /cookies|chips|popcorn|coffee|apple rings|veggie straws|beef/i.test(row.product_name)
    ) {
      warnings.push({ type: "suspect_classification", sku: row.sku, product_name: row.product_name });
    }
  }

  return { rows, warnings };
}

const apply = process.argv.includes("--apply");
const fileArgument = process.argv.find((argument) => !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]);
const filePath = path.resolve(fileArgument ?? DEFAULT_FILE);
const csvText = await fs.readFile(filePath, "utf8");
const checksum = createHash("sha256").update(csvText).digest("hex");
const { rows, warnings } = validateInventory(csvText);

const summary = {
  mode: apply ? "apply" : "dry-run",
  source: path.relative(process.cwd(), filePath),
  checksum,
  row_count: rows.length,
  stores: [...new Set(rows.map((row) => row.store_id))],
  statuses: Object.fromEntries(
    ["in_stock", "low_stock", "out_of_stock"].map((status) => [
      status,
      rows.filter((row) => row.inventory_status === status).length,
    ]),
  ),
  warning_count: warnings.length,
  warnings,
};

if (!apply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("--apply requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.rpc("import_inventory", {
  p_payload: rows,
  p_source_filename: path.basename(filePath),
  p_source_checksum: checksum,
  p_import_warnings: warnings,
});
if (error) throw new Error(`Inventory import failed: ${error.message}`);
console.log(JSON.stringify({ ...summary, result: data }, null, 2));
