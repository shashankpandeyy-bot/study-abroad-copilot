"use client";

import { EXPORT_NOTE, paragraphs, splitBlanks } from "@/lib/export";
import type { ApplicationPackage, Program } from "@/lib/types";

// Only visible when printing (see globals.css). Blanks stay highlighted on paper.
export default function PrintableDraft({
  name,
  program,
  application,
}: {
  name: string;
  program: Program;
  application: ApplicationPackage;
}) {
  return (
    <div className="print-area hidden print:block" style={{ fontFamily: "Georgia, serif", color: "#111" }}>
      <h1 style={{ fontSize: "20pt", marginBottom: "4pt" }}>Statement of Purpose: {program.program}</h1>
      <p style={{ fontStyle: "italic", marginBottom: "16pt" }}>
        {program.university}, {program.country}
        {name ? `  |  ${name}` : ""}
      </p>
      {paragraphs(application.sop).map((p, i) => (
        <p key={i} style={{ marginBottom: "10pt", lineHeight: 1.5, fontSize: "11.5pt" }}>
          {splitBlanks(p).map((piece, j) =>
            piece.blank ? <mark key={j}>{piece.text}</mark> : <span key={j}>{piece.text}</span>
          )}
        </p>
      ))}
      <p style={{ marginTop: "18pt", fontSize: "9pt", color: "#666", fontStyle: "italic" }}>{EXPORT_NOTE}</p>
    </div>
  );
}
