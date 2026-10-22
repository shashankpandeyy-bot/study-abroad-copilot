import { DESTINATIONS, NEUTRAL_ART } from "@/lib/countries";

// A small, flat skyline for each city. These are illustrations drawn in code, not photographs.
// One landmark shape per country sits among seeded buildings, in that country's own colours.

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const LANDMARK: Record<string, (x: number, base: number, c: string, ink: string) => React.ReactNode> = {
  // Munich: twin onion domes
  DE: (x, b, c, ink) => (
    <g>
      <rect x={x} y={b - 62} width={14} height={62} fill={ink} />
      <rect x={x + 20} y={b - 62} width={14} height={62} fill={ink} />
      <ellipse cx={x + 7} cy={b - 68} rx={9} ry={11} fill={c} />
      <ellipse cx={x + 27} cy={b - 68} rx={9} ry={11} fill={c} />
    </g>
  ),
  // Toronto: a thin tower with a pod
  CA: (x, b, c, ink) => (
    <g>
      <rect x={x + 6} y={b - 104} width={4} height={104} fill={ink} />
      <ellipse cx={x + 8} cy={b - 74} rx={13} ry={5} fill={c} />
      <rect x={x + 2} y={b - 70} width={12} height={6} fill={ink} />
    </g>
  ),
  // Boston: a tall stepped tower
  US: (x, b, c, ink) => (
    <g>
      <rect x={x} y={b - 56} width={26} height={56} fill={ink} />
      <rect x={x + 5} y={b - 78} width={16} height={22} fill={c} />
      <polygon points={`${x + 8},${b - 78} ${x + 13},${b - 98} ${x + 18},${b - 78}`} fill={ink} />
    </g>
  ),
  // London: a clock tower
  GB: (x, b, c, ink) => (
    <g>
      <rect x={x + 4} y={b - 74} width={16} height={74} fill={ink} />
      <rect x={x + 2} y={b - 92} width={20} height={20} fill={c} />
      <circle cx={x + 12} cy={b - 82} r={6} fill="#fff" />
      <polygon points={`${x + 2},${b - 92} ${x + 12},${b - 110} ${x + 22},${b - 92}`} fill={ink} />
    </g>
  ),
  // Melbourne/Sydney: sails
  AU: (x, b, c, ink) => (
    <g>
      <path d={`M${x} ${b} Q${x + 6} ${b - 52} ${x + 28} ${b - 40} Q${x + 24} ${b - 18} ${x + 28} ${b} Z`} fill={c} />
      <path d={`M${x + 24} ${b} Q${x + 28} ${b - 40} ${x + 52} ${b - 30} Q${x + 46} ${b - 12} ${x + 52} ${b} Z`} fill={ink} />
    </g>
  ),
  // Dublin: a round tower
  IE: (x, b, c, ink) => (
    <g>
      <rect x={x + 3} y={b - 70} width={14} height={70} fill={ink} />
      <polygon points={`${x + 3},${b - 70} ${x + 10},${b - 90} ${x + 17},${b - 70}`} fill={c} />
      <rect x={x + 8} y={b - 40} width={4} height={8} fill="#fff" />
    </g>
  ),
  // Amsterdam: stepped canal houses
  NL: (x, b, c, ink) => (
    <g>
      <rect x={x} y={b - 46} width={18} height={46} fill={ink} />
      <polygon points={`${x},${b - 46} ${x + 9},${b - 62} ${x + 18},${b - 46}`} fill={c} />
      <rect x={x + 20} y={b - 56} width={18} height={56} fill={c} />
      <polygon points={`${x + 20},${b - 56} ${x + 29},${b - 70} ${x + 38},${b - 56}`} fill={ink} />
    </g>
  ),
  // Singapore: three towers with a ship on top
  SG: (x, b, c, ink) => (
    <g>
      <rect x={x} y={b - 66} width={10} height={66} fill={ink} />
      <rect x={x + 14} y={b - 66} width={10} height={66} fill={ink} />
      <rect x={x + 28} y={b - 66} width={10} height={66} fill={ink} />
      <path d={`M${x - 6} ${b - 66} H${x + 44} L${x + 38} ${b - 74} H${x} Z`} fill={c} />
    </g>
  ),
};

export default function CityArt({ code, seed = 1, className = "" }: { code: string; seed?: number; className?: string }) {
  const dest = DESTINATIONS.find((d) => d.code === code);
  const t = dest?.art ?? NEUTRAL_ART;
  const rand = rng(seed + (code.charCodeAt(0) || 7) * 31 + (code.charCodeAt(1) || 3));
  const base = 132;
  const blocks: { x: number; w: number; h: number; shade: number }[] = [];
  let x = -6;
  while (x < 330) {
    const w = 14 + Math.floor(rand() * 20);
    blocks.push({ x, w, h: 22 + Math.floor(rand() * 54), shade: rand() });
    x += w + 2;
  }
  const landmarkX = 168 + Math.floor(rand() * 40);
  return (
    <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMax slice" className={`block w-full ${className}`} aria-hidden>
      <rect width="320" height="140" fill={t.tint} />
      <circle cx={52 + Math.floor(rand() * 40)} cy={34} r={15} fill="#ffb000" />
      {blocks.map((b, i) => (
        <rect key={i} x={b.x} y={base - b.h} width={b.w} height={b.h} fill={t.main} opacity={0.16 + b.shade * 0.24} />
      ))}
      {LANDMARK[code]?.(landmarkX, base, t.main, t.ink)}
      {!LANDMARK[code] && <rect x={landmarkX} y={base - 80} width={22} height={80} fill={t.ink} />}
      <rect y={base} width="320" height="8" fill={t.ink} opacity={0.9} />
    </svg>
  );
}
