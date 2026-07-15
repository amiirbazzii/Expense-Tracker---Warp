"use client";

import { useState, useLayoutEffect, type RefObject } from "react";

interface UsePopoverPositionOptions {
  isOpen: boolean;
  wrapperRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  popoverWidth: number;
}

export function usePopoverPosition({
  isOpen,
  wrapperRef,
  popoverRef,
  popoverWidth,
}: UsePopoverPositionOptions) {
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!isOpen) return;

    const popoverElement = popoverRef.current;

    const updatePosition = () => {
      if (!wrapperRef.current) return;

      const triggerRect = wrapperRef.current.getBoundingClientRect();
      const popoverHeight = popoverElement?.offsetHeight || 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const showBelow = spaceBelow >= popoverHeight || spaceAbove < popoverHeight;

      const margin = 8;
      let left = triggerRect.left;
      if (left + popoverWidth > viewportWidth - margin) {
        left = viewportWidth - popoverWidth - margin;
      }
      if (left < margin) left = margin;

      setPopoverStyle({
        position: "fixed",
        zIndex: 50,
        width: popoverWidth,
        left,
        ...(showBelow
          ? { top: triggerRect.bottom + 4 }
          : { bottom: viewportHeight - triggerRect.top + 4 }),
      });
    };

    updatePosition();

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, wrapperRef, popoverRef, popoverWidth]);

  return { popoverStyle };
}
