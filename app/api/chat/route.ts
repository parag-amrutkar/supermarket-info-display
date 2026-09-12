import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getModel, InvalidModelIdError, providerOptions } from "@/lib/ai";

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
    system:
      "You are the assistant for a supermarket information display. " +
      "Answer in short, screen-readable sentences.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
