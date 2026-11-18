import type { ComponentType } from "react";
import {
  ArrowLeftRight,
  Armchair,
  BedSingle,
  Bike,
  Building2,
  CookingPot,
  GraduationCap,
  KeyRound,
  LampDesk,
  Library,
  MapPin,
  PackageOpen,
  Sofa,
} from "@/components/icons";
import type { Intent, ItemId, Place } from "./onboardingContent";

export type IntroIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

/** Lucide has no desk, so this one is drawn on the same 24px grid and stroke. */
function DeskIcon({
  size = 24,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 7h20" />
      <path d="M4 7v13" />
      <path d="M13 7v13h7V7" />
      <path d="M13 13.5h7" />
      <path d="M15.5 10.25h2" />
      <path d="M15.5 16.75h2" />
    </svg>
  );
}

export const itemIcons: Record<ItemId, IntroIcon> = {
  desk: DeskIcon,
  chair: Armchair,
  bed: BedSingle,
  shelf: Library,
  lamp: LampDesk,
  sofa: Sofa,
  kitchen: CookingPot,
  bike: Bike,
};

export const intentIcons: Record<Intent, IntroIcon> = {
  sell: PackageOpen,
  find: KeyRound,
  both: ArrowLeftRight,
};

export const placeIcons: Record<Place["kind"], IntroIcon> = {
  campus: GraduationCap,
  residence: Building2,
  city: MapPin,
};
