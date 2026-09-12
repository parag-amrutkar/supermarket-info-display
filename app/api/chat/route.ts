import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getModel, InvalidModelIdError, providerOptions } from "@/lib/ai";
import { searchProducts } from "@/lib/inventory";

// Streaming responses can run longer than the default serverless budget.
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: string } =
    await req.json();

  // `model` is an optional "<provider>:<model>" override; omitted, it falls
  // back to AI_MODEL and then to the default.
  let selected;
  try {
    selected = getModel(model);
  } catch (error) {
    if (error instanceof InvalidModelIdError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const result = streamText({
    model: selected,
    providerOptions,
    system: [
      "You are the assistant for a supermarket information display.",
      "Answer in short, screen-readable sentences.",
      "Use inventorySearch for every product availability or location question.",
      "Never claim availability or a shelf location without a matching tool result.",
      "When inventory_data_type is demo_simulated, clearly call the result demo inventory.",
      "Never present a sponsored result as organic.",
    ].join(" "),
    messages: await convertToModelMessages(messages),
    tools: {
      inventorySearch: tool({
        description: "Search the selected store's product inventory and precise shelf locations.",
        inputSchema: z.object({
          query: z.string().min(1).describe("Product, brand, or category to find"),
          limit: z.number().int().min(1).max(8).default(5),
        }),
        execute: async ({ query, limit }) => searchProducts(query, undefined, limit),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
