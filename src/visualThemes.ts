export type VisualThemeId = "horizon" | "aurora" | "ledger" | "midnight";

export const VISUAL_THEMES: {
  id: VisualThemeId;
  label: string;
  blurb: string;
}[] = [
  {
    id: "horizon",
    label: "海天",
    blurb: "经典蓝调分层，干净稳重",
  },
  {
    id: "aurora",
    label: "极光",
    blurb: "青蓝霓虹渐变，偏现代海报",
  },
  {
    id: "ledger",
    label: "刊印",
    blurb: "暖纸色 + 藏青与金，杂志栏目感",
  },
  {
    id: "midnight",
    label: "星海",
    blurb: "深蓝近黑顶底栏，高对比正文区",
  },
];
