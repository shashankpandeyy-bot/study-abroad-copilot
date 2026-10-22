import fs from "node:fs";
const src = fs.readFileSync("lib/countries.ts", "utf8");
const lum = (h) => { const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
const ratio = (a,b) => { const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const re = /name: "([^"]+)"[\s\S]*?theme: \{ main: "(#\w+)", ink: "(#\w+)", tint: "(#\w+)" \}/g;
let m, bad = 0;
const rows = [["Neutral","#2347e0","#0f1e5a","#e4e9fb"]];
while ((m = re.exec(src))) rows.push([m[1], m[2], m[3], m[4]]);
for (const [n, main, ink, tint] of rows) {
  const a = ratio("#ffffff", main), b = ratio(ink, tint), c = ratio(main, "#eef1f5"), d = ratio(ink, "#ffffff");
  const ok = a>=4.5 && b>=4.5 && c>=3 && d>=4.5; if (!ok) bad++;
  console.log(n.padEnd(15), "white-on-main", a.toFixed(1), "ink-on-tint", b.toFixed(1), "main-on-page", c.toFixed(1), ok?"OK":"FAIL");
}
process.exit(bad?1:0);
