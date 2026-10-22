// A passport stamp. Earned stamps thump in once with a slight tilt. Unearned ones are faint outlines.
export default function Stamp({
  title,
  sub,
  earned,
  tilt = -8,
  tone = "main",
}: {
  title: string;
  sub?: string;
  earned: boolean;
  tilt?: number;
  tone?: "main" | "stamp";
}) {
  const color = tone === "stamp" ? "text-stamp border-stamp" : "text-main border-main";
  return (
    <div
      style={{ ["--tilt" as string]: `${tilt}deg`, transform: `rotate(${tilt}deg)` }}
      className={`grid h-[5.25rem] w-[5.25rem] shrink-0 place-items-center rounded-full border-[3px] border-double p-1.5 text-center ${
        earned ? `stamp-earned ${color}` : "border-dashed border-ink/20 text-ink/30"
      }`}
      role="img"
      aria-label={`${title}${sub ? ", " + sub : ""}: ${earned ? "earned" : "not yet"}`}
    >
      <span>
        <span className="num block text-[10px] leading-tight">{title}</span>
        {sub && <span className="mt-0.5 block text-[10px] font-medium leading-tight">{sub}</span>}
      </span>
    </div>
  );
}
