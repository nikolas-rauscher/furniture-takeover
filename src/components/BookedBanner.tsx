import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { CalendarCheck, Check } from "@/components/icons";
import "./booked-banner.css";

/**
 * "Pickup booked": a calendar tile, the words and a check that draws itself,
 * as in the intro's chat and on a real deal. It replaces the button that
 * confirmed, so it takes keyboard focus from it when asked to.
 */
export default function BookedBanner({
  children = "Pickup booked",
  detail,
  takeFocus = true,
}: {
  children?: ReactNode;
  /** A line under the words, such as who the item is reserved for. */
  detail?: ReactNode;
  takeFocus?: boolean;
}) {
  const banner = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (takeFocus) banner.current?.focus();
  }, [takeFocus]);
  return (
    <motion.p
      ref={banner}
      tabIndex={-1}
      className="booked-banner"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <span className="booked-banner-icon" aria-hidden="true">
        <CalendarCheck size={18} />
      </span>
      <span className="booked-banner-words">
        {children}
        {detail && <small>{detail}</small>}
      </span>
      <Check
        animate
        size={20}
        strokeWidth={3}
        className="booked-banner-check"
        aria-hidden="true"
      />
    </motion.p>
  );
}
