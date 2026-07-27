import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";

import { MessageMarkdown } from "../app/MessageMarkdown.mjs";

test("agent messages render structured Markdown instead of plain text", () => {
  const html = renderToStaticMarkup(
    MessageMarkdown({
      content: "## 结论\n\n- 支持 **Markdown**\n- 支持 `inline code`",
    }),
  );

  assert.match(html, /<h2>结论<\/h2>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<strong>Markdown<\/strong>/);
  assert.match(html, /<code>inline code<\/code>/);
});

test("agent message images render safely and responsively", () => {
  const html = renderToStaticMarkup(
    MessageMarkdown({
      content:
        "![架构图](https://images.example.com/architecture.png)\n\n![危险](data:image/svg+xml;base64,PHN2Zy8+)",
    }),
  );

  assert.match(html, /<img /);
  assert.match(html, /src="https:\/\/images\.example\.com\/architecture\.png"/);
  assert.match(html, /alt="架构图"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /referrerPolicy="no-referrer"/);
  assert.doesNotMatch(html, /data:image/);
});
