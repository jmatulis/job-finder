import { BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun } from "docx";
import type { Resume } from "../resume";

const FONT = "Calibri";
// Right tab stop at the text edge of a Letter page with 0.75" margins (in twips).
const RIGHT_TAB = 10_080;

const heading = (text: string) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 21, font: FONT, characterSpacing: 16 })],
  });

const run = (text: string, opts: { bold?: boolean; color?: string; size?: number } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? 20, bold: opts.bold, color: opts.color });

const splitRow = (left: TextRun[], right: string) =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    children: [...left, run(`\t${right}`, { color: "555555" })],
  });

export async function renderResumeDocx(r: Resume): Promise<Buffer> {
  const children: Paragraph[] = [];
  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...r.contact.links].filter(Boolean).join("  |  ");

  children.push(new Paragraph({ children: [run(r.contact.name, { bold: true, size: 40 })] }));
  if (contact) children.push(new Paragraph({ spacing: { after: 120 }, children: [run(contact, { color: "444444", size: 18 })] }));

  if (r.summary) {
    children.push(heading("Summary"), new Paragraph({ children: [run(r.summary)] }));
  }

  if (r.experience.length) {
    children.push(heading("Experience"));
    for (const e of r.experience) {
      children.push(
        splitRow([run(e.title, { bold: true }), run(e.company ? `, ${e.company}` : "", { bold: true })], [e.start, e.end].filter(Boolean).join(" – ")),
      );
      if (e.location) children.push(new Paragraph({ children: [run(e.location, { color: "555555" })] }));
      for (const b of e.bullets) {
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { before: 20 }, children: [run(b)] }));
      }
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }
  }

  if (r.projects.length) {
    children.push(heading("Projects"));
    for (const p of r.projects) {
      children.push(splitRow([run(p.name, { bold: true }), run(p.role ? `, ${p.role}` : "")], p.date));
      if (p.link) children.push(new Paragraph({ children: [run(p.link, { color: "555555" })] }));
      for (const b of p.bullets) {
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { before: 20 }, children: [run(b)] }));
      }
      children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }
  }

  if (r.skills.length) {
    children.push(heading("Skills"), new Paragraph({ children: [run(r.skills.join(", "))] }));
  }

  if (r.education.length) {
    children.push(heading("Education"));
    for (const e of r.education) {
      children.push(splitRow([run([e.degree, e.field].filter(Boolean).join(", "), { bold: true }), run(e.school ? `  ${e.school}` : "")], e.end));
    }
  }

  if (r.certifications.length) {
    children.push(heading("Certifications"), ...r.certifications.map((c) => new Paragraph({ children: [run(c)] })));
  }

  for (const sec of r.otherSections) {
    children.push(heading(sec.title), ...sec.items.map((item) => new Paragraph({ children: [run(item)] })));
  }

  const doc = new Document({
    creator: r.contact.name,
    title: `${r.contact.name} Resume`,
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
