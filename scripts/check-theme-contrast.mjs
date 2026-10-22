import fs from "node:fs";
// Checks every country's page colours against the black theme (WCAG AA).
// - black text on the bright "main" fill (buttons) must reach 4.5
// - "main" as link or text colour on the panel (#121212) and card (#181818) must reach 4.5
// - the light "ink" text on the dark "tint" panel must reach 4.5
const src = fs.readFileSync("lib/countries.ts", "utf8");
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const re = /name: "([^"]+)"[\s\S]*?theme: \{ main: "(#\w+)", ink: "(#\w+)", tint: "(#\w+)" \}/g;
const rows = [["Neutral green", "#1ed760", "#d6ffe6", "#12301e"]];
let m, bad = 0;
while ((m = re.exec(src))) rows.push([m[1], m[2], m[3], m[4]]);
for (const [n, main, ink, tint] of rows) {
  const onFill = ratio("#000000", main), onPanel = ratio(main, "#121212"), onCard = ratio(main, "#181818"), inkTint = ratio(ink, tint);
  const ok = onFill >= 4.5 && onPanel >= 4.5 && onCard >= 4.5 && inkTint >= 4.5;
  if (!ok) bad++;
  console.log(n.padEnd(15), "black-on-main", onFill.toFixed(1), "main-on-panel", onPanel.toFixed(1), "ink-on-tint", inkTint.toFixed(1), ok ? "OK" : "FAIL");
}
process.exit(bad ? 1 : 0);
