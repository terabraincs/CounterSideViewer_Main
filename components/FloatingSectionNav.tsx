"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import styles from "./FloatingSectionNav.module.css";
type Section = {
    id: string;
    title: string;
    number?: number | null;
};
export default function FloatingSectionNav({ sections, contentWidth = "standard", numbered = true, }: {
    sections: Section[];
    contentWidth?: "wide" | "standard";
    numbered?: boolean;
}) {
    const panelId = useId();
    const rootRef = useRef<HTMLElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [activeId, setActiveId] = useState("");
    const [headerHeight, setHeaderHeight] = useState(80);
    useEffect(() => {
        const root = rootRef.current;
        if (!root)
            return;
        function onWheel(event: WheelEvent) {
            // Keep browser zoom gestures; ordinary wheel input always scrolls the page.
            if (event.ctrlKey || event.defaultPrevented || !event.deltaY || !event.cancelable)
                return;
            const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                ? window.innerHeight
                : event.deltaMode === WheelEvent.DOM_DELTA_LINE
                    ? Number.parseFloat(window.getComputedStyle(root!).lineHeight) || 16
                    : 1;
            event.preventDefault();
            window.scrollBy({ top: event.deltaY * unit, behavior: "instant" });
        }
        // React wheel handlers are passive, so use a native listener to prevent
        // the scrollable table of contents from consuming the page's wheel input.
        root.addEventListener("wheel", onWheel, { passive: false });
        return () => root.removeEventListener("wheel", onWheel);
    }, [sections.length]);
    useEffect(() => {
        const header = document.querySelector("header");
        const targets = sections.flatMap(({ id }) => {
            const element = document.getElementById(id);
            return element ? [element] : [];
        });
        const originalMargins = targets.map((element) => element.style.scrollMarginTop);
        let frame = 0;
        function update() {
            frame = 0;
            const offset = Math.ceil(header?.getBoundingClientRect().height ?? 80);
            setHeaderHeight(offset);
            let current = "";
            for (const target of targets) {
                target.style.scrollMarginTop = `${offset + 16}px`;
                if (target.getBoundingClientRect().top <= offset + 24)
                    current = target.id;
            }
            if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
                current = targets.at(-1)?.id ?? current;
            }
            setActiveId(current);
        }
        function scheduleUpdate() {
            if (!frame)
                frame = window.requestAnimationFrame(update);
        }
        const observer = new ResizeObserver(scheduleUpdate);
        if (header)
            observer.observe(header);
        for (const target of targets)
            observer.observe(target);
        const article = rootRef.current?.parentElement?.querySelector("main article");
        if (article)
            observer.observe(article);
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        window.addEventListener("hashchange", scheduleUpdate);
        scheduleUpdate();
        return () => {
            window.cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            window.removeEventListener("hashchange", scheduleUpdate);
            targets.forEach((target, index) => {
                target.style.scrollMarginTop = originalMargins[index];
            });
        };
    }, [sections]);
    useEffect(() => {
        if (!open)
            return;
        function onPointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target))
                setOpen(false);
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
                toggleRef.current?.focus();
            }
        }
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);
    if (!sections.length)
        return null;
    return (<aside ref={rootRef} className={`${styles.root} ${styles[contentWidth]}`} style={{ "--toc-header-height": `${headerHeight}px` } as CSSProperties} aria-label="빠른 문단 이동">
      <button ref={toggleRef} type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <ListIcon />
        <span>목차</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 20 20" className={open ? styles.chevronOpen : undefined}>
          <path d="m5 12 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div id={panelId} className={styles.panel} data-open={open}>
        <div className={styles.heading}>
          <ListIcon />
          <span>목차</span>
        </div>
        <nav aria-label="고정 목차" className={styles.links}>
          {sections.map((section, index) => (<a key={section.id} href={deploymentUrl(`#${section.id}`)} className={styles.link} aria-current={activeId === section.id ? "location" : undefined} onClick={() => setOpen(false)}>
              {numbered && section.number !== null ? (<span className={styles.number}>{section.number ?? index + 1}.</span>) : null}
              <span>{section.title}</span>
            </a>))}
        </nav>
      </div>
    </aside>);
}
function ListIcon() {
    return (<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>
    </svg>);
}
