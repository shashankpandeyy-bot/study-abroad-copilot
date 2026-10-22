import type { ApplicationPackage, Program } from "./types";

export type Piece = { text: string; blank: boolean };

// Splits a draft paragraph into plain text and [PLACEHOLDER: ...] blanks, so blanks can be highlighted.
export function splitBlanks(paragraph: string): Piece[] {
  return paragraph
    .split(/(\[PLACEHOLDER:[^\]]*\])/g)
    .filter((t) => t !== "")
    .map((text) => ({ text, blank: /^\[PLACEHOLDER:/.test(text) }));
}

export function paragraphs(sop: string): string[] {
  return sop
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

export function fileSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "draft";
}

export const EXPORT_NOTE =
  "Written by AI from the applicant's own answers. Replace every highlighted blank and check every fact before you submit.";

// Builds a .docx in the browser. The library is loaded only when this runs.
export async function downloadWord(opts: {
  applicantName: string;
  program: Program;
  application: ApplicationPackage;
}): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const { applicantName, program, application } = opts;

  const body = paragraphs(application.sop).map(
    (p) =>
      new Paragraph({
        spacing: { after: 200 },
        children: splitBlanks(p).map((piece) =>
          piece.blank ? new TextRun({ text: piece.text, highlight: "yellow" }) : new TextRun({ text: piece.text })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(`Statement of Purpose: ${program.program}`)],
          }),
          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: `${program.university}, ${program.country}${applicantName ? `  |  ${applicantName}` : ""}`,
                italics: true,
              }),
            ],
          }),
          ...body,
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: EXPORT_NOTE, italics: true, size: 18, color: "666666" })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sop-${fileSlug(program.university)}-${fileSlug(program.program)}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadTextFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
