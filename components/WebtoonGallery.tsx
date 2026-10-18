"use client";

import { useId, useMemo, useRef, useState, type CSSProperties } from "react";
import AssetImage from "@/components/AssetImage";
import CollectionSortButtons from "@/components/CollectionSortButtons";
import { FilterOptionButton, FilterSectionHeading } from "@/components/FilterControls";
import ListResultCount from "@/components/ListResultCount";
import SearchInput from "@/components/SearchInput";
import { matchesOptionalSelectedFilter, matchesSelectedFilter, toggleSelectedValue } from "@/lib/listFilters";
import { useBodyScrollLock } from "@/lib/useDialogEffects";
import { WEBTOON_COLLECTIONS, WEBTOON_LANGUAGES, type WebtoonEntry, type WebtoonPage } from "@/lib/webtoonTypes";
import styles from "./WebtoonGallery.module.css";

const collectionLabels = new Map(WEBTOON_COLLECTIONS.map(({ value, label }) => [value, label]));
const normalize = (value: string) => value.normalize("NFKC").trim().toLocaleLowerCase("ko-KR");
const languageLabels = new Map(WEBTOON_LANGUAGES.map(({ value, label }) => [value, label]));
const languageOrder = new Map(WEBTOON_LANGUAGES.map(({ value }, index) => [value, index]));

type FilterState = { languages: string[]; collections: string[]; authors: string[] };
const createEmptyFilters = (): FilterState => ({ languages: [], collections: [], authors: [] });

