import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

import { simulateReadableStream, stepCountIs, streamText, tool } from "ai";
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

function loadRoute({ inventory = {} } = {}) {
  let captured;
  const ai = {
    convertToModelMessages: async (messages) => messages,
    stepCountIs: (count) => ({ count }),
    tool: (definition) => definition,
    streamText: (options) => {
      captured = options;
      return { toUIMessageStreamResponse: () => new Response("stream") };
    },
  };
  class InvalidModelIdError extends Error {}
  const context = {
    exports: {},
    Response,
    Request,
    console: { error: () => {} },
    require: (id) => {
      if (id === "ai") return ai;
      if (id === "zod") return { z };
      if (id === "@/lib/ai") return { getModel: () => ({ id: "mock" }), InvalidModelIdError, providerOptions: {} };
      if (id === "@/lib/inventory") return {
        searchProducts: inventory.searchProducts ?? (async () => []),
        getProductBySku: inventory.getProductBySku ?? (async () => null),
        getAisleInventory: inventory.getAisleInventory ?? (async () => []),
      };
      if (id === "@/lib/shopping-agent") return { MAX_CHAT_MESSAGES: 16, MAX_CHAT_TEXT_LENGTH: 800, getStoreContext: (tenant) => tenant === "cvs-2841" ? { storeId: "CVS-DEMO-001", inventoryAvailable: true } : tenant === "sunrise-deli" ? { storeId: null, inventoryAvailable: false } : null };
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
