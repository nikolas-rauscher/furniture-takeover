import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";
import "./switch.css";

/** A tactile switch: a light thumb on a lip slides along a sunken track that turns blue when on. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn("switch", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
