import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import ReportCard from "./ReportCard";
import { exportCardToPng } from "./exportImage";
import { convertDocx, makeId, suggestWideLayout } from "./docx";
import { VISUAL_THEMES, type VisualThemeId } from "./visualThemes";
import "./App.css";

/** 版心像素范围：越窄纵向越长（细长），越宽画布越横阔 */
const WIDTH_MIN = 420;
const WIDTH_MAX = 2400;
const WIDTH_STEP = 10;

const WIDTH_QUICK = [
  { label: "细长", value: 560 },
  { label: "竖屏", value: 720 },
  { label: "标准", value: 1080 },
  { label: "宽", value: 1440 },
  { label: "超宽", value: 1920 },
  { label: "横屏", value: 2160 },
] as const;

function clampCardWidth(px: number): number {
  const n = Math.round(px / WIDTH_STEP) * WIDTH_STEP;
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, n));
}

/** 顶栏主标题字号（rem），与 ReportCard 中 --typo-title-size 对应 */
const TITLE_REM_MIN = 1.1;
const TITLE_REM_MAX = 2.85;
const TITLE_REM_STEP = 0.05;

function clampTitleRem(n: number): number {
  const s = Math.round(n / TITLE_REM_STEP) * TITLE_REM_STEP;
  return Math.min(TITLE_REM_MAX, Math.max(TITLE_REM_MIN, Math.round(s * 100) / 100));
}

const TITLE_REM_QUICK = [
  { label: "标准", value: 1.68 },
  { label: "偏大", value: 1.95 },
  { label: "大", value: 2.2 },
  { label: "特大", value: 2.5 },
] as const;

const DEFAULT_TAGLINE = "研习要点 · 专业解读";

