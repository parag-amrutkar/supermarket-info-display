import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { parseJsonEventStream } from "@ai-sdk/provider-utils";
import { readUIMessageStream, simulateReadableStream, stepCountIs, streamText, tool, uiMessageChunkSchema } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";

const compile = (file) => ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function loadShoppingAgent() {
  const context = { exports: {}, require: (id) => { throw new Error(`Unexpected import: ${id}`); } };
  vm.runInNewContext(compile("lib/shopping-agent.ts"), context);
  return context.exports;
}

test("session chat helpers keep tenant/staff conversations isolated and text-only", () => {
  const agent = loadShoppingAgent();
  assert.notEqual(agent.chatStorageKey("cvs-2841", 1, "chat"), agent.chatStorageKey("cvs-2841", 2, "chat"));
  assert.notEqual(agent.chatStorageKey("cvs-2841", 1, "chat"), agent.chatStorageKey("sunrise-deli", 1, "chat"));
  assert.equal(agent.isStoredChat([{ id: "u", role: "user", parts: [{ type: "text", text: "coffee" }] }]), true);
  assert.equal(agent.isStoredChat([{ id: "u", role: "user", parts: [{ type: "tool-invocation", toolInvocation: {} }] }]), false);
  assert.deepEqual(JSON.parse(JSON.stringify(agent.getStoreContext("sunrise-deli"))), { tenantId: "sunrise-deli", storeId: null, inventoryAvailable: false });
});

test("navigation command parser accepts only completed server navigation outputs", () => {
  const agent = loadShoppingAgent();
  const message = (part) => ({ id: "a1", role: "assistant", parts: [part] });
  assert.deepEqual(
    JSON.parse(JSON.stringify(agent.navigationFromMessage(message({
      type: "tool-openProductMap",
      state: "output-available",
      toolCallId: "call-1",
      output: { opened: true, action: "open-product-map", productSlug: "nyquil-severe" },
    })))),
    { toolCallId: "call-1", href: "/map/nyquil-severe" },
  );
  for (const part of [
    { type: "tool-openProductDetails", state: "input-available", toolCallId: "call-2", input: { productSlug: "nyquil-severe" } },
    { type: "tool-openProductDetails", state: "output-available", toolCallId: "call-3", output: { opened: true, action: "open-product-map", productSlug: "nyquil-severe" } },
    { type: "tool-openProductDetails", state: "output-available", toolCallId: "call-4", output: { opened: true, action: "open-product-details", productSlug: "../../map" } },
  ]) {
    assert.equal(agent.navigationFromMessage(message(part)), null);
  }
});

function toolCallingModel() {
  return new MockLanguageModelV4({
    doStream: [
      { stream: simulateReadableStream({ chunks: [
        { type: "tool-call", toolCallId: "call-1", toolName: "lookup", input: '{"query":"coffee"}' },
        { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_calls" }, usage, logprobs: undefined },
      ] }) },
      { stream: simulateReadableStream({ chunks: [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "Coffee is in aisle 4." },
        { type: "text-end", id: "text-1" },
        { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage, logprobs: undefined },
      ] }) },
    ],
  });
}

test("the application's OpenRouter adapter keeps native v4 tool execution", async () => {
  const model = toolCallingModel();
  const unversionedOpenRouter = {
    languageModel: () => model,
    textEmbeddingModel: () => { throw new Error("not used"); },
    imageModel: () => { throw new Error("not used"); },
  };
  const inertProvider = () => ({ languageModel: () => model });
  const context = {
    exports: {},
    require: (id) => {
      if (id === "@openrouter/ai-sdk-provider") return { openrouter: unversionedOpenRouter };
      if (id === "@ai-sdk/openai-compatible") return { createOpenAICompatible: inertProvider };
      if (["@ai-sdk/anthropic", "@ai-sdk/gateway", "@ai-sdk/openai"].includes(id)) return { [id.split("/").at(-1)]: inertProvider };
      if (id === "ai-sdk-provider-claude-code") return { claudeCode: inertProvider };
      if (id === "ai") return awaitlessAi;
      throw new Error(`Unexpected import: ${id}`);
    },
    process: { env: {} },
  };
  const awaitlessAi = await import("ai");
  vm.runInNewContext(compile("lib/ai.ts"), context);
  const modelFromAppRegistry = context.exports.getModel("openrouter:test");
  let executed = false;
  const result = streamText({
    model: modelFromAppRegistry,
    prompt: "Find coffee",
    tools: { lookup: tool({ inputSchema: z.object({ query: z.string() }), execute: async () => (executed = true, { aisle: 4 }) }) },
    stopWhen: stepCountIs(3),
  });
  assert.equal(await result.text, "Coffee is in aisle 4.");
  assert.equal(executed, true);
  assert.equal(model.doStreamCalls.length, 2);
});

