"use client";

import { deploymentUrl } from "@/lib/deployment";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import GuidePageCanvas from "@/components/GuidePageCanvas";
import SearchInput from "@/components/SearchInput";
import type { GuideCategory, GuidePage } from "@/lib/guideTypes";
import styles from "./GuideViewer.module.css";

type PageResult = { key: string; page: GuidePage | null; failed: boolean };

function subscribeFullscreen(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

function fullscreenSnapshot() {
  if (!document.fullscreenEnabled) return "unavailable";
  return document.fullscreenElement?.hasAttribute("data-guide-viewer") ? "active" : "available";
}

const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");

export default function GuideViewer({ categories }: { categories: GuideCategory[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(categories[0]?.articles[0]?.id ?? "");
  const [position, setPosition] = useState({ articleId: selectedId, index: 0 });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<PageResult | null>(null);
  const [fullscreenError, setFullscreenError] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const fullscreen = useSyncExternalStore(subscribeFullscreen, fullscreenSnapshot, () => "unavailable");
  const normalizedQuery = normalize(query);

  const filteredCategories = useMemo(() => categories.map((category) => ({
    ...category,
    articles: normalize(category.title).includes(normalizedQuery)
      ? category.articles
      : category.articles.filter((article) => normalize(article.title).includes(normalizedQuery)),
  })).filter((category) => category.articles.length > 0), [categories, normalizedQuery]);
  const category = filteredCategories.find((item) => item.articles.some((article) => article.id === selectedId))
    ?? filteredCategories[0];
  const article = category?.articles.find((item) => item.id === selectedId) ?? category?.articles[0];
  const pageIndex = article && position.articleId === article.id
    ? Math.min(position.index, article.pageIds.length - 1)
    : 0;
  const pageId = article?.pageIds[pageIndex];
  const requestKey = `${pageId ?? ""}:${attempt}`;
  const page = result?.key === requestKey ? result.page : null;
  const failed = result?.key === requestKey && result.failed;

  useLayoutEffect(() => {
    const navigation = navigationRef.current;
    const selected = navigation?.querySelector<HTMLElement>('[aria-expanded="true"]');
    if (!navigation || !selected) return;
    const offset = selected.getBoundingClientRect().top - navigation.getBoundingClientRect().top;
    if (offset < 0 || offset + selected.offsetHeight > navigation.clientHeight) {
      navigation.scrollTop += offset - 8;
    }
  }, [category?.id, normalizedQuery]);

  useEffect(() => {
    if (!pageId) return;
    const controller = new AbortController();
    let active = true;
    void fetch(deploymentUrl(`/guide/pages/${encodeURIComponent(pageId)}.json`), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Guide page unavailable");
        const loaded = await response.json() as GuidePage;
        if (loaded.version !== 1 || loaded.id !== pageId || !loaded.root || !(loaded.width > 0) || !(loaded.height > 0)) {
          throw new Error("Invalid guide page");
        }
        if (active) setResult({ key: requestKey, page: loaded, failed: false });
      })
      .catch(() => {
        if (active && !controller.signal.aborted) setResult({ key: requestKey, page: null, failed: true });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [pageId, requestKey]);

  function selectArticle(id: string) {
    setSelectedId(id);
    setPosition({ articleId: id, index: 0 });
  }

  function movePage(offset: number) {
    if (!article) return;
    const next = pageIndex + offset;
    if (next >= 0 && next < article.pageIds.length) setPosition({ articleId: article.id, index: next });
  }

  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement === viewerRef.current) await document.exitFullscreen();
      else await viewerRef.current?.requestFullscreen();
    } catch {
      setFullscreenError(true);
    }
  }

  return (
    <div className={styles.container}>
      <section className={styles.searchBar} aria-label="가이드 검색">
        <label className={styles.searchLabel}>
          <span>가이드 검색</span>
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} ariaLabel="가이드 검색" />
        </label>
      </section>

      {article && category ? (
        <div className={styles.layout}>
          <nav ref={navigationRef} className={styles.sidebar} aria-label="가이드 목록">
            {filteredCategories.map((item) => (
              <div key={item.id} className={styles.categoryGroup}>
                <button
                  type="button"
                  className={styles.categoryButton}
                  aria-expanded={item.id === category.id}
                  aria-controls={`guide-category-${item.id}`}
                  onClick={() => selectArticle(item.articles[0].id)}
                >
                  <span>{item.title}</span><span aria-hidden="true">{item.id === category.id ? "−" : "+"}</span>
                </button>
                <ul id={`guide-category-${item.id}`} hidden={item.id !== category.id} className={styles.articleList}>
                  {item.articles.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={styles.articleButton}
                        aria-current={entry.id === article.id ? "page" : undefined}
                        onClick={() => selectArticle(entry.id)}
                      >{entry.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div
            ref={viewerRef}
            className={styles.viewer}
            data-guide-viewer=""
            role="region"
            aria-label="가이드 페이지"
            tabIndex={0}
            onKeyDown={(event) => {
              const target = event.target as HTMLElement;
              if (event.altKey || event.ctrlKey || event.metaKey || target.closest("input, textarea, select, [contenteditable='true']")) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                movePage(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            <header className={styles.viewerHeader}>
              <div className={styles.heading}>
                <p>{category.title}</p>
                <div className={styles.titleRow}>
                  <h2>{article.title}</h2>
                  {article.retired ? <span className={styles.retired}>이전 가이드</span> : null}
                </div>
              </div>
              {fullscreen !== "unavailable" ? (
                <button type="button" className={styles.button} onClick={() => void toggleFullscreen()}>
                  {fullscreen === "active" ? "전체 화면 닫기" : "전체 화면"}
                </button>
              ) : null}
            </header>
            {fullscreenError ? <p className={styles.fullscreenError} role="alert">전체 화면으로 전환하지 못했습니다. 다시 시도해 주세요.</p> : null}
            <div
              className={styles.stage}
              aria-busy={!page && !failed}
              onTouchStart={(event) => {
                touchStart.current = event.touches.length === 1
                  ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
                  : null;
              }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                touchStart.current = null;
                if (!start || event.changedTouches.length !== 1 || event.touches.length > 0) return;
                const dx = event.changedTouches[0].clientX - start.x;
                const dy = event.changedTouches[0].clientY - start.y;
                if (Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.5) movePage(dx < 0 ? 1 : -1);
              }}
              onTouchCancel={() => { touchStart.current = null; }}
            >
              {page ? <GuidePageCanvas page={page} label={`${article.title} ${pageIndex + 1}페이지`} /> : (
                <div className={styles.placeholder} role={failed ? "alert" : "status"}>
                  <p>{failed ? "가이드 페이지를 불러오지 못했습니다." : "가이드를 불러오는 중입니다."}</p>
                  {failed ? <button type="button" className={styles.button} onClick={() => setAttempt((value) => value + 1)}>다시 시도</button> : null}
                </div>
              )}
            </div>
            <footer className={styles.pager} aria-label="가이드 페이지 이동">
              <button type="button" className={styles.button} disabled={pageIndex <= 0} onClick={() => movePage(-1)} aria-label="이전 가이드 페이지">이전</button>
              <span aria-live="polite" aria-atomic="true">{pageIndex + 1} / {article.pageIds.length}</span>
              <button type="button" className={styles.button} disabled={pageIndex >= article.pageIds.length - 1} onClick={() => movePage(1)} aria-label="다음 가이드 페이지">다음</button>
            </footer>
          </div>
        </div>
      ) : (
        <div className={styles.empty} role="status">검색 조건에 맞는 가이드가 없습니다.</div>
      )}
    </div>
  );
}