export default function App() {
  const exportRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState("上传 Word 后自动生成标题");
  const [byline, setByline] = useState("编辑 | " + new Date().toISOString().slice(0, 10));
  const [bodyHtml, setBodyHtml] = useState(
    "<p>请上传 <strong>.docx</strong> 文件。支持图文混排；版心宽度可自选，宽图可尝试 1440 / 1920。</p>",
  );
  const [tagsLine, setTagsLine] = useState("");
  const [sourcesLine, setSourcesLine] = useState("");
  const [reportId, setReportId] = useState(() => makeId());

  const [topLeftLabel, setTopLeftLabel] = useState("报告解读");
  const [footerName, setFooterName] = useState("科技委");
  const [footerSub, setFooterSub] = useState("报告解读");
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);
  const [cardMaxWidthPx, setCardMaxWidthPx] = useState<number>(1080);
  const [titleFontRem, setTitleFontRem] = useState(1.68);
  const [visualTheme, setVisualTheme] = useState<VisualThemeId>("horizon");

  const onFile = useCallback(async (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".docx")) {
      setStatus("请选择 .docx 文件");
      return;
    }
    setBusy(true);
    setStatus("正在解析…");
    try {
      const buf = await f.arrayBuffer();
      const { extracted, reportId: rid } = await convertDocx(buf);
      setTitle(extracted.title || f.name.replace(/\.docx$/i, ""));
      setByline(extracted.byline || "");
      setBodyHtml(extracted.bodyHtml || "<p></p>");
      setTagsLine(extracted.tagsLine);
      setSourcesLine(extracted.sourcesLine);
      setReportId(rid);

      const wide = await suggestWideLayout(extracted.bodyHtml);
      if (wide) {
        setCardMaxWidthPx(clampCardWidth(1440));
        setStatus("已载入。检测到较宽插图，已将版心设为 1440px（可用滑块自由调整）。");
      } else {
        setCardMaxWidthPx(clampCardWidth(1080));
        setStatus("已载入。");
      }
    } catch (e) {
      console.error(e);
      setStatus("解析失败，请检查文件是否为有效 Word 文档。");
    } finally {
      setBusy(false);
    }
  }, []);

  const exportPng = useCallback(async () => {
    const el = exportRef.current;
    if (!el) return;
    setBusy(true);
    setStatus("正在生成高清 PNG…");
    try {
      const dataUrl = await exportCardToPng(el);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `科技委-报告解读-${Date.now()}.png`;
      a.click();
      setStatus("已下载 PNG（约 3× 像素密度）。");
    } catch (e) {
      console.error(e);
      setStatus("导出失败，可尝试缩小版心宽度后重试。");
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-toolbar">
        <div className="app-toolbar-inner">
          <div className="app-brand">
            <h1>科技委 · 报告解读</h1>
            <p>
              Word 转长图：版心宽度调比例；正文里划词即可改样式，无需在上方找一堆表单项。
            </p>
          </div>
          <div className="app-toolbar-actions">
            <label className="file-btn">
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={busy}
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
              上传 Word
            </label>
            <button
              type="button"
              className="export-btn"
              disabled={busy}
              onClick={() => void exportPng()}
            >
              导出高清 PNG
            </button>
            <div className="field field-compact">
              <span>顶栏左侧</span>
              <input
                type="text"
                value={topLeftLabel}
                onChange={(e) => setTopLeftLabel(e.target.value)}
                placeholder="报告解读"
              />
            </div>
          </div>

          <div className="width-scale-panel">
            <div className="width-scale-head">
              <span className="width-scale-title">版心宽度 · 比例</span>
              <span className="width-scale-hint">
                拖动调节：更窄 → 正文折行多、整图更「细长」；更宽 → 一横排更舒展
              </span>
            </div>
            <div className="width-scale-row">
              <input
                className="width-range"
                type="range"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={cardMaxWidthPx}
                onChange={(e) =>
                  setCardMaxWidthPx(clampCardWidth(Number(e.target.value)))
                }
                aria-label="版心宽度"
              />
              <div className="width-number-wrap">
                <input
                  className="width-number"
                  type="number"
                  min={WIDTH_MIN}
                  max={WIDTH_MAX}
                  step={WIDTH_STEP}
                  value={cardMaxWidthPx}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      setCardMaxWidthPx(clampCardWidth(v));
                    }
                  }}
                  aria-label="版心宽度像素"
                />
                <span className="width-unit">px</span>
              </div>
            </div>
            <div className="width-quick-row" role="group" aria-label="快捷宽度">
              {WIDTH_QUICK.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className={`width-quick-btn ${cardMaxWidthPx === q.value ? "is-active" : ""}`}
                  onClick={() => setCardMaxWidthPx(q.value)}
                >
                  {q.label}
                  <small>{q.value}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="theme-picker" role="group" aria-label="长图风格">
            <span className="theme-picker-label">长图风格</span>
            {VISUAL_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-chip ${visualTheme === t.id ? "is-active" : ""}`}
                aria-pressed={visualTheme === t.id}
                onClick={() => setVisualTheme(t.id)}
              >
                {t.label}
                <small>{t.blurb}</small>
              </button>
            ))}
          </div>

          {status ? <span className="app-status">{status}</span> : null}
          <p className="app-hint">
            导出 3× PNG。在下方预览「正文」里拖选一段话 → 旁侧弹出小条，设颜色、字号、字体、加粗后点「应用」。
          </p>
        </div>
      </header>

      <section className="app-fields-panel">
        <label>
          标题
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="app-field-title-size">
          标题字号（预览顶栏）
          <div className="title-size-controls">
            <input
              className="title-size-range"
              type="range"
              min={TITLE_REM_MIN}
              max={TITLE_REM_MAX}
              step={TITLE_REM_STEP}
              value={titleFontRem}
              onChange={(e) =>
                setTitleFontRem(clampTitleRem(Number(e.target.value)))
              }
              aria-label="标题字号"
            />
            <input
              className="title-size-number"
              type="number"
              min={TITLE_REM_MIN}
              max={TITLE_REM_MAX}
              step={TITLE_REM_STEP}
              value={titleFontRem}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setTitleFontRem(clampTitleRem(v));
              }}
              aria-label="标题字号数值"
            />
            <span className="title-size-unit">rem</span>
          </div>
          <div className="title-size-quick" role="group" aria-label="标题字号快捷">
            {TITLE_REM_QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                className={`width-quick-btn title-size-quick-btn ${titleFontRem === q.value ? "is-active" : ""}`}
                onClick={() => setTitleFontRem(q.value)}
              >
                {q.label}
                <small>{q.value}</small>
              </button>
            ))}
          </div>
        </label>
        <label>
          署名 / 日期
          <input value={byline} onChange={(e) => setByline(e.target.value)} />
        </label>
        <label>
          标签行（可选）
          <input
            value={tagsLine}
            onChange={(e) => setTagsLine(e.target.value)}
            placeholder="多个关键词空格分隔"
          />
        </label>
        <label>
          数据来源（可选）
          <input
            value={sourcesLine}
            onChange={(e) => setSourcesLine(e.target.value)}
          />
        </label>
        <label>
          底栏左 — 名称
          <input value={footerName} onChange={(e) => setFooterName(e.target.value)} />
        </label>
        <label>
          底栏左 — 副标题
          <input value={footerSub} onChange={(e) => setFooterSub(e.target.value)} />
        </label>
        <label style={{ gridColumn: "span 2" }}>
          最底标语
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </label>
      </section>

      <div className="app-preview-wrap">
        <div className="app-preview-inner">
          {/* 导出根节点：无 margin，宽度即版心；避免 report-shell 的 auto margin 在 foreignObject 内溢出产生左侧白条 */}
          <div
            ref={exportRef}
            className="export-capture-root"
            style={
              {
                "--export-w": `${cardMaxWidthPx}px`,
                "--typo-title-size": `${titleFontRem}rem`,
              } as CSSProperties & {
                "--export-w": string;
                "--typo-title-size": string;
              }
            }
          >
            <ReportCard
              topLeftLabel={topLeftLabel}
              reportId={reportId}
              title={title}
              byline={byline}
              bodyHtml={bodyHtml}
              tagsLine={tagsLine}
              sourcesLine={sourcesLine}
              footerName={footerName}
              footerSub={footerSub}
              tagline={tagline}
              cardMaxWidthPx={cardMaxWidthPx}
              qrSrc="/qr-footer.png"
              layoutVariant="embedded"
              visualTheme={visualTheme}
              onBodyHtmlChange={setBodyHtml}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
