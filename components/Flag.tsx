import { AU, CA, DE, GB, IE, IN, NL, SG, US } from "country-flag-icons/react/3x2";

const FLAGS = { AU, CA, DE, GB, IE, IN, NL, SG, US } as const;

export type FlagCode = keyof typeof FLAGS;

// SVG flags, never emoji, so they look the same on every phone.
export default function Flag({ code, className = "", title }: { code: string; className?: string; title?: string }) {
  const Component = FLAGS[code as FlagCode];
  if (!Component) return null;
  return <Component title={title} aria-hidden={title ? undefined : true} className={`block rounded-[3px] ${className}`} />;
}
