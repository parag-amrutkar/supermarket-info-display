/**
 * Product data for the Beacon Box product detail screen.
 *
 * Split by who owns the truth:
 *
 * - **Inventory owns what changes** — price, size, stock, shelf location. Those
 *   come from `lib/inventory.ts` (the CVS inventory tables) whenever Supabase is
 *   configured, keyed by SKU.
 * - **This file owns what gets written once** — hero photography, the display
 *   name, the category path, the spoken prompts, and the answer bank the voice
 *   agent draws on. None of that fits an inventory schema and none of it changes
 *   hourly.
 *
 * When Supabase is not configured the `fallback` facts below are used instead,
 * so the screen still renders in a bare checkout. Those numbers are invented —
 * see the note on `Rating` too.
 */

import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PublicInventoryRow } from "@/lib/supabase/database.types";

/** Shelf-level directions. Aisle alone is not enough — see AGENTS.md. */
export type ProductLocation = {
  aisle: string;
  rack: string;
  shelf: string;
  section: string;
};

export type StockStatus = "in" | "out";

export type Stock = {
  status: StockStatus;
  /** Units on the shelf. Omitted when unknown — never invent one. */
  count?: number;
};

/** At or below this, the exact count is more useful than "plenty" — it is the
 *  difference between "grab it now" and "come back whenever". */
export const LOW_STOCK_AT = 5;

/**
 * Star rating.
 *
 * MOCKED. There is no review source in the inventory schema and none wired up,
 * so these are invented numbers. Do not ship them customer-facing — the "never
 * claim what the data does not support" rule in AGENTS.md covers social proof
 * as much as availability.
 */
export type Rating = {
  /** Out of 5. */
  score: number;
  count: number;
};

/**
 * A price promotion.
 *
 * Editorial for now, but it belongs in inventory beside `price_usd` — a sale is
 * exactly the kind of fact that changes without anyone touching a content file.
 */
export type Promotion = {
  /** Short shelf-barker, e.g. "Save $4". Rendered uppercase. */
  label: string;
  /** Pre-promotion price, shown struck through next to the live one. */
  wasPrice: string;
};

/** The fields inventory owns. Everything else on a product is editorial. */
export type InventoryFacts = {
  size: string;
  price: string;
  location: ProductLocation;
  stock: Stock;
};

/**
 * Everything below is the answer bank, not screen content. The detail screen
 * deliberately renders none of it; it is what the voice agent reaches for when
 * a shopper taps one of `suggestedQuestions`.
 */
export type ActiveIngredient = {
  name: string;
  amount: string;
  purpose: string;
};

