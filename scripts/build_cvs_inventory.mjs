import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const readTsv = async (path) => (await fs.readFile(path, "utf8"))
  .trim().split("\n").filter(Boolean).map((line) => {
    const [product_name, source_url] = line.split("\t");
    return { product_name, source_url };
  });

const eye = await readTsv(".firecrawl/cvs-eye-links.tsv");
const cough = await readTsv(".firecrawl/cvs-cough-links.tsv");
const general = await readTsv(".firecrawl/cvs-product-links.tsv");
const grocery = await readTsv(".firecrawl/cvs-grocery-links.tsv");

const selected = [];
const seen = new Set();
const add = (items, limit) => {
  let added = 0;
  for (const item of items) {
    if (added >= limit) break;
    if (seen.has(item.source_url)) continue;
    seen.add(item.source_url);
    selected.push(item);
    added++;
  }
};

add(eye.filter((x) => /eye drop|lubricating eye|dry eye drop/i.test(x.product_name)), 15);
add(cough, 15);
add(general.filter((x) => !seen.has(x.source_url)), 35);
add(grocery.filter((x) => !seen.has(x.source_url)), 35);

if (selected.length !== 100) throw new Error(`Expected 100 products, got ${selected.length}`);

const brandRules = [
  "CVS", "Systane", "Blink", "Robitussin", "Advil", "Benadryl", "HALLS", "Ricola",
  "Vicks", "Biotrue", "Bio True", "Biofreeze", "Betadine", "Purell", "Always",
  "Alka-Seltzer", "Coca-Cola", "Dunkin'", "Folgers", "Airheads", "Brach's", "Archer",
  "Bobo's", "Baby Ruth", "Black Rifle"
];

function classify(name) {
  const n = name.toLowerCase();
  if (/eye drop|lubricating eye|dry eye drop/.test(n)) return ["Health & Medicine", "Eye Drops", 18];
  if (/robitussin|cough medicine|cough suppressant|chest congestion|multi-symptom cough/.test(n)) return ["Health & Medicine", "Cough Medicine", 17];
  if (/throat|lozenge|cough drop/.test(n)) return ["Health & Medicine", "Sore Throat & Cough Drops", 17];
  if (/allergy|advil|pain relief|ibuprofen|cold \+ congestion/.test(n)) return ["Health & Medicine", "Pain, Allergy & Cold", 16];
  if (/contact lens|saline solution|eyelid|eyeglass|eye patch/.test(n)) return ["Personal Care", "Eye Care", 18];
  if (/pad|feminine/.test(n)) return ["Personal Care", "Feminine Care", 12];
  if (/wipe|sanit/.test(n)) return ["Personal Care", "Cleansing & Sanitizing", 11];
  if (/coffee|k-cup/.test(n)) return ["Grocery", "Coffee", 5];
  if (/soda|drink|water|beverage/.test(n)) return ["Grocery", "Beverages", 4];
  if (/candy|chocolate|airheads|butterfinger|crunch|baby ruth|brach|mints/.test(n)) return ["Grocery", "Candy", 2];
  if (/popcorn|stick|oat sandwich|snack|chips|nuts|cracker/.test(n)) return ["Grocery", "Snacks", 3];
  return ["Health & Medicine", "General Health", 15];
}

function brand(name) {
  return brandRules.find((b) => name.toLowerCase().startsWith(b.toLowerCase())) || name.split(/[ ,]/)[0];
}

function size(name) {
  const m = name.match(/(?:, |\b)((?:\d+(?:\.\d+)?|\.\d+)\s*(?:FL OZ|OZ|CT|mL|MG|ct|oz))(?:\b|$)/i);
  if (!m) return "";
  return m[1].replace(/^\./, "0.").toUpperCase().replace(/ML/, "mL");
}

function aliases(name, subcategory) {
  const base = subcategory.toLowerCase();
  if (subcategory === "Eye Drops") return "eye drops|dry eye relief|lubricating drops|artificial tears";
  if (subcategory === "Cough Medicine") return "cough medicine|cough syrup|cough relief|chest congestion medicine";
  return `${base}|${brand(name).toLowerCase()} ${base}`;
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const headers = [
  "store_id", "sku", "upc", "product_name", "brand", "category", "subcategory",
  "search_aliases", "size", "price_usd", "inventory_status", "quantity_on_hand",
  "aisle", "section", "rack", "shelf_level", "position", "location_instructions",
  "alternative_skus", "sponsored", "source_verified", "source_url",
  "inventory_data_type", "last_updated"
];

const rows = selected.map((item, i) => {
  const [, productId] = item.source_url.match(/prodid-(\d+)/) || [];
  const [category, subcategory, aisleNum] = classify(item.product_name);
  const rack = (i % 5) + 1;
  const shelf = (i % 4) + 1;
  const position = (i % 8) + 1;
  const qty = (i * 7 + 5) % 31;
  const status = qty === 0 ? "out_of_stock" : qty <= 4 ? "low_stock" : "in_stock";
  const price = (2.49 + ((i * 137) % 2200) / 100).toFixed(2);
  return {
    store_id: "CVS-DEMO-001", sku: `CVS-${productId}`, upc: "", product_name: item.product_name,
    brand: brand(item.product_name), category, subcategory, search_aliases: aliases(item.product_name, subcategory),
    size: size(item.product_name), price_usd: price, inventory_status: status, quantity_on_hand: qty,
    aisle: aisleNum, section: subcategory, rack, shelf_level: shelf, position,
    location_instructions: `Aisle ${aisleNum}, ${subcategory} section, rack ${rack}, shelf ${shelf}, position ${position}`,
    alternative_skus: "", sponsored: false, source_verified: true, source_url: item.source_url,
    inventory_data_type: "demo_simulated", last_updated: "2026-09-12T12:00:00-04:00"
  };
});

for (const row of rows) {
  const peers = rows.filter((x) => x.subcategory === row.subcategory && x.sku !== row.sku).slice(0, 2);
  row.alternative_skus = peers.map((x) => x.sku).join("|");
}

const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(","))].join("\n") + "\n";
await fs.mkdir("outputs/cvs-inventory", { recursive: true });
const outputPath = "outputs/cvs-inventory/cvs_inventory_100_products.csv";
await fs.writeFile(outputPath, csv, "utf8");

const workbook = await Workbook.fromCSV(csv, { sheetName: "CVS Inventory" });
const check = await workbook.inspect({ kind: "table", range: "'CVS Inventory'!A1:X8", include: "values", tableMaxRows: 8, tableMaxCols: 24 });
const eyeCount = rows.filter((r) => r.subcategory === "Eye Drops").length;
const coughCount = rows.filter((r) => r.subcategory === "Cough Medicine").length;
console.log(JSON.stringify({ outputPath, rowCount: rows.length, eyeCount, coughCount, inspection: check.ndjson }));
