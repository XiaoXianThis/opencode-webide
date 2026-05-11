import { memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@heroui/react";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  text: string;
  className?: string;
}

// TODO(M3): swap the inline code styling for shiki-powered syntax highlighting
// once the bundle hit is acceptable. For now we render a plain <pre><code>
// with a small language label.

const components: Components = {
  p: ({ children }) => (
    <p className="leading-relaxed text-foreground first:mt-0 last:mb-0 [&:not(:first-child)]:mt-2">
      {children}
    </p>
  ),
  a: ({ href, children }) => {
    const safe =
      typeof href === "string" && (href.startsWith("http://") || href.startsWith("https://"));
    if (!safe) {
      return <span className="break-all text-default-500">{children}</span>;
    }
    return (
      <Link
        href={href}
        isExternal
        rel="noopener noreferrer nofollow"
        className="text-[13px]"
      >
        {children}
      </Link>
    );
  },
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-0.5 pl-5 marker:text-default-400">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-0.5 pl-5 marker:text-default-400">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-1 border-l-2 border-default-300 pl-3 text-default-500">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="mt-3 mb-1 text-base font-semibold text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-1 text-sm font-semibold text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-sm font-medium text-foreground">{children}</h3>
  ),
  hr: () => <hr className="my-2 border-default-200" />,
  table: ({ children }) => (
    <div className="my-1 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-default-200 bg-content2 px-2 py-1 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-default-200 px-2 py-1 align-top">{children}</td>
  ),
  code: ({ className, children, node, ...rest }) => {
    // react-markdown passes `inline` via parent context in v9+, sniff via
    // node tag instead.
    const isBlock = (node as { tagName?: string } | undefined)?.tagName === "code"
      ? false
      : false;
    void isBlock;
    const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];
    const isFenced = typeof children === "string" ? children.includes("\n") : false;
    if (!lang && !isFenced) {
      return (
        <code
          className={cn(
            "rounded-sm bg-content2 px-1 py-0.5 font-mono text-[12px] text-foreground",
            className,
          )}
          {...rest}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[12px]", className)} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    // Extract language from the inner <code className="language-xxx">.
    let lang: string | undefined;
    if (
      children &&
      typeof children === "object" &&
      "props" in (children as { props?: unknown })
    ) {
      const cls = (children as { props?: { className?: string } }).props?.className ?? "";
      lang = /language-([\w-]+)/.exec(cls)?.[1];
    }
    return (
      <div className="group/code my-1 overflow-hidden rounded-medium bg-background">
        {lang && (
          <div
            className="flex items-center justify-between border-b border-default-200 bg-content2/60 px-2 py-1 text-[10px] uppercase tracking-wide text-default-500"
            data-testid="markdown-code-lang"
          >
            <span>{lang}</span>
          </div>
        )}
        <pre className="overflow-x-auto p-2 text-[12px] leading-relaxed">
          {children as ReactNode}
        </pre>
      </div>
    );
  },
};

/**
 * Streaming-safe markdown renderer used by `TextPartView`.
 *
 * Memoised on the raw text so unrelated re-renders (e.g. sibling part deltas)
 * don't re-parse the AST. react-markdown sanitises HTML by default
 * (no `rehypeRaw` plugin), so injected `<script>` tags are emitted as text.
 */
export const MarkdownView = memo(function MarkdownView({ text, className }: MarkdownViewProps) {
  return (
    <div
      className={cn(
        "whitespace-normal break-words text-sm leading-relaxed text-foreground",
        className,
      )}
      data-testid="markdown"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
