import JSZip from "jszip";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function shouldPatchWordMlPath(path: string): boolean {
  if (path === "word/document.xml") return true;
  if (path === "word/footnotes.xml") return true;
  if (path === "word/endnotes.xml") return true;
  if (path === "word/comments.xml") return true;
  if (path === "word/glossary/document.xml") return true;
  if (/^word\/header[0-9]+\.xml$/.test(path)) return true;
  if (/^word\/footer[0-9]+\.xml$/.test(path)) return true;
  return false;
}

/** Mammoth 只认 w:b / w:i；东亚版面常用 w:bCs / w:iCs（无对应「西文」元素时加粗/斜体会丢）。 */
function patchRPr(doc: Document, rPr: Element): boolean {
  let modified = false;

  const hasB = rPr.getElementsByTagNameNS(W_NS, "b").length > 0;
  const hasBCs = rPr.getElementsByTagNameNS(W_NS, "bCs").length > 0;
  if (hasBCs && !hasB) {
    rPr.insertBefore(doc.createElementNS(W_NS, "w:b"), rPr.firstChild);
    modified = true;
  }

  const hasI = rPr.getElementsByTagNameNS(W_NS, "i").length > 0;
  const hasICs = rPr.getElementsByTagNameNS(W_NS, "iCs").length > 0;
  if (hasICs && !hasI) {
    rPr.insertBefore(doc.createElementNS(W_NS, "w:i"), rPr.firstChild);
    modified = true;
  }

  return modified;
}

function patchWordMlXml(xml: string): string | null {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(xml, "application/xml");
  if (parsed.getElementsByTagName("parsererror").length > 0) {
    return null;
  }

  const rPrs = parsed.getElementsByTagNameNS(W_NS, "rPr");
  let modified = false;
  for (let i = 0; i < rPrs.length; i++) {
    if (patchRPr(parsed, rPrs[i]!)) modified = true;
  }
  if (!modified) return null;

  const declMatch = xml.match(/^<\?xml[^?]*\?>\s*/);
  const decl = declMatch ? declMatch[0] : "";
  const root = parsed.documentElement;
  if (!root) return null;
  const body = new XMLSerializer().serializeToString(root);
  return decl + body;
}

/**
 * 在交给 mammoth 之前修补 docx：为仅含 bCs/iCs 的 w:rPr 补上 w:b / w:i，
 * 使前台 HTML 与 Word/WPS 中加粗、斜体表现一致。
 */
export async function preprocessDocxForCjkRunEmphasis(
  arrayBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  let changed = false;

  const names = Object.keys(zip.files);
  for (const path of names) {
    const entry = zip.files[path];
    if (!entry || entry.dir || !shouldPatchWordMlPath(path)) continue;

    const text = await entry.async("string");
    const patched = patchWordMlXml(text);
    if (patched !== null && patched !== text) {
      zip.file(path, patched);
      changed = true;
    }
  }

  if (!changed) return arrayBuffer;
  const out = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
  });
  return out;
}
