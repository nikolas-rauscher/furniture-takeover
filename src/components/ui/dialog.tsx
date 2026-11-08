import { Dialog as DialogPrimitive } from "@animate-ui/react/primitives/base-ui/dialog";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="modal-overlay fixed inset-0 z-[100]"
        transition={{ duration: 0.2 }}
        exitTransition={{ duration: 0.15 }}
      />
      <DialogPrimitive.Viewport className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-6">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn("modal", className)}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          exitTransition={{ duration: 0.15 }}
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
};
