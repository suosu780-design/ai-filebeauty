import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FONT_OPTIONS = [
  { label: "默认", value: "" },
  { label: "思源黑体", value: '"Noto Sans SC", sans-serif' },
  { label: "思源宋体", value: '"Noto Serif SC", serif' },
  { label: "Sora", value: '"Sora", "Noto Sans SC", sans-serif' },
  { label: "Outfit", value: '"Outfit", "Noto Sans SC", sans-serif' },
];

function applyInlineToRange(range: Range, styles: CSSStyleDeclarationPartial) {
  const span = document.createElement("span");
  if (styles.color) span.style.color = styles.color;
  if (styles.fontSize) span.style.fontSize = styles.fontSize;
  if (styles.fontFamily) span.style.fontFamily = styles.fontFamily;
  if (styles.fontWeight) span.style.fontWeight = styles.fontWeight;

  try {
    range.surroundContents(span);
  } catch {
    const extracted = range.extractContents();
    span.appendChild(extracted);
    range.insertNode(span);
  }
}

type CSSStyleDeclarationPartial = {
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
};

function isInsideHost(node: Node, host: HTMLElement): boolean {
  return host.contains(node.nodeType === Node.TEXT_NODE ? node.parentNode : node);
}

type Props = {
  host: HTMLElement;
  onBodyHtmlChange: (html: string) => void;
};

/**
 * 挂到 document.body，不参与导出截图。在 host 内选区非空时出现简易工具条。
 */
export default function BodySelectionToolbar({ host, onBodyHtmlChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const savedRangeRef = useRef<Range | null>(null);

  const [color, setColor] = useState("#0f172a");
  const [fontPx, setFontPx] = useState(17);
  const [fontStack, setFontStack] = useState("");
  const [bold, setBold] = useState(false);

  const refreshSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setOpen(false);
      savedRangeRef.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    const anchor = range.commonAncestorContainer;
    if (!isInsideHost(anchor, host)) {
      setOpen(false);
      savedRangeRef.current = null;
      return;
    }

    savedRangeRef.current = range.cloneRange();
    const rect = range.getBoundingClientRect();
    if (rect.width < 1 && rect.height < 1) {
      setOpen(false);
      return;
    }
    const pad = 8;
    const popW = 320;
    const popH = 52;
    let left = rect.left;
    let top = rect.bottom + 8;
    left = Math.max(pad, Math.min(left, window.innerWidth - popW - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - popH - pad));
    setPos({ top, left });
    setOpen(true);
  }, [host]);

  useEffect(() => {
    const onUp = () => requestAnimationFrame(refreshSelection);
    host.addEventListener("mouseup", onUp);
    host.addEventListener("keyup", onUp);
    return () => {
      host.removeEventListener("mouseup", onUp);
      host.removeEventListener("keyup", onUp);
    };
  }, [host, refreshSelection]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (host.contains(t)) return;
      const bar = document.getElementById("fb-body-style-popover");
      if (bar && bar.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [host]);

  const apply = () => {
    const range = savedRangeRef.current;
    if (!range || range.collapsed) {
      setOpen(false);
      return;
    }
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const r = sel?.getRangeAt(0);
    if (!r || r.collapsed) return;

    applyInlineToRange(r, {
      color,
      fontSize: `${fontPx}px`,
      ...(fontStack ? { fontFamily: fontStack } : {}),
      ...(bold ? { fontWeight: "700" } : {}),
    });

    onBodyHtmlChange(host.innerHTML);
    sel?.removeAllRanges();
    setOpen(false);
    savedRangeRef.current = null;
  };

  if (!open) return null;

  return createPortal(
    <div
      id="fb-body-style-popover"
      className="body-style-popover"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
      role="dialog"
      aria-label="划选文字样式"
    >
      <span className="body-style-popover-title">划选样式</span>
      <label className="body-style-field">
        色
        <input
          type="color"
          value={color.length === 7 ? color : "#0f172a"}
          onChange={(e) => setColor(e.target.value)}
        />
      </label>
      <label className="body-style-field">
        字号
        <input
          type="number"
          className="body-style-num"
          min={12}
          max={36}
          value={fontPx}
          onChange={(e) => setFontPx(Number(e.target.value) || 17)}
        />
        <span className="body-style-unit">px</span>
      </label>
      <label className="body-style-field body-style-field-grow">
        字体
        <select
          value={fontStack}
          onChange={(e) => setFontStack(e.target.value)}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="body-style-check">
        <input
          type="checkbox"
          checked={bold}
          onChange={(e) => setBold(e.target.checked)}
        />
        加粗
      </label>
      <button type="button" className="body-style-apply" onClick={apply}>
        应用
      </button>
    </div>,
    document.body,
  );
}
