"use client";

import { useEffect } from "react";

const PERSIAN_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const TEXT_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, span, div, label, button, a, li, td, th, option";

const SKIPPED_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

/**
 * Only the element's own text nodes count — not the whole subtree. Testing
 * `textContent` marked every wrapper above a Persian string with
 * `.force-persian !important`, which dragged all the English text inside
 * those containers into the Persian font too. Leaf elements that actually
 * hold Persian text still get marked, and their children inherit the font.
 */
function hasDirectPersianText(element: Element): boolean {
  for (const node of element.childNodes) {
    if (
      node.nodeType === Node.TEXT_NODE &&
      PERSIAN_REGEX.test(node.nodeValue || "")
    ) {
      return true;
    }
  }
  return false;
}

// Elements the detector marked itself. Some components apply `force-persian`
// statically in JSX; those must never be unmarked here.
const detectorMarked = new WeakSet<Element>();

function markIfPersian(element: Element) {
  if (SKIPPED_TAGS.includes(element.tagName)) return;
  if (hasDirectPersianText(element)) {
    if (!element.classList.contains("force-persian")) {
      element.classList.add("force-persian");
      detectorMarked.add(element);
    }
  } else if (detectorMarked.has(element)) {
    // Text rewritten from Persian to English — drop the stale font.
    element.classList.remove("force-persian");
    detectorMarked.delete(element);
  }
}

/** The element itself (when it qualifies) plus every qualifying descendant. */
function markSubtree(root: Element) {
  if (root.matches(TEXT_SELECTOR)) markIfPersian(root);
  root.querySelectorAll(TEXT_SELECTOR).forEach(markIfPersian);
}

/**
 * Hook that automatically detects Persian text in the DOM and applies Persian font
 */
export function usePersianFontDetection() {
  useEffect(() => {
    markSubtree(document.body);

    const observer = new MutationObserver((mutations) => {
      // Applied synchronously. MutationObserver callbacks run as microtasks —
      // after the DOM change, but still before the browser paints it — so the
      // Persian font is in place on the very first frame the new text appears.
      // This used to be deferred behind a 100ms timeout, which let route
      // changes and the date picker paint once in the Latin font and then
      // visibly snap to the Persian one.
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              markSubtree(node as Element);
            } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
              // Text inserted straight into an existing element.
              markIfPersian(node.parentElement);
            }
          });
        } else if (mutation.type === "characterData") {
          // Text rewritten in place — how React swaps a label to Persian once
          // settings or async data arrive. The old code never watched for this,
          // so such text could keep the Latin font indefinitely.
          const parent = mutation.target.parentElement;
          if (parent) {
            markIfPersian(parent);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}

/**
 * Component that enables automatic Persian font detection for its children
 */
export function PersianFontDetector({ children }: { children: React.ReactNode }) {
  usePersianFontDetection();
  return <>{children}</>;
}
