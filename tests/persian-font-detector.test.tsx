import { render } from "@testing-library/react";
import { PersianFontDetector } from "@/components/PersianFontDetector";

const PERSIAN = "سلام دنیا";

/**
 * Flush pending microtasks. MutationObserver callbacks are queued as
 * microtasks, so anything the detector does synchronously is visible after
 * this — while a deferred setTimeout(…, 100) would not be.
 */
const flushMicrotasks = () => Promise.resolve();

describe("PersianFontDetector", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    render(<PersianFontDetector>{null}</PersianFontDetector>);
  });

  afterEach(() => {
    host.remove();
  });

  it("marks Persian text already in the DOM on mount", () => {
    const el = document.createElement("p");
    el.textContent = PERSIAN;
    host.appendChild(el);

    // Mount after the node exists so the initial pass sees it.
    render(<PersianFontDetector>{null}</PersianFontDetector>);

    expect(el.classList.contains("force-persian")).toBe(true);
  });

  it("leaves Latin-only text alone", async () => {
    const el = document.createElement("p");
    el.textContent = "Hello world";
    host.appendChild(el);

    await flushMicrotasks();

    expect(el.classList.contains("force-persian")).toBe(false);
  });

  // The regression this guards: the font used to be applied behind a 100ms
  // timeout, so newly navigated screens and the date picker painted once in
  // the Latin font and then visibly snapped to the Persian one.
  it("marks newly added Persian text without waiting on a timer", async () => {
    const el = document.createElement("p");
    el.textContent = PERSIAN;
    host.appendChild(el);

    await flushMicrotasks();

    expect(el.classList.contains("force-persian")).toBe(true);
  });

  // The regression this guards: containers used to be marked when ANY
  // descendant held Persian text, which dragged every English string inside
  // them into the Persian font too.
  it("marks only the element holding the Persian text, not its container", async () => {
    const container = document.createElement("div");
    const inner = document.createElement("span");
    inner.textContent = PERSIAN;
    const englishSibling = document.createElement("span");
    englishSibling.textContent = "Groceries";
    container.append(inner, englishSibling);
    host.appendChild(container);

    await flushMicrotasks();

    expect(inner.classList.contains("force-persian")).toBe(true);
    expect(container.classList.contains("force-persian")).toBe(false);
    expect(englishSibling.classList.contains("force-persian")).toBe(false);
  });

  it("unmarks text rewritten from Persian back to English", async () => {
    const el = document.createElement("p");
    el.textContent = PERSIAN;
    host.appendChild(el);
    await flushMicrotasks();
    expect(el.classList.contains("force-persian")).toBe(true);

    el.textContent = "Hello world";
    await flushMicrotasks();

    expect(el.classList.contains("force-persian")).toBe(false);
  });

  it("never unmarks a statically forced element", async () => {
    const el = document.createElement("span");
    el.className = "force-persian";
    el.textContent = "English inside a PersianText component";
    host.appendChild(el);

    await flushMicrotasks();

    expect(el.classList.contains("force-persian")).toBe(true);
  });

  it("marks text that is rewritten in place after mount", async () => {
    const el = document.createElement("p");
    el.textContent = "Loading...";
    host.appendChild(el);
    await flushMicrotasks();
    expect(el.classList.contains("force-persian")).toBe(false);

    // How React swaps a label once settings or async data arrive.
    el.textContent = PERSIAN;
    await flushMicrotasks();

    expect(el.classList.contains("force-persian")).toBe(true);
  });

  it("skips form controls", async () => {
    const input = document.createElement("input");
    input.value = PERSIAN;
    host.appendChild(input);

    await flushMicrotasks();

    expect(input.classList.contains("force-persian")).toBe(false);
  });
});
