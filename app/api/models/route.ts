import { openrouterClient } from "@/lib/openrouter";

// Hits OpenRouter's public catalog; no key needed to browse.
export const revalidate = 3600;

export async function GET() {
  const page = await openrouterClient.models.list();

  // `list()` returns a PageIterator: the first page's fields sit directly on
  // the result, and `for await` walks the rest. One page is plenty to populate
  // a model picker.
  const models = page.result.data.map((model) => ({
    id: model.id,
    name: model.name,
    contextLength: model.contextLength,
    pricing: model.pricing,
  }));

  return Response.json({ count: models.length, models });
}
