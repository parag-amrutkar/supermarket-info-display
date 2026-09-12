/**
 * Product data for the Beacon Box product detail screen.
 *
 * Shaped around the walk-up question, not around a catalogue record. A shopper
 * who has already decided to buy this needs four things — is this the right
 * box, where is it, is it there, what does it cost. Everything else is a
 * follow-up question, so it lives in `faqs` and renders collapsed.
 *
 * Static demo data. Before anything customer-facing, `stock` must come from
 * real inventory (see the "never claim availability" principle in AGENTS.md),
 * `location` from the planogram, `price` from the pricing system, and
 * `dosage`/`activeIngredients`/`warnings` from the current printed label.
 */

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
 * Everything below this line — ingredients, dosage, warnings, FAQs, the two
 * related-product lists — is the answer bank, not screen content. The detail
 * screen deliberately renders none of it; it is what the voice agent reaches
 * for when a shopper asks one of `suggestedQuestions`.
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

/** A card in one of the two rails. `slug` is set only where a detail screen
 *  exists to link to; everything else is display-only for now. */
export type RelatedProduct = {
  slug?: string;
  brand: string;
  name: string;
  price: string;
  stock: Stock;
  image?: string;
};

export type Rating = {
  /** Out of 5. */
  score: number;
  count: number;
};

export type Product = {
  slug: string;
  /**
   * Category path, broad to narrow. Rendered as a breadcrumb for orientation
   * only — nothing links yet, since there are no category screens.
   */
  category: string[];
  brand: string;
  name: string;
  /** Short shelf-facing descriptor, e.g. "Nighttime Liquid". */
  form: string;
  size: string;
  price: string;
  /** Still product shot under `public/`. The looping ad clip is a separate
   *  screen in the kiosk flow, not this one. */
  image?: string;
  location: ProductLocation;
  stock: Stock;
  rating: Rating;
  /** One line, read at a glance from a few feet back. */
  summary: string;
  /** Kept short — four chips is the most that reads as a glance, not a list. */
  relieves: string[];
  activeIngredients: ActiveIngredient[];
  dosage: DosageRow[];
  warnings: string[];
  /**
   * Prompts shown on the screen, phrased as the shopper would say them.
   *
   * They are the whole point of the bottom half: this is a voice machine, and
   * nobody talks to a kiosk unless something tells them they can. Showing five
   * real questions teaches the interaction far better than a mic icon does —
   * and answering on demand costs no screen space, which is why the product
   * rails and the accordion are gone.
   */
  suggestedQuestions: string[];
  faqs: FaqItem[];
  /** Other products in the same line — the "I wanted the daytime one" case. */
  sameLine: RelatedProduct[];
  /** Different brands that treat the same thing — the "this is too expensive"
   *  and "they are out" cases. */
  alternatives: RelatedProduct[];
};

const nyquilSevere: Product = {
  slug: "nyquil-severe",
  category: [
    "Health & Medicine",
    "Cough, Cold & Flu",
    "Cough Medicine",
    "Sore Throat Relief",
  ],
  brand: "Vicks",
  name: "NyQuil SEVERE",
  form: "Cold & Flu Nighttime Liquid",
  size: "12 FL OZ · Berry",
  price: "$13.49",
  image: "/nyquil-severe-hero.jpg",
  location: {
    aisle: "Aisle 7",
    rack: "Rack 3",
    shelf: "Second shelf",
    section: "Cold & Flu",
  },
  stock: { status: "in", count: 8 },
  rating: { score: 4.6, count: 1248 },
  summary:
    "Nighttime relief for the worst of a cold or flu — including a blocked nose.",
  relieves: ["Cough", "Congestion", "Aches & fever", "Sore throat"],
  activeIngredients: [
    {
      name: "Acetaminophen",
      amount: "650 mg",
      purpose: "Pain reliever & fever reducer",
    },
    {
      name: "Dextromethorphan HBr",
      amount: "20 mg",
      purpose: "Cough suppressant",
    },
    {
      name: "Doxylamine succinate",
      amount: "12.5 mg",
      purpose: "Antihistamine",
    },
    {
      name: "Phenylephrine HCl",
      amount: "10 mg",
      purpose: "Nasal decongestant",
    },
  ],
  dosage: [
    {
      group: "Adults & children 12+",
      instruction:
        "30 mL (2 tablespoons) every 6 hours. No more than 4 doses in 24 hours.",
    },
    {
      group: "Children under 12",
      instruction: "Do not use.",
    },
  ],
  warnings: [
    "Contains acetaminophen. Severe liver damage may occur if you exceed 4 doses in 24 hours, combine it with another acetaminophen product, or have 3 or more alcoholic drinks a day.",
    "Causes marked drowsiness. Do not drive, and avoid alcohol and sedatives.",
    "Do not use with an MAOI, or within 2 weeks of stopping one.",
    "Ask a doctor first with heart disease, high blood pressure, thyroid disease, diabetes, glaucoma, a chronic cough, or an enlarged prostate.",
    "Stop and see a doctor if symptoms last more than 7 days or a fever lasts more than 3 days.",
  ],
  suggestedQuestions: [
    // One prompt per bucket: same line, other brands, everything else.
    //
    // Two words, not sentences. At kiosk distance all three read in a single
    // glance, which beats teaching the exact phrasing — the agent accepts any
    // wording, so the prompts only have to advertise the topic.
    //
    // "Versions" rather than "sizes": NyQuil varies by formula and form
    // (DayQuil, LiquiCaps, non-severe), not by bottle size. Sizes is the right
    // axis for something like Lumify, and belongs in that product's data.
    "Other versions?",
    // Deliberately not "Cheaper?". The same screen is expected to carry
    // brand-funded content, and a prompt that steers off the sponsored product
    // is a hard sell to the brand paying for it. Neutral prompt, honest answer:
    // a shopper who asks about price still gets the comparison and the tradeoff.
    "Other brands?",
    // Catch-all for the label — dosage, drowsiness, interactions, warnings.
    "Product questions?",
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
    {
      brand: "Vicks",
      name: "DayQuil SEVERE Cold & Flu",
      price: "$13.49",
      stock: { status: "in", count: 22 },
    },
    {
      brand: "Vicks",
      name: "NyQuil SEVERE LiquiCaps",
      price: "$14.99",
      stock: { status: "in", count: 4 },
    },
    {
      brand: "Vicks",
      name: "NyQuil Cold & Flu Liquid",
      price: "$12.49",
      stock: { status: "in", count: 16 },
    },
    {
      brand: "Vicks",
      name: "VapoRub Topical Ointment",
      price: "$8.99",
      stock: { status: "in", count: 31 },
    },
  ],
  alternatives: [
    {
      brand: "Theraflu",
      name: "Severe Cold Nighttime Powder",
      price: "$11.99",
      stock: { status: "in", count: 12 },
    },
    {
      brand: "Robitussin",
      name: "Nighttime Multi-Symptom",
      price: "$10.49",
      stock: { status: "in", count: 2 },
    },
    {
      brand: "Store brand",
      name: "Nighttime Cold & Flu Relief",
      price: "$6.99",
      stock: { status: "in", count: 40 },
    },
  ],
};

const PRODUCTS: Record<string, Product> = {
  [nyquilSevere.slug]: nyquilSevere,
};

export const productSlugs = Object.keys(PRODUCTS);

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS[slug];
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
