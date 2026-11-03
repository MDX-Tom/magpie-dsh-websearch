import test from "node:test";
import assert from "node:assert/strict";
import { onResponse } from "./magpie-websearch-citations.middleware.js";

test("injects citations into text block when web_search_tool_result is present", () => {
  const body = {
    role: "assistant",
    content: [
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://example.com/a", title: "Site A" },
          { type: "web_search_result", url: "https://example.com/b", title: "Site B" },
        ],
      },
      {
        type: "text",
        text: "Here is the comprehensive answer summarized from Site A and Site B.",
      },
    ],
  };

  const res = onResponse(body, { protocol: "anthropic" });
  assert.ok(res);
  const textBlock = res.content.find((b) => b.type === "text");
  assert.ok(textBlock.citations);
  assert.equal(textBlock.citations.length, 2);
  assert.equal(textBlock.citations[0].url, "https://example.com/a");
  assert.equal(textBlock.citations[0].title, "Site A");
  assert.equal(textBlock.citations[0].cited_text, "Here is the comprehensive answer summarized from Site A and Site B.");
  assert.equal(textBlock.citations[1].url, "https://example.com/b");
  assert.ok(textBlock.citations[1].cited_text.length <= 125);
});

test("bypasses when protocol is not anthropic", () => {
  const body = {
    content: [
      { type: "web_search_tool_result", content: [{ url: "https://example.com" }] },
      { type: "text", text: "Answer" },
    ],
  };
  const res = onResponse(body, { protocol: "openai" });
  assert.equal(res, undefined);
});

test("bypasses when enabled = false", () => {
  const body = {
    content: [
      { type: "web_search_tool_result", content: [{ url: "https://example.com" }] },
      { type: "text", text: "Answer" },
    ],
  };
  const res = onResponse(body, { protocol: "anthropic", options: { enabled: false } });
  assert.equal(res, undefined);
});

test("respects maxDigest and maxCitations options", () => {
  const body = {
    content: [
      {
        type: "web_search_tool_result",
        content: [
          { url: "https://example.com/1", title: "1" },
          { url: "https://example.com/2", title: "2" },
          { url: "https://example.com/3", title: "3" },
        ],
      },
      {
        type: "text",
        text: "Long long answer text that should be digested into small parts.",
      },
    ],
  };
  const res = onResponse(body, {
    protocol: "anthropic",
    options: { maxCitations: 2, maxDigest: 10 },
  });
  assert.ok(res);
  const citations = res.content[1].citations;
  assert.equal(citations.length, 2);
  assert.ok(citations[1].cited_text.endsWith("…"));
});

test("safely handles malformed body without throwing", () => {
  assert.equal(onResponse(null, {}), undefined);
  assert.equal(onResponse({}, {}), undefined);
  assert.equal(onResponse({ content: [] }, {}), undefined);
});