export type DosageRow = {
  group: string;
  instruction: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type RelatedProduct = {
  slug?: string;
  brand: string;
  name: string;
  price: string;
  stock: Stock;
  image?: string;
};

/** The written half of a product — stable, authored, not in any database. */
export type ProductContent = {
  slug: string;
  /** Terms the shopping assistant can safely resolve to this authored page. */
  chatAliases?: readonly string[];
  /** Join key into the inventory tables. */
  sku: string;
  /**
   * Which machine this product is shown on, as a `lib/tenants.ts` id.
   *
   * The kiosk is a tenant's own screen once signed in, so a product page has to
   * wear the store's identity too — a CVS-red pharmacy screen and a bodega's
   * green awning are different products to the shopper standing in front of
   * them, even when the layout is identical.
   */
  tenantId: string;
  /**
   * Category path, broad to narrow. Richer than inventory, which carries only
   * `category` and `subcategory`. Orientation only — nothing links yet.
   */
  category: string[];
  brand: string;
  /** Display name. Inventory's `product_name` is a full shelf label and far too
   *  long for a heading. */
  name: string;
  form: string;
  image?: string;
  /** One line, read at a glance from a few feet back. */
  summary: string;
  /**
   * Minimum age to buy, where one applies.
   *
   * On the screen rather than only in the answer bank: a machine that sends
   * someone to the aisle for something they cannot legally buy has wasted their
   * trip, and "they could have asked" is not a defence for a compliance rule.
   */
  ageRestriction?: number;
  /** Set to flag a price promotion on the screen. */
  promotion?: Promotion;
  rating: Rating;
  /** Two words each. At kiosk distance all three read in a single glance, which
   *  beats teaching exact phrasing — the agent accepts any wording, so a prompt
   *  only has to advertise the topic. */
  suggestedQuestions: string[];
  /** Drug products only. A beverage has neither. */
  activeIngredients?: ActiveIngredient[];
  dosage?: DosageRow[];
  warnings: string[];
  faqs: FaqItem[];
  sameLine: RelatedProduct[];
  alternatives: RelatedProduct[];
  /** Used when Supabase is unconfigured or the SKU is missing. Invented. */
  fallback: InventoryFacts;
};

export type Product = ProductContent & InventoryFacts;

const nyquilSevere: ProductContent = {
  slug: "nyquil-severe",
  chatAliases: ["nyquil", "nyquill", "vicks nyquil"],
  sku: "CVS-9100001",
  tenantId: "cvs-2841",
  category: [
    "Health & Medicine",
    "Cough, Cold & Flu",
    "Cough Medicine",
    "Sore Throat Relief",
  ],
  brand: "Vicks",
  name: "NyQuil SEVERE",
  form: "Cold & Flu Nighttime Liquid",
  image: "/nyquil-severe-hero.jpg",
  summary:
    "Nighttime relief for the worst of a cold or flu — including a blocked nose.",
  rating: { score: 4.6, count: 1248 },
  suggestedQuestions: [
    // "Versions" rather than "sizes": NyQuil varies by formula and form
    // (DayQuil, LiquiCaps, non-severe), not by bottle size.
    "Other versions?",
    // Deliberately not "Cheaper?". This screen is expected to carry brand-funded
    // content, and a prompt that steers off the sponsored product is a hard sell
    // to the brand paying for it. Neutral prompt, honest answer.
    "Other brands?",
    "Product questions?",
  ],
  activeIngredients: [
    { name: "Acetaminophen", amount: "650 mg", purpose: "Pain reliever & fever reducer" },
    { name: "Dextromethorphan HBr", amount: "20 mg", purpose: "Cough suppressant" },
    { name: "Doxylamine succinate", amount: "12.5 mg", purpose: "Antihistamine" },
    { name: "Phenylephrine HCl", amount: "10 mg", purpose: "Nasal decongestant" },
  ],
  dosage: [
    {
      group: "Adults & children 12+",
      instruction:
        "30 mL (2 tablespoons) every 6 hours. No more than 4 doses in 24 hours.",
    },
    { group: "Children under 12", instruction: "Do not use." },
  ],
  warnings: [
    "Contains acetaminophen. Severe liver damage may occur if you exceed 4 doses in 24 hours, combine it with another acetaminophen product, or have 3 or more alcoholic drinks a day.",
    "Causes marked drowsiness. Do not drive, and avoid alcohol and sedatives.",
    "Do not use with an MAOI, or within 2 weeks of stopping one.",
    "Ask a doctor first with heart disease, high blood pressure, thyroid disease, diabetes, glaucoma, a chronic cough, or an enlarged prostate.",
    "Stop and see a doctor if symptoms last more than 7 days or a fever lasts more than 3 days.",
  ],
  faqs: [
    {
      question: "Will this make me drowsy?",
      answer:
        "Yes, and that is intentional — it is a nighttime formula. For the same symptoms during the day, DayQuil SEVERE is on the same shelf and is non-drowsy.",
    },
    {
      question: "What is the difference from regular NyQuil?",
      answer:
        "SEVERE adds phenylephrine, a nasal decongestant. If a blocked nose is your main complaint, this is the one that targets it.",
    },
    {
      question: "Can I take it with Tylenol?",
      answer:
        "No. Each dose already contains 650 mg of acetaminophen — the same active ingredient as Tylenol — and doubling up risks liver damage.",
    },
    {
      question: "Can my child take this?",
      answer:
        "Not under 12. Children's Vicks products are in this same aisle, or the pharmacy counter can point you to an age-appropriate option.",
    },
    {
      question: "Does it contain alcohol?",
      answer:
        "The liquid is about 10% alcohol. NyQuil SEVERE LiquiCaps are alcohol-free and sit beside the bottles.",
    },
  ],
  sameLine: [
    { brand: "Vicks", name: "DayQuil SEVERE Cold & Flu", price: "$13.49", stock: { status: "in", count: 22 } },
    { brand: "Vicks", name: "NyQuil SEVERE LiquiCaps", price: "$14.99", stock: { status: "in", count: 4 } },
    { brand: "Vicks", name: "NyQuil Cold & Flu Liquid", price: "$12.49", stock: { status: "in", count: 16 } },
  ],
  alternatives: [
    { brand: "Robitussin", name: "Severe Cough + Sore Throat", price: "$12.99", stock: { status: "in", count: 11 } },
    { brand: "Robitussin", name: "Maximum Strength Nighttime Cough DM", price: "$10.49", stock: { status: "in", count: 4 } },
  ],
  fallback: {
    size: "12 FL OZ · Berry",
    price: "$13.49",
    // Matches the wayfinding render, which draws a route to aisle 7 and the
    // top shelf of bay 3. Those numbers are pixels in a pre-rendered MP4, so
    // the data bends to the video rather than the other way round.
    location: { aisle: "Aisle 7", rack: "Rack 3", shelf: "Shelf 4", section: "Cough Medicine" },
    stock: { status: "in", count: 8 },
  },
};

const lumify: ProductContent = {
  slug: "lumify",
  chatAliases: ["lumify", "lumify eye drops"],
  sku: "CVS-9100002",
  tenantId: "cvs-2841",
  category: [
    "Health & Medicine",
    "Eye Care",
    "Eye Drops",
    "Redness Relief",
  ],
  brand: "Lumify",
  name: "Redness Reliever",
  form: "Brimonidine Eye Drops",
  image: "/lumify-hero.jpg",
  summary:
    "Takes the red out in about a minute, and holds it for up to eight hours.",
  rating: { score: 4.7, count: 3412 },
  suggestedQuestions: [
    // Sizes, not versions: Lumify is one formula in two bottles, so the bottle
    // is the actual decision a shopper makes here.
    "Other sizes?",
    "Other brands?",
    "Product questions?",
  ],
  activeIngredients: [
    {
      name: "Brimonidine tartrate",
      amount: "0.025%",
      purpose: "Redness reliever",
    },
  ],
  dosage: [
    {
      group: "Adults & children 5+",
      instruction:
        "1 drop in the affected eye(s) every 6 to 8 hours, no more than 4 times a day.",
    },
    { group: "Children under 5", instruction: "Ask a doctor." },
  ],
  warnings: [
    "Remove contact lenses before use and wait 10 minutes before putting them back in — the preservative can soak into soft lenses.",
    "Ask a doctor first if you have glaucoma, heart disease, high blood pressure, or are taking a prescription eye drop.",
    "Overuse of redness drops in general can make redness worse; stop and see a doctor if yours lasts more than 72 hours.",
    "Stop and see a doctor if you have eye pain, changes in vision, or continued redness or irritation.",
    "Do not use if the solution changes colour or becomes cloudy.",
  ],
  faqs: [
    {
      question: "How quickly does it work?",
      answer:
        "About a minute, and the effect lasts up to eight hours. You will see it in a mirror before you leave the aisle.",
    },
    {
      question: "Is it safe to use every day?",
      answer:
        "Within the label, yes — one drop every six to eight hours, up to four times a day. If your eyes are still red after three days, that is worth asking a pharmacist about rather than using more.",
    },
    {
      question: "Does it sting?",
      answer:
        "Most people feel nothing. Mild stinging or dryness are the common complaints and both are usually brief.",
    },
    {
      question: "What makes it different from other redness drops?",
      answer:
        "The active ingredient. Older redness drops constrict the arteries feeding the eye, which works but tends to rebound — the redness returns worse once the drop wears off. Lumify uses brimonidine, which targets the veins instead, and rebound redness has not shown up in its studies.",
    },
    {
      question: "How long does a bottle last?",
      answer:
        "The 7.5 mL bottle holds roughly 150 drops — about five weeks at one drop in each eye, twice a day.",
    },
  ],
  sameLine: [
    { brand: "Lumify", name: "Redness Reliever, 2.5 mL", price: "$13.99", stock: { status: "in", count: 9 } },
    { brand: "Lumify", name: "Eye Illuminations Hydra-Gel Drops", price: "$16.99", stock: { status: "in", count: 6 } },
  ],
  alternatives: [
    { brand: "Blink", name: "Boost Dry Eye Lubricating Drops", price: "$2.49", stock: { status: "in", count: 5 } },
    { brand: "Systane", name: "Ultra Lubricant Eye Drops", price: "$14.49", stock: { status: "in", count: 18 } },
  ],
  fallback: {
    size: "7.5 mL",
    price: "$22.99",
    location: { aisle: "Aisle 18", rack: "Rack 1", shelf: "Shelf 1", section: "Eye Drops" },
    stock: { status: "in", count: 3 },
  },
};

const whiteClaw: ProductContent = {
  slug: "white-claw",
  // The bodega, not the pharmacy — and the machine already carrying the White
  // Claw ad loop (see `lib/tenants.ts`).
  tenantId: "sunrise-deli",
  // TODO: reconcile with whatever SKU lands on main. Deliberately not added to
  // the inventory CSV — a teammate is adding this product there, and two rows
  // for one item is worse than none. Until then the fallback below is what
  // renders, which is also true of every product when Supabase is unconfigured.
  sku: "CVS-9100003",
  category: [
    "Beer, Wine & Spirits",
    "Beer & Seltzer",
    "Hard Seltzer",
    "Variety Packs",
  ],
  brand: "White Claw",
  name: "Hard Seltzer",
  form: "Variety Pack No. 1",
  image: "/white-claw-hero.jpg",
  summary:
    "Four flavours in the box — pineapple, natural lime, black cherry and raspberry.",
  ageRestriction: 21,
  promotion: { label: "Save $4", wasPrice: "$18.99" },
  rating: { score: 4.5, count: 8932 },
  suggestedQuestions: [
    // Flavour is the line axis here, the way size is for Lumify and formula is
    // for NyQuil. Same three buckets, product-appropriate wording.
    "Other flavors?",
    "Other brands?",
    "Product questions?",
  ],
  warnings: [
    "Alcoholic beverage. You must be 21 or over to buy this, and ID is required at the register.",
    "Government warning: women should not drink alcoholic beverages during pregnancy because of the risk of birth defects.",
    "Do not drive a car or operate machinery after drinking. Alcohol may impair your ability to do so.",
  ],
  faqs: [
    {
      question: "What flavours are in the variety pack?",
      answer:
        "No. 1 has pineapple, natural lime, black cherry and raspberry — three cans of each, twelve in total.",
    },
    {
      question: "How strong is it?",
      answer:
        "5% ABV, the same as most lagers. Each can is 12 fluid ounces.",
    },
    {
      question: "How many calories?",
      answer:
        "100 per can, with 2 grams of carbohydrate and no added sugar.",
    },
    {
      question: "Is it gluten free?",
      answer:
        "Yes. It is brewed from a gluten-free malted alternative rather than barley.",
    },
    {
      question: "Can I buy a single flavour instead?",
      answer:
        "Yes — black cherry and mango come as their own twelve-packs, on the same shelf as the variety packs.",
    },
  ],
  sameLine: [
    { brand: "White Claw", name: "Hard Seltzer Variety Pack No. 3", price: "$18.99", stock: { status: "in", count: 15 } },
    { brand: "White Claw", name: "Black Cherry 12 Pack", price: "$18.99", stock: { status: "in", count: 4 } },
    { brand: "White Claw", name: "Surge Variety Pack", price: "$21.99", stock: { status: "out" } },
  ],
  alternatives: [
    { brand: "Truly", name: "Hard Seltzer Berry Mix Pack", price: "$17.99", stock: { status: "in", count: 12 } },
    { brand: "Bud Light", name: "Seltzer Variety Pack", price: "$16.49", stock: { status: "in", count: 7 } },
  ],
  fallback: {
    size: "12 \u00D7 12 FL OZ \u00B7 5% ABV",
    price: "$14.99",
    location: { aisle: "Aisle 4", rack: "Rack 2", shelf: "Shelf 1", section: "Beverages" },
    stock: { status: "in", count: 24 },
  },
};

const CONTENT: Record<string, ProductContent> = {
  [nyquilSevere.slug]: nyquilSevere,
  [lumify.slug]: lumify,
  [whiteClaw.slug]: whiteClaw,
};

export const productSlugs = Object.keys(CONTENT);

/**
 * Returns the authored catalog record without attempting an inventory lookup.
 *
 * Chat navigation uses this rather than `getProduct`: opening editorial
 * product information must be possible when inventory is offline, while a map
 * request has a separate inventory-availability check.
 */
export function getProductContent(slug: string): ProductContent | undefined {
  return CONTENT[slug];
}

/** Canonical slugs that belong to one kiosk tenant. */
export function getProductSlugsForTenant(tenantId: string): string[] {
  return productSlugs.filter((slug) => CONTENT[slug].tenantId === tenantId);
}

/**
 * The authored screen behind an inventory SKU, when there is one.
 *
 * Most of the store is inventory rows and nothing else: the kiosk can say which
 * aisle a Systane bottle is in, but it has no written-up screen to open for it.
 * Only a product in this file has one — which is what decides whether a tap on
 * a suggested product opens a page or asks the assistant a question instead.
 */
export function getProductSlugBySku(sku: string, tenantId?: string): string | undefined {
  return productSlugs.find(
    (slug) => CONTENT[slug].sku === sku && (tenantId === undefined || CONTENT[slug].tenantId === tenantId),
  );
}

/** Authored product names and approved spelling variants for chat routing. */
export function getProductChatAliases(slug: string): readonly string[] {
  const product = getProductContent(slug);
  if (!product) return [];
  return [...new Set([`${product.brand} ${product.name}`, ...(product.chatAliases ?? [])])];
}

/** Inventory row → the four fields the screen shows. */
function factsFromRow(row: PublicInventoryRow): InventoryFacts {
  return {
    size: row.size ?? "",
    price: `$${row.price_usd.toFixed(2)}`,
    location: {
      aisle: `Aisle ${row.aisle}`,
      rack: `Rack ${row.rack}`,
      shelf: `Shelf ${row.shelf_level}`,
      section: row.section,
    },
    stock:
      row.inventory_status === "out_of_stock"
        ? { status: "out" }
        : { status: "in", count: row.quantity_on_hand },
  };
}

/**
 * Live facts for a SKU, or null to fall back.
 *
 * `lib/inventory.ts` is imported lazily because it is `server-only` and pulls in
 * the Supabase client — importing it eagerly would drag that into any module
 * that merely wants a type from this file.
 */
async function liveFacts(sku: string, storeId?: string): Promise<InventoryFacts | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { getProductBySku } = await import("@/lib/inventory");
    const row = await getProductBySku(sku, storeId);
    return row ? factsFromRow(row) : null;
  } catch (error) {
    // Falling back keeps the demo on screen, but it means stock and price are
    // invented while Supabase is configured and believed to be live — so this
    // must be loud in the server log rather than swallowed.
    console.error(`[products] inventory lookup failed for ${sku}:`, error);
    return null;
  }
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const content = getProductContent(slug);
  if (!content) return undefined;

  const facts = (await liveFacts(content.sku)) ?? content.fallback;
  return { ...content, ...facts };
}

