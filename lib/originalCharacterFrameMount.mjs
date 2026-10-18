// Keep the browsing context in one DOM parent until original Unity shutdown ends.
// Moving an iframe with appendChild reloads its document, even within one document.
export function mountOriginalCharacterFrame(anchor, {src, title = '원본 사원 전투 화면'}) {
  const document = anchor.ownerDocument, hostWindow = document.defaultView;
  if (!hostWindow || !anchor.isConnected) throw new Error('A connected viewer anchor is required');
  const frame = document.createElement('iframe');
  frame.title = title; frame.allow = 'autoplay; fullscreen'; frame.src = src;
  frame.style.cssText = 'position:absolute;border:0;display:block;z-index:10';
  let parked = false, removed = false, task = 0, last = '';
  function position() {
    if (parked || removed) return;
    if (anchor.isConnected) {
      const rect = anchor.getBoundingClientRect();
      const values = [rect.left + hostWindow.scrollX, rect.top + hostWindow.scrollY, rect.width, rect.height];
      const key = values.join(':');
      if (key !== last) {
        [frame.style.left, frame.style.top, frame.style.width, frame.style.height] = values.map(value => `${value}px`);
        last = key;
      }
    }
    task = hostWindow.requestAnimationFrame(position);
  }
  position(); document.body.append(frame);
  return {
    frame,
    park() {
      if (parked || removed) return;
      parked = true; hostWindow.cancelAnimationFrame(task);
      frame.style.left = '-20000px'; frame.style.top = '0';
      frame.style.pointerEvents = 'none'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
      // Do not reparent or use display:none: preserve the original document and its
      // frame loop while the original owner drains loading and cleanup requests.
    },
    remove() {
      if (removed) return;
      removed = true; hostWindow.cancelAnimationFrame(task); frame.remove();
    },
  };
}
