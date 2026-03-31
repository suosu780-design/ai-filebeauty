import { getFontEmbedCSS, toPng } from "html-to-image";

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(() => undefined);
}

/** 双帧等待布局与字体绘制稳定后再截屏 */
function nextFrames(n = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/**
 * 导出与屏幕预览一致的 PNG：嵌入字体、等待图片解码，避免 html-to-image 版式错乱。
 */
export async function exportCardToPng(el: HTMLElement): Promise<string> {
  await document.fonts.ready;
  await waitForImages(el);
  await nextFrames(2);

  let fontEmbedCSS: string | undefined;
  try {
    fontEmbedCSS = await getFontEmbedCSS(el);
  } catch {
    /* 部分环境 getFontEmbedCSS 可能失败，仍尝试导出 */
  }

  const w = Math.max(1, el.offsetWidth);
  const h = Math.max(1, el.offsetHeight);

  return toPng(el, {
    pixelRatio: 3,
    width: w,
    height: h,
    backgroundColor: "#ffffff",
    cacheBust: true,
    preferredFontFormat: "woff2",
    style: {
      margin: "0",
      marginLeft: "0",
      marginRight: "0",
      padding: "0",
      boxSizing: "border-box",
    },
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
  });
}