function loadRoute({ inventory = {}, products = {}, aiModule, model } = {}) {
  let captured;
  const stubAi = {
    convertToModelMessages: async (messages) => messages,
    stepCountIs: (count) => ({ count }),
    tool: (definition) => definition,
    streamText: (options) => {
      captured = options;
      return { toUIMessageStreamResponse: () => new Response("stream") };
    },
  };
  const ai = aiModule ?? stubAi;
  class InvalidModelIdError extends Error {}
  const context = {
    exports: {},
    Response,
    Request,
    console: { error: () => {} },
    require: (id) => {
      if (id === "ai") return ai;
      if (id === "zod") return { z };
      if (id === "@/lib/ai") return { getModel: () => model ?? ({ id: "mock" }), InvalidModelIdError, providerOptions: {} };
      if (id === "@/lib/inventory") return {
        searchProducts: inventory.searchProducts ?? (async () => []),
        getProductBySku: inventory.getProductBySku ?? (async () => null),
        getAisleInventory: inventory.getAisleInventory ?? (async () => []),
      };
      if (id === "@/lib/products") return {
        getProductSlugsForTenant: products.getProductSlugsForTenant ?? ((tenantId) => tenantId === "cvs-2841" ? ["nyquil-severe", "lumify"] : tenantId === "sunrise-deli" ? ["white-claw"] : []),
        getProductContent: products.getProductContent ?? ((slug) => slug === "nyquil-severe"
          ? { slug, sku: "CVS-9100001", tenantId: "cvs-2841", brand: "Vicks", name: "NyQuil SEVERE" }
          : slug === "lumify"
            ? { slug, sku: "CVS-9100002", tenantId: "cvs-2841", brand: "Lumify", name: "Redness Reliever" }
          : slug === "white-claw"
            ? { slug, sku: "CVS-9100003", tenantId: "sunrise-deli" }
            : undefined),
        getProductChatAliases: products.getProductChatAliases ?? ((slug) => slug === "nyquil-severe"
          ? ["nyquil", "nyquill", "vicks nyquil"]
          : slug === "lumify" ? ["lumify", "lumify eye drops"] : []),
      };
      if (id === "@/lib/shopping-agent") return { MAX_CHAT_MESSAGES: 16, MAX_CHAT_TEXT_LENGTH: 800, getStoreContext: (tenant) => tenant === "cvs-2841" ? { tenantId: tenant, storeId: "CVS-DEMO-001", inventoryAvailable: true } : tenant === "sunrise-deli" ? { tenantId: tenant, storeId: null, inventoryAvailable: false } : null };
      throw new Error(`Unexpected import: ${id}`);
    },
  };
  vm.runInNewContext(compile("app/api/chat/route.ts"), context);
  return { post: context.exports.POST, options: () => captured };
}

const userMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Where is coffee?" }] };

test("chat route rejects malformed, system, tool-part, and unknown-store requests", async () => {
  const { post } = loadRoute();
  assert.equal((await post(new Request("http://test", { method: "POST", body: "not json" }))).status, 400);
  for (const body of [
    { tenantId: "unknown", messages: [userMessage] },
    { tenantId: "cvs-2841", messages: [{ ...userMessage, role: "system" }] },
    { tenantId: "cvs-2841", messages: [{ ...userMessage, parts: [{ type: "tool-invocation", toolInvocation: {} }] }] },
  ]) {
    assert.equal((await post(new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))).status, 400);
  }
});

test("chat route scopes tools to CVS and contains inventory failures", async () => {
  const calls = [];
  const { post, options } = loadRoute({ inventory: {
    searchProducts: async (...args) => (calls.push(args), [{ sku: "CVS-1" }]),
    getAisleInventory: async () => { throw new Error("offline"); },
  } });
  const request = (tenantId) => new Request("http://test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenantId, messages: [userMessage] }) });
  assert.equal((await post(request("cvs-2841"))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await options().tools.inventorySearch.execute({ query: " coffee ", limit: 3 }))), { available: true, data: [{ sku: "CVS-1" }] });
  assert.deepEqual(calls, [[" coffee ", "CVS-DEMO-001", 3]]);
  assert.deepEqual(JSON.parse(JSON.stringify(await options().tools.aisleInventory.execute({ aisle: 5 }))), { available: false, reason: "Inventory lookup is temporarily unavailable." });
  await post(request("sunrise-deli"));
  assert.deepEqual(JSON.parse(JSON.stringify(await options().tools.inventorySearch.execute({ query: "coffee", limit: 3 }))), { available: false, reason: "Inventory is not configured for this store." });
  assert.equal(calls.length, 1, "Sunrise must never query CVS inventory");
});

test("location routing hints require one whole-word product match and defer to detail requests", async () => {
  const request = (text) => new Request("http://test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: "cvs-2841", messages: [{ ...userMessage, parts: [{ type: "text", text }] }] }),
  });
  for (const text of ["Can you find Nyquil and Lumify?", "Can you find notlumify?", "Can you find product details for Lumify?"]) {
    const { post, options } = loadRoute();
    assert.equal((await post(request(text))).status, 200);
    assert.doesNotMatch(options().system, /The latest shopper request unambiguously resolves/);
  }
  const { post, options } = loadRoute();
  assert.equal((await post(request("Can you find me Nyquill?"))).status, 200);
  assert.match(options().system, /unambiguously resolves to Vicks NyQuil SEVERE \(nyquil-severe\)/);
});

