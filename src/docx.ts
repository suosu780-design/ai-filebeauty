import mammoth from "mammoth";
import { preprocessDocxForCjkRunEmphasis } from "./docxCjkRunPreprocess";

const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='标题'] => h1:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='标题 2'] => h2:fresh",
];

export type ExtractedDoc = {
  title: string;
  byline: string;
  bodyHtml: string;
  tagsLine: string;
  sourcesLine: string;
};

function makeId(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `#${y}${m}${day}${rand}`;
}

/** Parse mammoth HTML: first h1/h2 or first p → title; next p → byline; rest → body. */
export function extractStructure(html: string): Omit<ExtractedDoc, never> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="fb-root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("fb-root");
  if (!root) {
    return {
      title: "",
      byline: "",
      bodyHtml: html,
      tagsLine: "",
      sourcesLine: "",
    };
  }

  const nodes = Array.from(root.children);
  let i = 0;
  let title = "";
  let byline = "";

  const first = nodes[0];
  if (first) {
    const tag = first.tagName.toUpperCase();
    const text = first.textContent?.trim() ?? "";
    if (tag === "H1" || tag === "H2") {
      title = text;
      i = 1;
    } else if (tag === "P" && text.length > 0 && text.length < 280) {
      title = text;
      i = 1;
    }
  }

  if (i > 0 && nodes[i]) {
    const second = nodes[i];
    if (second.tagName === "P") {
      const t = second.textContent?.trim() ?? "";
      if (t.length < 240) {
        byline = t;
        i += 1;
      }
    }
  }

  const rest = doc.createElement("div");
  for (; i < nodes.length; i++) {
    rest.appendChild(nodes[i].cloneNode(true));
  }

  let bodyHtml = rest.innerHTML;
  let tagsLine = "";
  let sourcesLine = "";

  const tail = extractTailMeta(rest.textContent ?? "");
  if (tail.tags) tagsLine = tail.tags;
  if (tail.sources) sourcesLine = tail.sources;

  return { title, byline, bodyHtml, tagsLine, sourcesLine };
}

/** Heuristic: lines starting with 标签 / 关键词 / 数据来源 */
function extractTailMeta(fullText: string): { tags: string; sources: string } {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let tags = "";
  let sources = "";
  for (const line of lines) {
    if (/^(标签|关键词)[:：]/.test(line)) {
      tags = line.replace(/^(标签|关键词)[:：]\s*/, "");
    }
    if (/^数据来源[:：]/.test(line)) {
      sources = line.replace(/^数据来源[:：]\s*/, "");
    }
  }
  return { tags, sources };
}

/** 若文内存在较宽或偏横版的插图，建议加宽版心 */
export async function suggestWideLayout(html: string): Promise<boolean> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="fb">${html}</div>`, "text/html");
  const root = doc.getElementById("fb");
  if (!root) return false;
  const imgs = root.querySelectorAll("img");
  const loads: Promise<void>[] = [];
  let maxW = 0;
  let maxRatio = 0;
  imgs.forEach((el) => {
    const src = el.getAttribute("src");
    if (!src) return;
    loads.push(
      new Promise((resolve) => {
        const i = new Image();
        i.onload = () => {
          maxW = Math.max(maxW, i.naturalWidth);
          const h = Math.max(i.naturalHeight, 1);
          maxRatio = Math.max(maxRatio, i.naturalWidth / h);
          resolve();
        };
        i.onerror = () => resolve();
        i.src = src;
      }),
    );
  });
  await Promise.all(loads);
  return maxW >= 1000 || maxRatio >= 1.2;
}

export async function convertDocx(
  arrayBuffer: ArrayBuffer,
): Promise<{ html: string; extracted: ExtractedDoc; reportId: string }> {
  let buffer = arrayBuffer;
  try {
    buffer = await preprocessDocxForCjkRunEmphasis(arrayBuffer);
  } catch {
    buffer = arrayBuffer;
  }
  const result = await mammoth.convertToHtml(
    { arrayBuffer: buffer },
    { styleMap: STYLE_MAP },
  );
  const html = result.value;
  const extracted = extractStructure(html);
  return {
    html,
    extracted,
    reportId: makeId(),
  };
}

export { makeId };