/**
 * Product facts backed by a current inventory row, with no editorial fallback.
 *
 * Use this for actions that would send a shopper to a shelf. Detail screens can
 * still render authored product information while inventory is unavailable.
 */
export async function getVerifiedProduct(slug: string, storeId?: string): Promise<Product | undefined> {
  const content = getProductContent(slug);
  if (!content) return undefined;

  const facts = await liveFacts(content.sku, storeId);
  return facts ? { ...content, ...facts } : undefined;
}

/**
 * The authored answer bank for one product, flattened for a system prompt.
 *
 * This is the half of `ProductContent` no screen has ever rendered — ingredients,
 * dosage, warnings, the written Q&A, and the names of neighbouring products. The
 * three printed prompts on the product screen used to advertise it; a microphone
 * replaced them, so the agent reaches it directly instead. It is also what lets a
 * shopper standing at a product screen ask "will this make me drowsy?" with no
 * product named at all.
 *
 * Prices and stock counts on `sameLine` and `alternatives` are deliberately left
 * out, and so is `rating`. They are invented editorial numbers (see the note on
 * `Rating`), and AGENTS.md is explicit that availability is only ever claimed
 * from an inventory tool result — putting them in a prompt is exactly how an
 * invented count gets spoken as fact.
 */
export function productAnswerBank(slug: string): string | null {
  const product = getProductContent(slug);
  if (!product) return null;

  const lines = [
    `Product: ${product.brand} ${product.name} (${product.form}).`,
    `Category: ${product.category.join(" > ")}.`,
    `Summary: ${product.summary}`,
  ];

  if (product.ageRestriction) {
    lines.push(`Age restriction: ${product.ageRestriction}+ only, ID required at the register.`);
  }
  if (product.activeIngredients?.length) {
    lines.push(
      `Active ingredients: ${product.activeIngredients
        .map((item) => `${item.name} ${item.amount} (${item.purpose})`)
        .join("; ")}.`,
    );
  }
  if (product.dosage?.length) {
    lines.push(`Directions: ${product.dosage.map((row) => `${row.group} — ${row.instruction}`).join(" ")}`);
  }
  if (product.warnings.length) {
    lines.push(`Warnings: ${product.warnings.join(" ")}`);
  }
  if (product.faqs.length) {
    lines.push(`Answered questions: ${product.faqs.map((faq) => `Q: ${faq.question} A: ${faq.answer}`).join(" ")}`);
  }
  // Names only. The shopper asks "what else is there?" and gets real product
  // names; whether any of them is on the shelf is an inventory question.
  if (product.sameLine.length) {
    lines.push(
      `Others in this line (names only, check inventory for stock and price): ${product.sameLine
        .map((item) => `${item.brand} ${item.name}`)
        .join("; ")}.`,
    );
  }
  if (product.alternatives.length) {
    lines.push(
      `Other brands (names only, check inventory for stock and price): ${product.alternatives
        .map((item) => `${item.brand} ${item.name}`)
        .join("; ")}.`,
    );
  }

  return lines.join(" ");
}

/**
 * Shelf-ready label for a stock state. Kept with the data so no screen has to
 * decide what "low" means.
 *
 * A precise count only earns its place when it changes behaviour. "Only 3 left"
 * makes someone pick it up now; "37 in stock" is noise, so a healthy shelf just
 * reads as plenty.
 */
export function stockLabel(stock: Stock): string {
  if (stock.status === "out") return "Out of stock";
  if (stock.count !== undefined && stock.count <= LOW_STOCK_AT) {
    return `Only ${stock.count} left`;
  }
  return "Plenty in stock";
}

/** True when the count is worth showing loudly. */
export function isLowStock(stock: Stock): boolean {
  return (
    stock.status === "in" &&
    stock.count !== undefined &&
    stock.count <= LOW_STOCK_AT
  );
}
