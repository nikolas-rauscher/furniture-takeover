import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AnimateIcon } from "@animate-ui/react/icons";

const buttonVariants = cva("", {
  variants: {
    variant: {
      plain: "",
      default: "button primary",
      secondary: "button secondary",
      outline: "button secondary",
      ghost: "text-button",
      link: "text-button",
      destructive: "button danger",
    },
    size: {
      default: "",
      xs: "small",
      sm: "small",
      icon: "icon-button",
      "icon-sm": "icon-button",
      "icon-xs": "icon-button",
    },
  },
  defaultVariants: { variant: "plain", size: "default" },
});

function Button({
  className,
  variant = "plain",
  size = "default",
  type = "button",
  animateIcon = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { animateIcon?: boolean }) {
  const button = (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
  return animateIcon ? (
    <AnimateIcon
      animateOnHover={!props.disabled}
      animateOnTap={!props.disabled}
      asChild
    >
      {button}
    </AnimateIcon>
  ) : (
    button
  );
}

export { Button, buttonVariants };
