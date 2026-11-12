import { Toggle as TogglePrimitive } from "@animate-ui/react/primitives/base-ui/toggle";
import { cn } from "@/lib/utils";

function Toggle({ className, ...props }: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(
        "ui-toggle transition-colors motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
export { Toggle };
