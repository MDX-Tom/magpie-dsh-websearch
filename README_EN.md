<h1 align="center">🔍 Magpie DSH WebSearch</h1>

<p align="center">
  Fixes missing web search summaries and blank citation snippets when DeepSeek Harness (DSH) connects through Magpie.
</p>

<p align="center">
  <a href="https://usemagpie.ai/"><img alt="Magpie Middleware" src="https://img.shields.io/badge/Magpie-Gateway_Middleware-111827?style=flat-square" /></a>
  <a href="https://github.com/deepseek-ai"><img alt="DeepSeek Harness" src="https://img.shields.io/badge/Agent-DeepSeek_Harness-0284C7?style=flat-square" /></a>
  <a href="https://nodejs.org/"><img alt="Node / Bun" src="https://img.shields.io/badge/Runtime-moejs%20%2F%20Bun-3776AB?style=flat-square" /></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" /></a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
</p>

> [!IMPORTANT]
> **This plugin resolves the issue where DeepSeek Harness (DSH) cannot retrieve complete citation summaries during web search through Magpie.**
> 
> DSH's web search parser (`dsh-web-search-deepseek`) requires text blocks to include matching Anthropic `citations[].cited_text` objects for each URL and discards the upstream provider's prose answer. Because Magpie's Anthropic layer does not attach `citations[]`, DSH renders bare links without snippets (`[title](url) — `). This middleware intercepts the response (`onResponse`), extracts the model's synthesised answer, and builds clean `url_citation` blocks so DSH displays rich, informative search snippets.

---

## Why It Is Needed

| Comparison | Stock Magpie + DSH | With magpie-dsh-websearch |
| --- | --- | --- |
| **Problem** | DSH web search shows only bare links with missing content snippets | Restores standard Anthropic citations and rich snippet text |
| **Method** | Manually re-prompting or clicking into links | Injects synthesised citations in the gateway `onResponse` hook (< 1 ms) |
| **Outcome** | Empty snippets: `[title](url) — ` | Full rich cards: `[title](url) — <answer & snippet>` |
| **Overhead** | None | Strict bounding guards (default 4KB), zero latency impact |
| **Configurability** | Inflexible | Customizable via Magpie GUI options or CLI |

---

## Installation

### Method 1: Magpie Desktop GUI (Recommended)

1. Open **Magpie Desktop**, go to **Plugins** in the sidebar.
2. Select **Discover → Unofficial Plugins · GitHub**.
3. Search for `magpie-dsh-websearch`, click **Add** and enable it.

### Method 2: Magpie CLI

```bash
magpie plugin add github:MDX-Tom/magpie-dsh-websearch
```

### Method 3: Local Development Folder

```bash
git clone https://github.com/MDX-Tom/magpie-dsh-websearch.git
magpie plugin add ./magpie-dsh-websearch
```

---

## Configuration Options

Configure options directly in Magpie UI under **Plugins → Installed → DSH WebSearch Citations → Options**:

```json
{
  "enabled": true,
  "maxCitedText": 4000,
  "maxDigest": 120,
  "maxCitations": 12
}
```

Or via CLI:

```bash
# Set primary source snippet length
magpie plugin options magpie-dsh-websearch '{"maxCitedText": 6000}'

# Set subsequent source digest length
magpie plugin options magpie-dsh-websearch '{"maxDigest": 150}'

# Disable temporarily
magpie plugin options magpie-dsh-websearch '{"enabled": false}'

# Reset to defaults
magpie plugin options magpie-dsh-websearch off
```

---

## License

[MIT](LICENSE)
