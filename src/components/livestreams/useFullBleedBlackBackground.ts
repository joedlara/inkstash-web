import { useEffect } from 'react';

/**
 * Force <html> and <body> to a black background and lock the iOS Safari
 * theme-color meta tag to black while the calling page is mounted.
 *
 * Without this, the cream/light app background shows through the iOS
 * status-bar zone and the Safari URL-bar zone — those bars are *outside*
 * our React tree's rendered area, so any CSS on a child container can't
 * paint into them. Setting html/body backgrounds (and theme-color) is the
 * only way to tint them.
 *
 * Cleans up on unmount so other routes restore their normal palette.
 */
export function useFullBleedBlackBackground() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? null,
    };
    html.style.backgroundColor = '#000';
    body.style.backgroundColor = '#000';
    // Block rubber-band scrolling — otherwise dragging on the camera reveals
    // the body color behind the page and shows the bar bleed-through.
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';

    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#000000');

    return () => {
      html.style.backgroundColor = prev.htmlBg;
      body.style.backgroundColor = prev.bodyBg;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      if (meta) {
        if (prev.themeColor) meta.setAttribute('content', prev.themeColor);
        else meta.remove();
      }
    };
  }, []);
}
