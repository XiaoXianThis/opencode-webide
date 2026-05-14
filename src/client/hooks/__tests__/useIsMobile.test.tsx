import { beforeEach, describe, expect, it } from "bun:test";
import { act, render, screen } from "@testing-library/react";
import { useIsMobile } from "../useIsMobile";

class MediaQueryListStub extends EventTarget {
  matches: boolean;
  media = "(max-width: 767px)";
  onchange: ((event: Event) => void) | null = null;

  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }

  setMatches(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

function Probe() {
  return <div>{useIsMobile() ? "mobile" : "desktop"}</div>;
}

let media: MediaQueryListStub;

beforeEach(() => {
  media = new MediaQueryListStub(true);
  window.matchMedia = () => media;
});

describe("useIsMobile", () => {
  it("reads and subscribes to the mobile media query", async () => {
    render(<Probe />);

    expect(screen.getByText("mobile")).toBeInTheDocument();
    act(() => media.setMatches(false));

    expect(await screen.findByText("desktop")).toBeInTheDocument();
  });
});
