import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { X } from "@/components/icons";
import { fitTextarea } from "../textarea";
import { useInertApp } from "../hooks/useInertApp";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { wrapTabInDialog } from "../dialogFocus";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** On phones the dialog rises from the bottom edge as a sheet. */
  sheet?: boolean;
  /** Set to false to close it from outside, with its closing animation. */
  open?: boolean;
  /** A line under the title. */
  description?: ReactNode;
  /** The id of the field that takes focus when the dialog opens; the dialog itself by default. */
  initialFocus?: string;
};

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
  sheet = false,
  open: openFromOutside = true,
  description,
  initialFocus,
}: ModalProps) {
  const [openHere, setOpenHere] = useState(true);
  const open = openFromOutside && openHere;
  const phone = useMediaQuery("(max-width: 760px)");
  useInertApp(open);
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
      onOpenChange={setOpenHere}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={wide ? "wide" : ""}
        sheet={sheet && phone}
        ref={observeDialog}
        initialFocus={
          initialFocus ? () => document.getElementById(initialFocus) : dialogRef
        }
        onKeyDown={wrapTabInDialog}
        onInputCapture={(event) => {
          if (
            event.target instanceof HTMLTextAreaElement &&
            window.matchMedia("(max-width: 760px)").matches
          )
            fitTextarea(event.target);
        }}
      >
        <div className="modal-heading">
          {description ? (
            <div className="modal-title">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          ) : (
            <DialogTitle>{title}</DialogTitle>
          )}
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
