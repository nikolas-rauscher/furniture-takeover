import type { ReactNode } from "react";

/** A plain device outline on larger screens; on phones the content fills the page. */
export default function PhoneFrame({
  label,
  children,
}: {
  /** Names the simulated screen for assistive technology. */
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="tour-phone" role="group" aria-label={label}>
      <div className="tour-phone-screen">{children}</div>
    </div>
  );
}