test("navigation tools only open tenant-owned catalog pages and verify a map SKU location", async () => {
  const skuCalls = [];
  const { post, options } = loadRoute({ inventory: {
    getProductBySku: async (...args) => (skuCalls.push(args), { sku: "CVS-9100001", aisle: 7, rack: 3, shelf_level: 4 }),
  } });
  const request = () => new Request("http://test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: "cvs-2841", messages: [userMessage] }),
  });
  assert.equal((await post(request())).status, 200);
  const tools = options().tools;
  assert.deepEqual(JSON.parse(JSON.stringify(await tools.openProductDetails.execute({ productSlug: "nyquil-severe" }))), {
    opened: true,
    action: "open-product-details",
    productSlug: "nyquil-severe",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await tools.openProductDetails.execute({ productSlug: "white-claw" }))), {
    opened: false,
    reason: "That product page is unavailable for this store.",
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await tools.openProductMap.execute({ productSlug: "nyquil-severe" }))), {
    opened: true,
    action: "open-product-map",
    productSlug: "nyquil-severe",
  });
  assert.deepEqual(skuCalls, [["CVS-9100001", "CVS-DEMO-001"]]);

  const noLocation = loadRoute({ inventory: { getProductBySku: async () => null } });
  assert.equal((await noLocation.post(request())).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await noLocation.options().tools.openProductMap.execute({ productSlug: "nyquil-severe" }))), {
    opened: false,
    reason: "This product has no verified shelf location at this store.",
  });

  const lookupFailure = loadRoute({ inventory: { getProductBySku: async () => { throw new Error("offline"); } } });
  assert.equal((await lookupFailure.post(request())).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await lookupFailure.options().tools.openProductMap.execute({ productSlug: "nyquil-severe" }))), {
    opened: false,
    reason: "The shelf location could not be verified right now.",
  });

  const sunrise = loadRoute();
  const sunriseRequest = new Request("http://test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: "sunrise-deli", messages: [userMessage] }),
  });
  assert.equal((await sunrise.post(sunriseRequest)).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(await sunrise.options().tools.openProductMap.execute({ productSlug: "white-claw" }))), {
    opened: false,
    reason: "Inventory is not configured for this store, so a shelf map cannot be shown.",
  });
});

test("a streamed ‘find me Lumify’ request carries verified inventory through to a map navigation result", async () => {
  const model = new MockLanguageModelV4({
    doStream: [
      { stream: simulateReadableStream({ chunks: [
        { type: "tool-call", toolCallId: "call-search", toolName: "inventorySearch", input: '{"query":"Lumify Redness Reliever","limit":5}' },
        { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_calls" }, usage, logprobs: undefined },
      ] }) },
      { stream: simulateReadableStream({ chunks: [
        { type: "tool-call", toolCallId: "call-map", toolName: "openProductMap", input: '{"productSlug":"lumify"}' },
        { type: "finish", finishReason: { unified: "tool-calls", raw: "tool_calls" }, usage, logprobs: undefined },
      ] }) },
      { stream: simulateReadableStream({ chunks: [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "Opening the map for Lumify." },
        { type: "text-end", id: "text-1" },
        { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage, logprobs: undefined },
      ] }) },
    ],
  });
  const inventoryCalls = [];
  const { post } = loadRoute({
    aiModule: await import("ai"),
    model,
    inventory: {
      searchProducts: async (...args) => {
        inventoryCalls.push(args);
        return [{ sku: "CVS-9100002", product_name: "LUMIFY Redness Reliever Eye Drops", aisle: 18 }];
      },
      getProductBySku: async () => ({ sku: "CVS-9100002", aisle: 18, rack: 1, shelf_level: 1 }),
    },
  });
  const response = await post(new Request("http://test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId: "cvs-2841", messages: [{ ...userMessage, parts: [{ type: "text", text: "Can you find me Lumify?" }] }] }),
  }));
  assert.equal(response.status, 200);
  const parsedChunks = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema })
    .pipeThrough(new TransformStream({
      transform(result, controller) {
        if (result.success) controller.enqueue(result.value);
      },
    }));
  const snapshots = [];
  for await (const message of readUIMessageStream({ stream: parsedChunks })) snapshots.push(message);
  assert.deepEqual(inventoryCalls, [["Lumify Redness Reliever", "CVS-DEMO-001", 5]]);
  const command = loadShoppingAgent().navigationFromMessage(snapshots.at(-1));
  assert.deepEqual(JSON.parse(JSON.stringify(command)), { toolCallId: "call-map", href: "/map/lumify" });
});
