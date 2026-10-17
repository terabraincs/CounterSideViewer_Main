"use client";

import { useBodyScrollLock } from "@/lib/useDialogEffects";

import { useId, useMemo, useRef, useState, type CSSProperties } from "react";
import AssetImage from "@/components/DeploymentImage";
import CollectionSortButtons from "@/components/CollectionSortButtons";
import ListResultCount from "@/components/ListResultCount";
import SearchInput from "@/components/SearchInput";
import { FilterOptionButton, FilterSectionHeading } from "@/components/FilterControls";
import { toggleSelectedValue } from "@/lib/listFilters";
import type { CutsceneImage, CutsceneStoryGroup } from "@/lib/cutscenes";
import { mainImageAssetUrl } from "@/lib/mainImageAssets";
import styles from "./CutsceneGallery.module.css";

const kindLabels = { background: "컷 이미지", image: "미니 이미지" };
const categoryLabels = { flashback: "플래시백 씬", background: "배경", other: "기타" };
const buttonClass = "inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-[#343844] bg-[#171a21] px-3 text-sm font-bold text-[#e5e7eb] transition hover:border-white hover:bg-[#222631] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default disabled:opacity-35 disabled:hover:border-[#343844] disabled:hover:bg-[#171a21]";

type FilterState = { categories: string[]; kinds: string[]; stories: string[] };

function getTileName(name: string) {
  return name.replace(/^(?:플래시백 씬|배경)\s*:\s*/u, "");
}

