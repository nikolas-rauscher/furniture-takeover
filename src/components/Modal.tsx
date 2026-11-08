import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "./ui/dialog";
import { X } from "@/components/icons";
import { fitTextarea } from "../textarea";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: ModalProps) {
  const [open, setOpen] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const fitFields = useCallback(() => {
    if (window.matchMedia("(max-width: 760px)").matches)
      dialogRef.current
        ?.querySelectorAll("textarea")
        .forEach((field) => fitTextarea(field));
  }, []);
  useLayoutEffect(fitFields, [children]);
  const observeDialog = useCallback(
    (element: HTMLDivElement | null) => {
      dialogRef.current = element;
      if (!element) return;
      let width = 0;
      const observer = new ResizeObserver(([entry]) => {
        if (Math.abs(entry.contentRect.width - width) < 1) return;
        width = entry.contentRect.width;
        fitFields();
      });
      observer.observe(element);
      fitFields();
      return () => {
        observer.disconnect();
        dialogRef.current = null;
      };
    },
    [fitFields],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={wide ? "wide" : ""}
        ref={observeDialog}
        initialFocus={dialogRef}
        onInputCapture={(event) => {
          if (
            event.target instanceof HTMLTextAreaElement &&
            window.matchMedia("(max-width: 760px)").matches
          )
            fitTextarea(event.target);
        }}
      >
        <div className="modal-heading">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose
            className="icon-button shrink-0 min-h-11 min-w-11"
            type="button"
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
