const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 256 * 1024;
const TRANSCRIPTIONS_URL = "https://openrouter.ai/api/v1/audio/transcriptions";
const DEFAULT_MODEL = "openai/gpt-transcribe";
const AUDIO_EXTENSIONS = new Map([
  ["audio/m4a", "m4a"], ["audio/mp4", "mp4"],
  ["audio/mpeg", "mp3"], ["audio/mp3", "mp3"], ["audio/mpga", "mpga"],
  ["audio/wav", "wav"], ["audio/wave", "wav"],
  ["audio/x-wav", "wav"], ["audio/webm", "webm"],
]);

export const maxDuration = 30;

function failure(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function readFormData(request: Request) {
  if (!request.body) throw new Error("missing body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RangeError("request too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes.buffer, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}

export async function POST(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
    return failure("Expected a multipart audio upload.", 415);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return failure("The recording is too large. Record a shorter question.", 413);
  }
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return failure("Transcription is not configured on this display.", 503);

  let data: FormData;
  try {
    data = await readFormData(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return failure("The recording is too large. Record a shorter question.", 413);
    }
    return failure("The audio upload could not be read.", 400);
  }
  const audio = data.get("audio");
  if (!(audio instanceof File)) return failure("An audio recording is required.", 400);
  if (!audio.size) return failure("The recording is empty.", 400);
  if (audio.size > MAX_AUDIO_BYTES) return failure("The recording is too large. Record a shorter question.", 413);
  const mimeType = audio.type.toLowerCase().split(";", 1)[0];
  const extension = AUDIO_EXTENSIONS.get(mimeType);
  if (!extension) return failure("This browser produced an unsupported audio format.", 415);

  const upstreamData = new FormData();
  upstreamData.append("file", audio, `question.${extension}`);
  upstreamData.append("model", process.env.TRANSCRIPTION_MODEL?.trim() || DEFAULT_MODEL);
  upstreamData.append("response_format", "json");
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  const referer = process.env.OPENROUTER_APP_URL?.trim();
  if (referer) headers["HTTP-Referer"] = referer;
  const title = process.env.OPENROUTER_APP_TITLE?.trim();
  if (title) headers["X-OpenRouter-Title"] = title;
  let response: Response;
  try {
    response = await fetch(TRANSCRIPTIONS_URL, {
      method: "POST",
      headers,
      body: upstreamData,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(28_000)]),
      cache: "no-store",
    });
  } catch (error) {
    return failure(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "Transcription timed out. Please try again."
        : "The transcription service could not be reached. Please try again.",
      502,
    );
  }
  let result: { text?: unknown; error?: { message?: unknown } } | null;
  try {
    result = (await response.json()) as typeof result;
  } catch {
    return failure("The transcription service returned an invalid response.", 502);
  }
  if (!response.ok) {
    console.error("OpenRouter transcription failed", { status: response.status, message: result?.error?.message });
    return failure("The recording could not be transcribed. Please try again.", 502);
  }
  if (typeof result?.text !== "string") return failure("The transcription service returned an invalid response.", 502);
  return Response.json({ text: result.text.trim() });
}