export default function CutsceneGallery({ images, storyGroups }: {
  images: CutsceneImage[];
  storyGroups: CutsceneStoryGroup[];
}) {
  const [keyword, setKeyword] = useState("");
  const [sortMode, setSortMode] = useState<"order" | "name">("order");
  const [selectedFilters, setSelectedFilters] = useState<FilterState>({ categories: [], kinds: [], stories: [] });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const filterTitleId = useId();
  const isOpen = selectedId !== null || isFilterOpen;
  const normalizedKeyword = keyword.trim().normalize("NFKC").toLocaleLowerCase("ko-KR");
  const filterSections: {
    key: keyof FilterState;
    title: string;
    groups: { title?: string; options: { value: string; label: string }[] }[];
  }[] = [
    { key: "categories", title: "분류", groups: [{ options: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })) }] },
    { key: "kinds", title: "종류", groups: [{ options: Object.entries(kindLabels).map(([value, label]) => ({ value, label })) }] },
    { key: "stories", title: "스토리", groups: storyGroups },
  ];
  const activeFilterCount = selectedFilters.categories.length + selectedFilters.kinds.length + selectedFilters.stories.length;
  const storyLabels = useMemo(() => new Map(storyGroups.flatMap((group) =>
    group.options.map((option) => [option.value, option.label]),
  )), [storyGroups]);
  const filteredImages = useMemo(() => {
    const filtered = images.filter((image) => {
      if (selectedFilters.categories.length && !selectedFilters.categories.includes(image.category)) return false;
      if (selectedFilters.kinds.length && !selectedFilters.kinds.includes(image.kind)) return false;
      if (selectedFilters.stories.length && !image.stories.some((name) => selectedFilters.stories.includes(name))) return false;
      return !normalizedKeyword || [image.name, image.id, ...image.stories, ...image.categories]
        .join(" ").normalize("NFKC").toLocaleLowerCase("ko-KR").includes(normalizedKeyword);
    });
    return sortMode === "name"
      ? filtered.sort((first, second) => first.name.localeCompare(second.name, "ko-KR"))
      : filtered;
  }, [images, selectedFilters, normalizedKeyword, sortMode]);
  const selectedIndex = filteredImages.findIndex((image) => image.id === selectedId);
  const selected = selectedIndex >= 0 ? filteredImages[selectedIndex] : null;

  useBodyScrollLock(isOpen);

  function moveSelection(offset: number) {
    const nextImage = filteredImages[selectedIndex + offset];
    if (nextImage) setSelectedId(nextImage.id);
  }

  function toggleFilterValue(key: keyof FilterState, value: string) {
    setSelectedFilters((current) => ({
      ...current,
      [key]: toggleSelectedValue(current[key], value),
    }));
  }

  function filterByStory(story: string) {
    setKeyword("");
    setSelectedFilters({ categories: [], kinds: [], stories: [story] });
    triggerRef.current = filterTriggerRef.current;
    dialogRef.current?.close();
  }

  return (
    <>
      <section className="mt-8 flex flex-col gap-3 rounded-md border border-[#343844] bg-[#171a21] p-4 lg:flex-row lg:items-end lg:justify-between" aria-label="일러스트 검색 및 필터">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-white">일러스트 검색</span>
            <SearchInput
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              ariaLabel="일러스트 검색"
            />
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
              >
                필터{activeFilterCount > 0 ? ` ${activeFilterCount}개` : ""}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 lg:justify-end">
          <CollectionSortButtons
            label="일러스트"
            value={sortMode}
            onChange={setSortMode}
          />
          <div aria-live="polite" aria-atomic="true">
            <ListResultCount label="일러스트" count={filteredImages.length} total={images.length} />
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
          {filterSections.map((section) => (
            <section key={section.key}>
              <FilterSectionHeading>{section.title}</FilterSectionHeading>
              <div className="space-y-4">
                {section.groups.map((group) => (
                  <div key={group.title ?? section.key} role={group.title ? "group" : undefined} aria-label={group.title}>
                    {group.title ? (
                      <h4 className="mb-2 border-b border-[#343844] pb-2 text-sm font-bold text-[#9ca3af]">{group.title}</h4>
                    ) : null}
                    <div className={`grid gap-2 ${section.key === "categories" ? "grid-cols-3" : "grid-cols-2"}`}>
                      {group.options.map((option) => {
                        const isSelected = selectedFilters[section.key].includes(option.value);
                        return (
                          <FilterOptionButton
                            key={option.value}
                            selected={isSelected}
                            onClick={() => toggleFilterValue(section.key, option.value)}
                          >{option.label}</FilterOptionButton>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-[#4b5563] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setSelectedFilters({ categories: [], kinds: [], stories: [] })}
            className="min-h-12 min-w-28 border border-[#5b6270] bg-[#181b22] px-6 py-3 text-base font-black text-[#d1d5db] transition hover:border-[#9ca3af] hover:bg-[#222631] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]"
          >초기화</button>
          <button
            type="button"
            onClick={() => filterDialogRef.current?.close()}
            className="min-h-12 min-w-28 border border-[#6b7280] bg-[#2d333d] px-6 py-3 text-base font-black text-white transition hover:border-[#d1d5db] hover:bg-[#3f4754] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]"
          >확인</button>
        </div>
      </dialog>

      {filteredImages.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4" data-testid="cutscene-grid">
          {filteredImages.map((image) => (
            <button
              key={image.id}
              type="button"
              className="group min-w-0 overflow-hidden rounded-md border border-[#343844] bg-[#171a21] text-left transition hover:border-white hover:bg-[#222631] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={`${getTileName(image.name)} 확대 보기`}
              aria-haspopup="dialog"
              data-image-id={image.id}
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setSelectedId(image.id);
                dialogRef.current?.showModal();
              }}
            >
              <div className="relative aspect-video overflow-hidden border-b border-[#343844] bg-[#171a21]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="relative"
                    style={{
                      width: `${Math.min(1, (image.displayWidth / image.displayHeight) / (16 / 9)) * 100}%`,
                      height: `${Math.min(1, (16 / 9) / (image.displayWidth / image.displayHeight)) * 100}%`,
                    }}
                  >
                    <AssetImage
                      src={image.thumbnailPath}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
                      className="object-fill"
                    />
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 sm:px-4">
                <h2 className="line-clamp-2 break-words text-base leading-6 font-bold text-white">{getTileName(image.name)}</h2>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-[#343844] bg-[#171a21] px-5 py-16 text-center text-sm font-bold text-[#9ca3af]">
          검색 조건에 맞는 일러스트가 없습니다.
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={() => {
          setSelectedId(null);
          triggerRef.current?.focus({ preventScroll: true });
          if (triggerRef.current === filterTriggerRef.current) {
            filterTriggerRef.current?.scrollIntoView({ block: "center" });
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            event.currentTarget.close();
          }
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveSelection(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <header className={styles.dialogHeader}>
          <h2 id={titleId} title={selected?.name} className="line-clamp-2 min-w-0 break-words text-base leading-6 font-bold text-white sm:text-lg sm:leading-6">{selected?.name ?? "일러스트"}</h2>
          <button type="button" className={buttonClass} aria-label="일러스트 닫기" onClick={() => dialogRef.current?.close()}>닫기</button>
        </header>
        {selected ? (
          <>
            <div className={styles.imageStage} style={{ "--cutscene-ratio": selected.displayWidth / selected.displayHeight } as CSSProperties}>
              <AssetImage
                key={selected.id}
                src={selected.imagePath}
                alt={selected.name}
                width={selected.width}
                height={selected.height}
                loading="eager"
                className={styles.fullImage}
              />
            </div>
            <div className={styles.dialogDetails}>
              <div className={styles.controls}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button type="button" className={buttonClass} disabled={selectedIndex <= 0} onClick={() => moveSelection(-1)} aria-label="이전 일러스트">이전</button>
                  <span className="min-w-16 text-center text-xs font-semibold text-[#d1d5db] tabular-nums sm:text-sm" aria-live="polite" aria-atomic="true">{selectedIndex + 1} / {filteredImages.length}</span>
                  <button type="button" className={buttonClass} disabled={selectedIndex >= filteredImages.length - 1} onClick={() => moveSelection(1)} aria-label="다음 일러스트">다음</button>
                </div>
                <a className={buttonClass} href={mainImageAssetUrl(selected.imagePath)} target="_blank" rel="noreferrer">원본 보기<span className="sr-only"> (새 탭)</span></a>
              </div>
              <div className={styles.tagRegion}>
                {selected.stories.length ? (
                  <ul key={selected.id} aria-label="등장 스토리" tabIndex={0} className={styles.storyTags}>
                    {selected.stories.map((story) => {
                      const label = storyLabels.get(story) ?? story;
                      return (
                        <li key={story} className="max-w-full min-w-0">
                          <button
                            type="button"
                            aria-label={`${label} 스토리로 필터링`}
                            title={`${story} 일러스트 보기`}
                            onClick={() => filterByStory(story)}
                            className={`${buttonClass} max-w-full py-2 text-left`}
                          >{label}</button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
