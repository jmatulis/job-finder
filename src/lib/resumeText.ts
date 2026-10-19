import mammoth from "mammoth";
// Import the library entry directly: pdf-parse's index.js runs a debug script when bundled.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractResumeText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return (await pdfParse(buf)).text.trim();
  }
  if (name.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: buf })).value.trim();
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return buf.toString("utf8").trim();
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
}