function WebtoonImage({ page, label = "", reader = false, client = false, originalSize = false, eager = false }: {
  page: WebtoonPage;
  label?: string;
  reader?: boolean;
  client?: boolean;
  originalSize?: boolean;
  eager?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const artworkStyle = {
    "--image-width": `${page.width}px`,
    "--image-ratio": page.width / page.height,
    aspectRatio: reader ? `${page.width} / ${page.height}` : "1024 / 520",
  } as CSSProperties;
  const clip = page.clipInsets;
  // SimpleSprite uses the original texture rect; pixels beyond it are atlas extrusion.
  const imageStyle: CSSProperties | undefined = clip ? {
    clipPath: `inset(${clip.top / page.height * 100}% ${clip.right / page.width * 100}% ${clip.bottom / page.height * 100}% ${clip.left / page.width * 100}%)`,
  } : undefined;

  return (
    <div
      className={`${styles.artwork} ${reader ? styles.readerArtwork : styles.thumbnailArtwork} ${reader && client ? styles.clientReaderArtwork : ""} ${originalSize ? styles.originalArtwork : ""}`}
      style={artworkStyle}
      aria-busy={status === "loading"}
    >
      <AssetImage
        key={attempt}
        src={page.imagePath}
        alt={reader ? label : ""}
        width={page.width}
        height={page.height}
        sizes={reader ? "100vw" : "(min-width: 768px) 50vw, 100vw"}
        loading={eager ? "eager" : "lazy"}
        className={`${styles.image} ${status !== "ready" ? styles.hiddenImage : ""}`}
        style={imageStyle}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        draggable={false}
      />
      {status !== "ready" ? (
        <div className={styles.imageStatus} role={reader ? (status === "error" ? "alert" : "status") : undefined}>
          <span>{status === "error" ? "이미지를 불러오지 못했습니다." : "이미지를 불러오는 중입니다."}</span>
          {reader && status === "error" ? (
            <button type="button" className={styles.button} onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}>다시 시도</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function WebtoonGallery({ entries }: { entries: WebtoonEntry[] }) {
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<FilterState>(createEmptyFilters);
  const [sortMode, setSortMode] = useState<"order" | "name">("order");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const filterTitleId = useId();
  const normalizedQuery = normalize(query);
  const availableSeries = useMemo(() => Array.from(new Set(entries
    .flatMap((entry) => entry.series ? [entry.series] : [])))
    .sort((first, second) => first.localeCompare(second, "ko-KR", { numeric: true })), [entries]);
  const filterSections: { key: keyof FilterState; title: string; options: { value: string; label: string }[] }[] = [
    { key: "languages", title: "언어", options: [...WEBTOON_LANGUAGES] },
    { key: "collections", title: "분류", options: [...WEBTOON_COLLECTIONS] },
    { key: "authors", title: "작가", options: availableSeries.map((value) => ({ value, label: value })) },
  ];
  const activeFilterCount = Object.values(selectedFilters).reduce((total, values) => total + values.length, 0);
  const filteredEntries = useMemo(() => entries
    .filter((entry) => matchesSelectedFilter(selectedFilters.collections, entry.collection)
      && matchesOptionalSelectedFilter(selectedFilters.authors, entry.series)
      && matchesSelectedFilter(selectedFilters.languages, entry.language)
      && normalize(entry.searchText).includes(normalizedQuery))
    .sort((first, second) => (sortMode === "name" ? first.title.localeCompare(second.title, "ko-KR", { numeric: true }) : 0)
      || first.order - second.order
      || (languageOrder.get(first.language) ?? 0) - (languageOrder.get(second.language) ?? 0)),
  [entries, selectedFilters, normalizedQuery, sortMode]);
  const selectedIndex = filteredEntries.findIndex((entry) => entry.id === selectedId);
  const selected = filteredEntries[selectedIndex];

  useBodyScrollLock(selectedId !== null || isFilterOpen);

  function toggleFilterValue(key: keyof FilterState, value: string) {
    setSelectedFilters((current) => ({
      ...current,
      [key]: toggleSelectedValue(current[key], value),
    }));
  }

  function moveSelection(offset: number) {
    const next = filteredEntries[selectedIndex + offset];
    if (!next) return;
    setSelectedId(next.id);
    stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "instant" });
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-3 rounded-md border border-[#343844] bg-[#171a21] p-4 lg:flex-row lg:items-end lg:justify-between" aria-label="웹툰 검색 및 분류">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-white">웹툰 검색</span>
            <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} ariaLabel="웹툰 검색" />
          </label>
          <div className="flex items-end gap-3 sm:shrink-0">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-40 sm:flex-none">
              <span className="text-sm font-bold text-white">조건 필터</span>
              <button
                ref={filterTriggerRef}
                type="button"
                aria-haspopup="dialog"
                onClick={() => { setIsFilterOpen(true); filterDialogRef.current?.showModal(); }}
                className="h-11 rounded-md border border-[#343844] bg-[#0b0d12] px-3 text-sm font-bold text-[#e5e7eb] transition hover:border-white hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/30"
              >필터{activeFilterCount > 0 ? ` ${activeFilterCount}개` : ""}</button>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 lg:justify-end">
          <CollectionSortButtons label="웹툰" value={sortMode} onChange={setSortMode} />
          <div aria-live="polite" aria-atomic="true">
            <ListResultCount label="웹툰" count={filteredEntries.length} total={entries.length} />
          </div>
        </div>
      </section>

      <dialog
        ref={filterDialogRef}
        className={styles.filterDialog}
        aria-labelledby={filterTitleId}
        onClose={() => { setIsFilterOpen(false); filterTriggerRef.current?.focus({ preventScroll: true }); }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#4b5563] pb-4">
          <h2 id={filterTitleId} className="text-center text-2xl font-black text-[#e5e7eb]">필터</h2>
          <button
            type="button"
            onClick={() => filterDialogRef.current?.close()}
            className="border border-[#4b5563] px-3 py-1 text-sm font-bold text-[#9ca3af] transition hover:border-[#9ca3af] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]"
          >닫기</button>
        </div>
        <div className="mt-5 space-y-5">
          {filterSections.filter((section) => section.options.length > 0).map((section) => (
            <section key={section.key} aria-label={`웹툰 ${section.title}`}>
              <FilterSectionHeading>{section.title}</FilterSectionHeading>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {section.options.map(({ value, label }) => (
                  <FilterOptionButton
                    key={value}
                    selected={selectedFilters[section.key].includes(value)}
                    onClick={() => toggleFilterValue(section.key, value)}
                  >{label}</FilterOptionButton>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-[#4b5563] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setSelectedFilters(createEmptyFilters())}
            className="min-h-12 min-w-28 border border-[#5b6270] bg-[#181b22] px-6 py-3 text-base font-black text-[#d1d5db] transition hover:border-[#9ca3af] hover:bg-[#222631] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]"
          >초기화</button>
          <button
            type="button"
            onClick={() => filterDialogRef.current?.close()}
            className="min-h-12 min-w-28 border border-[#6b7280] bg-[#2d333d] px-6 py-3 text-base font-black text-white transition hover:border-[#d1d5db] hover:bg-[#3f4754] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]"
          >확인</button>
        </div>
      </dialog>

      {filteredEntries.length ? (
        <ul className={styles.grid} aria-label="웹툰 목록">
          {filteredEntries.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                className={styles.card}
                aria-haspopup="dialog"
                aria-label={`${entry.title} · ${languageLabels.get(entry.language)} 보기`}
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setOriginalSize(false);
                  setSelectedId(entry.id);
                  dialogRef.current?.showModal();
                }}
              >
                <WebtoonImage page={entry} eager={index < 2} />
                <span className={styles.caption}>
                  <span>{entry.title}</span>
                  <span className={styles.badges}>
                    <span className={styles.badge}>{languageLabels.get(entry.language)}</span>
                    <span className={styles.badge}>{collectionLabels.get(entry.collection)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty} role="status">
          <p>검색 조건에 맞는 웹툰이 없습니다.</p>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setSelectedId(null);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          if (originalSize && event.target === stageRef.current) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveSelection(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <header className={styles.dialogHeader}>
          <div className={styles.dialogHeading}>
            <h2 id={titleId}>{selected?.title ?? "웹툰"}</h2>
            {selected ? <span className={styles.badge}>{languageLabels.get(selected.language)}</span> : null}
            {selected ? <span className={styles.badge}>{collectionLabels.get(selected.collection)}</span> : null}
          </div>
          <button type="button" className={styles.button} onClick={() => dialogRef.current?.close()}>닫기</button>
        </header>
        <div ref={stageRef} className={styles.stage} tabIndex={0} aria-label="웹툰 이미지">
          {selected ? (
            <div key={selected.id} className={styles.pages}>
              {selected.pages.map((page, index) => (
                <WebtoonImage
                  key={`${selected.id}:${index}`}
                  page={page}
                  label={selected.pages.length > 1 ? `${selected.title} ${index + 1}페이지` : selected.title}
                  reader
                  client={selected.collection === "client"}
                  originalSize={originalSize}
                  eager={index === 0}
                />
              ))}
            </div>
          ) : null}
        </div>
        <footer className={styles.dialogFooter}>
          <div className={styles.controls}>
            <div className={styles.pager} aria-label="웹툰 이동">
              <button type="button" className={styles.button} disabled={selectedIndex <= 0} onClick={() => moveSelection(-1)} aria-label="이전 웹툰">이전</button>
              <span aria-live="polite" aria-atomic="true">{selectedIndex + 1} / {filteredEntries.length}</span>
              <button type="button" className={styles.button} disabled={selectedIndex >= filteredEntries.length - 1} onClick={() => moveSelection(1)} aria-label="다음 웹툰">다음</button>
            </div>
            <button type="button" className={styles.button} aria-pressed={originalSize} onClick={() => {
              setOriginalSize((value) => !value);
              stageRef.current?.scrollTo({ left: 0, top: 0, behavior: "instant" });
            }}>{originalSize ? "화면에 맞추기" : "원본 크기"}</button>
          </div>
        </footer>
      </dialog>
    </>
  );
}
