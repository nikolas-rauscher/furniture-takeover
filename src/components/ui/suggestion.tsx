import type { ComponentProps } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import "./suggestion.css";

export function Suggestions({
  className,
  onFocusCapture,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="suggestions"
      role="group"
      className={cn(
        "ai-suggestions flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar scroll-fade-x",
        className,
      )}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        if (event.defaultPrevented) return;
        const row = event.currentTarget;
        const option = event.target.getBoundingClientRect();
        const bounds = row.getBoundingClientRect();
        // Reveal keyboard focus inside the row without moving the page.
        const offset =
          option.left < bounds.left
            ? option.left - bounds.left
            : Math.max(
                0,
                Math.min(
                  option.right - bounds.right,
                  option.left - bounds.left,
                ),
              );
        if (offset) row.scrollBy({ left: offset, behavior: "instant" });
      }}
      {...props}
    />
  );
}

export function Suggestion({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("ai-suggestion shrink-0", className)}
      {...props}
    />
  );
}
