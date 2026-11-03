/**
 * magpie-dsh-websearch / magpie-websearch-citations.middleware.js
 *
 * Magpie Gateway Middleware
 * -------------------------
 * Bridges Magpie's hosted web_search response with DeepSeek Harness (DSH).
 *
 * Problem:
 * DeepSeek Harness (dsh-web-search-deepseek) requires citations on Anthropic text
 * blocks (`citations[].cited_text`) matching the search result URL to display snippets.
 * Magpie returns `{ type: "web_search_tool_result", content: [...] }` followed by
 * a `{ type: "text", text: "..." }` block without citations[], causing DSH to render
 * bare link titles with empty snippets.
 *
 * Solution:
 * This onResponse middleware synthesizes valid Anthropic `url_citation` blocks
 * from the model's synthesized answer text, attaching them to the text block.
 * DSH then cleanly renders `- [title](url) — <answer snippet>`.
 *
 * Runs inside Magpie's gateway moejs runtime (no fetch, no Node APIs, never throws).
 */

const DEFAULT_MAX_CITED_TEXT = 4000;
const DEFAULT_MAX_DIGEST = 120;
const DEFAULT_MAX_CITATIONS = 12;

/**
 * Extract concatenated text from text blocks in Anthropic response content.
 */
function answerTextOf(content) {
  const parts = [];
  for (const block of content) {
    if (block && block.type === "text" && typeof block.text === "string" && block.text.length > 0) {
      parts.push(block.text);
    }
  }
  return parts.join("\n\n").trim();
}

/**
 * Extract all search result items from web_search_tool_result blocks.
 */
function searchResultsOf(content) {
  const items = [];
  for (const block of content) {
    if (!block || block.type !== "web_search_tool_result") continue;
    const list = Array.isArray(block.content) ? block.content : [];
    for (const item of list) {
      if (item && typeof item.url === "string" && item.url.length > 0) {
        items.push(item);
      }
    }
  }
  return items;
}

/**
 * onResponse hook: modifies the Anthropic response before sending back to agent.
 */
export function onResponse(body, ctx) {
  try {
    if (!body || typeof body !== "object") return;

    // Respect plugin options
    const options = (ctx && ctx.options && typeof ctx.options === "object") ? ctx.options : {};
    if (options.enabled === false) return;

    // Only process Anthropic protocol responses
    if (ctx && ctx.protocol && ctx.protocol !== "anthropic") return;

    const content = body.content;
    if (!Array.isArray(content) || content.length === 0) return;

    const results = searchResultsOf(content);
    if (results.length === 0) return;

    const answer = answerTextOf(content);
    if (answer.length === 0) return;

    const maxCited = typeof options.maxCitedText === "number" && options.maxCitedText > 0
      ? Math.floor(options.maxCitedText)
      : DEFAULT_MAX_CITED_TEXT;

    const maxDigest = typeof options.maxDigest === "number" && options.maxDigest > 0
      ? Math.floor(options.maxDigest)
      : DEFAULT_MAX_DIGEST;

    const maxCitations = typeof options.maxCitations === "number" && options.maxCitations > 0
      ? Math.floor(options.maxCitations)
      : DEFAULT_MAX_CITATIONS;

    const cited = answer.length > maxCited ? answer.slice(0, maxCited) + "…" : answer;
    const digest = cited.length > maxDigest ? cited.slice(0, maxDigest).replace(/\s+/g, " ") + "…" : cited;

    const citations = results.slice(0, maxCitations).map((item, index) => ({
      type: "url_citation",
      url: item.url,
      ...(typeof item.title === "string" && item.title.length > 0 ? { title: item.title } : {}),
      cited_text: index === 0 ? cited : digest,
    }));

    let touched = false;
    for (const block of content) {
      if (block && block.type === "text" && typeof block.text === "string" && block.text.length > 0) {
        block.citations = citations;
        touched = true;
      }
    }

    if (!touched) return;
    return body;
  } catch (err) {
    // In moejs runtime, middleware must never throw
    return;
  }
}
