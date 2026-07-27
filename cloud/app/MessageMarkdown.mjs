import { createElement } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isSafeImageSource(source) {
  if (!source) return false;
  if (/^https?:\/\//i.test(source)) return true;
  return (
    source.startsWith("/") ||
    source.startsWith("./") ||
    source.startsWith("../")
  );
}

function MarkdownImage({ node, src, ...props }) {
  void node;
  if (!isSafeImageSource(src)) return null;
  return createElement("img", {
    ...props,
    src,
    loading: "lazy",
    decoding: "async",
    referrerPolicy: "no-referrer",
  });
}

export function MessageMarkdown({ content }) {
  return createElement(
    "div",
    { className: "message-markdown" },
    createElement(
      Markdown,
      {
        remarkPlugins: [remarkGfm],
        components: { img: MarkdownImage },
      },
      content,
    ),
  );
}
