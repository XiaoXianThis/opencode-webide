import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "../MarkdownView";

describe("MarkdownView", () => {
  it("renders inline emphasis as <strong>/<em>", () => {
    render(<MarkdownView text="**bold** and _italic_" />);
    const root = screen.getByTestId("markdown");
    expect(root.querySelector("strong")?.textContent).toBe("bold");
    expect(root.querySelector("em")?.textContent).toBe("italic");
  });

  it("renders unordered lists as <ul><li>…", () => {
    render(<MarkdownView text={"- a\n- b\n- c"} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((el) => el.textContent)).toEqual(["a", "b", "c"]);
  });

  it("renders ordered lists as <ol>", () => {
    const { container } = render(<MarkdownView text={"1. one\n2. two"} />);
    expect(container.querySelector("ol")).not.toBeNull();
  });

  it("renders fenced code blocks with a language label", () => {
    render(<MarkdownView text={"```ts\nconst x = 1\n```"} />);
    const label = screen.getByTestId("markdown-code-lang");
    expect(label.textContent).toBe("ts");
    expect(screen.getByText(/const x = 1/)).toBeInTheDocument();
  });

  it("treats inline code (no newline, no language) without a language label", () => {
    render(<MarkdownView text={"this is `inline` code"} />);
    expect(screen.queryByTestId("markdown-code-lang")).toBeNull();
    const { container } = { container: screen.getByTestId("markdown") };
    const code = container.querySelector("code");
    expect(code?.textContent).toBe("inline");
  });

  it("links http(s) URLs through HeroUI Link with rel=noopener", () => {
    render(<MarkdownView text={"[hi](https://example.com)"} />);
    const a = screen.getByRole("link");
    expect(a).toHaveAttribute("href", "https://example.com");
    expect(a.getAttribute("rel") ?? "").toMatch(/noopener/);
  });

  it("does not produce a link for non-http schemes", () => {
    render(<MarkdownView text={"[bad](javascript:alert(1))"} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByTestId("markdown").textContent).toContain("bad");
  });

  it("escapes raw HTML by default (no XSS via <script>)", () => {
    const { container } = render(
      <MarkdownView text={"<script>window.__pwn__=1</script>safe"} />,
    );
    expect(container.querySelector("script")).toBeNull();
    // The literal text falls through.
    expect(container.textContent).toContain("safe");
  });

  it("supports GFM tables", () => {
    const md = ["| a | b |", "|---|---|", "| 1 | 2 |"].join("\n");
    const { container } = render(<MarkdownView text={md} />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("th").length).toBe(2);
  });
});
