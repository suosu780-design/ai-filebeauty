import {
  forwardRef,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type Ref,
} from "react";
import type { VisualThemeId } from "./visualThemes";
import BodySelectionToolbar from "./BodySelectionToolbar";
import "./ReportCard.css";

export const SIGNATURE = "科技委 | 报告解读";

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value as T);
  else (ref as MutableRefObject<T | null>).current = value as T | null;
}

export type ReportCardProps = {
  topLeftLabel: string;
  reportId: string;
  title: string;
  byline: string;
  bodyHtml: string;
  tagsLine: string;
  sourcesLine: string;
  footerName: string;
  footerSub: string;
  tagline: string;
  cardMaxWidthPx: number;
  qrSrc: string;
  layoutVariant?: "default" | "embedded";
  visualTheme?: VisualThemeId;
  /** 传入后即可在正文划词并在弹出条中改样式（写回 HTML） */
  onBodyHtmlChange?: (html: string) => void;
};

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ReportCard = forwardRef<HTMLDivElement, ReportCardProps>(function ReportCard(
  {
    topLeftLabel,
    reportId,
    title,
    byline,
    bodyHtml,
    tagsLine,
    sourcesLine,
    footerName,
    footerSub,
    tagline,
    cardMaxWidthPx,
    qrSrc,
    layoutVariant = "default",
    visualTheme = "horizon",
    onBodyHtmlChange,
  },
  ref,
) {
  const [bodyHost, setBodyHost] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!bodyHost) return;
    if (bodyHost.innerHTML !== bodyHtml) {
      bodyHost.innerHTML = bodyHtml;
    }
  }, [bodyHtml, bodyHost]);

  const shellClass = [
    "report-shell",
    layoutVariant === "embedded" ? "report-shell--embedded" : "",
    `theme-${visualTheme}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        ref={(node) => assignRef(ref, node)}
        className={shellClass}
        style={
          { "--card-max": `${cardMaxWidthPx}px` } as CSSProperties & {
            "--card-max": string;
          }
        }
      >
        <header className="report-top-gradient">
          <div className="report-top-bar">
            {topLeftLabel.trim() ? (
              <span className="report-top-tag">{topLeftLabel}</span>
            ) : (
              <span className="report-top-tag-spacer" aria-hidden />
            )}
            <span className="report-top-id">{reportId}</span>
          </div>
          {title ? (
            <h1 className="report-title report-title--hero">{title}</h1>
          ) : null}
          {byline ? (
            <p className="report-byline report-byline--hero">{byline}</p>
          ) : null}
        </header>

        <div className="report-inner">
          <div
            ref={setBodyHost}
            className="report-body report-body--selectable"
          />

          {tagsLine ? (
            <div className="report-tags-block">
              <div className="report-tags">{tagsLine}</div>
            </div>
          ) : null}

          {sourcesLine ? (
            <div className="report-sources">
              <strong>数据来源 </strong>
              <span className="src-link">{sourcesLine}</span>
            </div>
          ) : null}

          <div className="report-mid-brand">{SIGNATURE}</div>
        </div>

        <footer className="report-footer-band">
          <div className="report-footer-left">
            <div className="report-footer-badge">
              <PlayGlyph />
            </div>
            <div className="report-footer-lines">
              <span className="name">{footerName}</span>
              <span className="sub">{footerSub}</span>
            </div>
          </div>
          <img className="report-qr" src={qrSrc} alt="二维码" width={96} height={96} />
        </footer>

        <div className="report-bottom-strip">{tagline}</div>
      </div>

      {bodyHost && onBodyHtmlChange ? (
        <BodySelectionToolbar
          host={bodyHost}
          onBodyHtmlChange={onBodyHtmlChange}
        />
      ) : null}
    </>
  );
});

export default ReportCard;
