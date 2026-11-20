import { useMemo } from "react";
import { qrModules } from "./qrMatrix";

/** Light modules around the code that scanners need. */
const QUIET_ZONE = 4;

/** The link as a QR code, drawn as one SVG path of dark modules. */
export default function QrCode({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const { path, size } = useMemo(() => {
    const modules = qrModules(text);
    const squares = modules.flatMap((row, y) =>
      row.flatMap((dark, x) =>
        dark ? [`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`] : [],
      ),
    );
    return { path: squares.join(""), size: modules.length + QUIET_ZONE * 2 };
  }, [text]);
  return (
    <svg
      className="tour-qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#111" />
    </svg>
  );
}
