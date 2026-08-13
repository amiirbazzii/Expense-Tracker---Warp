"use client";

import { useEffect } from "react";

const PERSIAN_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const TEXT_SELECTOR =
  "h1, h2, h3, h4, h5, h6, p, span, div, label, button, a, li, td, th, option";

const SKIPPED_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

function markIfPersian(element: Element) {
  // Already marked, and the class is never taken back off — so bail before
  // touching textContent. This keeps the ancestor walk O(1) per level on the
  // repeat traffic that `characterData` brings in.
  if (element.classList.contains("force-persian")) return;
  if (SKIPPED_TAGS.includes(element.tagName)) return;
  if (PERSIAN_REGEX.test(element.textContent || "")) {
    element.classList.add("force-persian");
  }
}

/** The element itself (when it qualifies) plus every qualifying descendant. */
function markSubtree(root: Element) {
  if (root.matches(TEXT_SELECTOR)) markIfPersian(root);
  root.querySelectorAll(TEXT_SELECTOR).forEach(markIfPersian);
}

/**
 * New text also changes the textContent of everything above it, and the old
 * whole-document rescan marked those ancestors too — `.force-persian` on a
 * container is what keeps a mixed Persian/Latin block in one font. Walking up
 * from the mutation preserves that without rescanning the document.
 */
function markAncestors(element: Element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    markIfPersian(parent);
    parent = parent.parentElement;
  }
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
              const element = node as Element;
              markSubtree(element);
              markAncestors(element);
            } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
              // Text inserted straight into an existing element.
              markIfPersian(node.parentElement);
              markAncestors(node.parentElement);
            }
          });
        } else if (mutation.type === "characterData") {
          // Text rewritten in place — how React swaps a label to Persian once
          // settings or async data arrive. The old code never watched for this,
          // so such text could keep the Latin font indefinitely.
          const parent = mutation.target.parentElement;
          if (parent) {
            markIfPersian(parent);
            markAncestors(parent);
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
