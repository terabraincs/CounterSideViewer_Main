"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useMemo, useState } from "react";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import SearchInput from "@/components/SearchInput";
import CollectionSortButtons from "@/components/CollectionSortButtons";
import ListResultCount from "@/components/ListResultCount";
import { FilterOptionButton, FilterSectionHeading } from "@/components/FilterControls";
import { matchesSelectedFilter as matchesFilter, toggleSelectedValue } from "@/lib/listFilters";
import type { EquipmentListItem } from "@/lib/equipment";
type EquipmentSearchListProps = {
    equipment: EquipmentListItem[];
};
type FilterKey = "positions" | "unitTypes" | "equipmentKinds";
type FilterState = Record<FilterKey, string[]>;
type FilterSection = {
    key: FilterKey;
    title: string;
    options: string[];
    columns?: string;
};
function createEmptyFilters(): FilterState {
    return {
        positions: [],
        unitTypes: [],
        equipmentKinds: [],
    };
}
function matchesEquipmentKinds(selectedValues: string[], item: EquipmentListItem) {
    return (selectedValues.length === 0 ||
        selectedValues.some((value) => value === "전용장비"
            ? item.isExclusive
            : item.equipmentKind === value));
}
function getSearchText(item: EquipmentListItem) {
    return [
        item.name,
        item.id,
        item.numericId,
        item.position,
        item.unitType,
        item.equipmentKind,
        item.isExclusive ? "전용장비" : "",
        item.mainStatLabel,
        ...item.privateUnitNames,
    ]
        .join(" ")
        .toLowerCase();
}
export default function EquipmentSearchList({ equipment, }: EquipmentSearchListProps) {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [sortMode, setSortMode] = useState<"order" | "name">("order");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<FilterState>(() => createEmptyFilters());
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const filterSections = useMemo<FilterSection[]>(() => {
        return [
            {
                key: "positions",
                title: "장착 부위",
                options: ["무기", "방어구", "보조장비"],
                columns: "sm:grid-cols-3",
            },
            {
                key: "unitTypes",
                title: "사원 타입",
                options: ["카운터", "솔저", "메카닉"],
                columns: "sm:grid-cols-3",
            },
            {
                key: "equipmentKinds",
                title: "장비 구분",
                options: ["렐릭 장비", "일반 장비", "전용장비"],
                columns: "sm:grid-cols-3",
            },
        ];
    }, []);
    const activeFilterCount = Object.values(selectedFilters).reduce((total, values) => total + values.length, 0);
    const filteredEquipment = useMemo(() => {
        const filtered = equipment.filter((item) => {
            const matchesKeyword = !normalizedKeyword || getSearchText(item).includes(normalizedKeyword);
            return (matchesKeyword &&
                matchesFilter(selectedFilters.positions, item.position) &&
                matchesFilter(selectedFilters.unitTypes, item.unitType) &&
                matchesEquipmentKinds(selectedFilters.equipmentKinds, item));
        });
        return sortMode === "name"
            ? filtered.sort((first, second) => first.name.localeCompare(second.name, "ko-KR"))
            : filtered;
    }, [equipment, normalizedKeyword, selectedFilters, sortMode]);
    function toggleFilterValue(key: FilterKey, value: string) {
        setSelectedFilters((currentFilters) => {
            const currentValues = currentFilters[key];
            return {
                ...currentFilters,
                [key]: toggleSelectedValue(currentValues, value),
            };
        });
    }
    function resetFilters() {
        setSelectedFilters(createEmptyFilters());
    }
    return (<div className="mt-8">
      <div className="flex flex-col gap-3 rounded-md border border-[#343844] bg-[#171a21] p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-white">장비 검색</span>
            <SearchInput value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} ariaLabel="장비 검색"/>
          </label>

          <div className="flex items-end gap-3 sm:shrink-0">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-40 sm:flex-none">
              <span className="text-sm font-bold text-white">조건 필터</span>
              <button type="button" onClick={() => setIsFilterOpen(true)} className="h-11 rounded-md border border-[#343844] bg-[#0b0d12] px-3 text-sm font-bold text-[#e5e7eb] transition hover:border-white hover:text-white focus:outline-none focus:ring-2 focus:ring-[#9ca3af]/30">
                필터{activeFilterCount > 0 ? ` ${activeFilterCount}개` : ""}
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 lg:justify-end">
          <CollectionSortButtons label="장비" value={sortMode} onChange={setSortMode}/>
          <ListResultCount label="장비" count={filteredEquipment.length} total={equipment.length}/>
        </div>
      </div>

      {isFilterOpen ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="equipment-filter-title">
          <div className="equipment-filter-scroll max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#4b5563] bg-[linear-gradient(90deg,#151515_0%,#303030_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#4b5563] pb-4">
              <h2 id="equipment-filter-title" className="text-2xl font-black text-[#e5e7eb]">
                필터
              </h2>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="border border-[#4b5563] px-3 py-1 text-sm font-bold text-[#9ca3af] transition hover:border-white hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {filterSections.map((section) => (<section key={section.key}>
                  <FilterSectionHeading>{section.title}</FilterSectionHeading>
                  <div className={`grid grid-cols-2 gap-2 ${section.columns ?? ""}`}>
                    {section.options.map((option) => {
                    const isSelected = selectedFilters[section.key].includes(option);
                    return (<FilterOptionButton key={`${section.key}-${option}`} selected={isSelected} onClick={() => toggleFilterValue(section.key, option)}>
                          {option}
                        </FilterOptionButton>);
                })}
                  </div>
                </section>))}
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-[#4b5563] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetFilters} className="min-h-12 min-w-28 border border-[#5b6270] bg-[#181b22] px-6 py-3 text-base font-black text-[#d1d5db] transition hover:border-white hover:bg-[#222631] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                초기화
              </button>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="min-h-12 min-w-28 border border-[#6b7280] bg-[#2d333d] px-6 py-3 text-base font-black text-white transition hover:border-white hover:bg-[#3f4754] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
                확인
              </button>
            </div>
          </div>
        </div>) : null}

      <style>{`
        .equipment-filter-scroll {
          scrollbar-color: #6b7280 #151515;
          scrollbar-width: thin;
        }

        .equipment-filter-scroll::-webkit-scrollbar {
          width: 12px;
        }

        .equipment-filter-scroll::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }

        .equipment-filter-scroll::-webkit-scrollbar-track {
          background: #151515;
          border-left: 1px solid #343844;
        }

        .equipment-filter-scroll::-webkit-scrollbar-thumb {
          background: #4b5563;
          border: 3px solid #151515;
        }

        .equipment-filter-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      {filteredEquipment.length > 0 ? (<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredEquipment.map((item) => (<Link key={item.id} href={deploymentUrl(item.href)} className="group overflow-hidden rounded-md border border-[#343844] bg-[#171a21] transition hover:-translate-y-1 hover:border-white hover:bg-[#1d2029] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#0f1117]">
                {item.backgroundImagePath ? (<Image src={deploymentUrl(item.backgroundImagePath)} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover"/>) : null}
                {item.imagePath ? (<Image src={deploymentUrl(item.imagePath)} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="z-10 object-contain p-3 transition duration-200 group-hover:scale-105"/>) : (<span className="relative z-10 text-xs font-bold tracking-[0.2em] text-[#565c6b]">
                    NO IMAGE
                  </span>)}
              </div>

              <div className="p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="border border-[#343844] bg-[#0b0d12] px-2 py-1 text-[#d1d5db]">
                    {item.position}
                  </span>
                  {item.equipmentKind === "렐릭 장비" ? (<span className="border border-[#6b7280] bg-[#222631] px-2 py-1 text-white">
                      렐릭 장비
                    </span>) : null}
                  {item.isExclusive ? (<span className="border border-[#6b7280] bg-[#222631] px-2 py-1 text-white">
                      전용장비
                    </span>) : null}
                  {item.privateUnitNames.map((unitName) => (<span key={unitName} className="border border-[#6b7280] bg-[#0b0d12] px-2 py-1 text-[#d1d5db]">
                      {unitName}
                    </span>))}
                </div>
                <h2 className="mt-3 line-clamp-2 min-h-12 text-base font-black leading-6 text-white">
                  {item.name}
                </h2>
                <p className="mt-2 truncate text-xs font-bold text-[#9ca3af]">
                  {item.unitType}
                </p>
              </div>
            </Link>))}
        </div>) : (<div className="mt-6 rounded-md border border-[#343844] bg-[#171a21] px-4 py-10 text-center text-sm font-semibold text-[#9ca3af]">
          검색 결과가 없습니다.
        </div>)}

    </div>);
}
