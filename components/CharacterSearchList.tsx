"use client";
import { useMemo, useState } from "react";
import Image from "@/components/DeploymentImage";
import UnitCollectionCard from "@/components/UnitCollectionCard";
import SearchInput from "@/components/SearchInput";
import CollectionSortButtons from "@/components/CollectionSortButtons";
import ListResultCount from "@/components/ListResultCount";
import CharacterAwakenCircuit from "@/components/CharacterAwakenCircuit";
import RarityIcon from "@/components/RarityIcon";
import { FilterOptionButton, FilterSectionHeading } from "@/components/FilterControls";
import { matchesOptionalSelectedFilter as matchesSelectedFilter, toggleSelectedValue } from "@/lib/listFilters";
export type CharacterCard = {
    id: string;
    href: string;
    name: string;
    title: string;
    teamup: string;
    grade: string;
    gradeColor: string;
    imagePath?: string;
    unitId?: number;
    displayIndex?: number;
    unitType?: string;
    growthType?: string;
    roleType?: string;
    moveType?: string;
    attackType?: string;
    sourceType?: string;
    cost?: number;
    isPlaceholder?: boolean;
};
type CharacterSearchListProps = {
    characters: CharacterCard[];
};
type FilterKey = "unitTypes" | "growthTypes" | "roleTypes" | "moveTypes" | "attackTypes" | "sourceTypes" | "grades" | "costs";
type FilterState = Record<FilterKey, string[]>;
type FilterSection = {
    key: FilterKey;
    title: string;
    options: string[];
    columns?: string;
};
function createEmptyFilters(): FilterState {
    return {
        unitTypes: [],
        growthTypes: [],
        roleTypes: [],
        moveTypes: [],
        attackTypes: [],
        sourceTypes: [],
        grades: [],
        costs: [],
    };
}
function getSearchText(character: CharacterCard) {
    const displayIndexText = character.displayIndex
        ? String(character.displayIndex)
        : "";
    const paddedDisplayIndexText = character.displayIndex
        ? String(character.displayIndex).padStart(3, "0")
        : "";
    return [
        character.name,
        character.title,
        character.grade,
        character.id,
        character.unitId ? String(character.unitId) : "",
        displayIndexText,
        paddedDisplayIndexText,
        paddedDisplayIndexText ? `ID. ${paddedDisplayIndexText}` : "",
    ]
        .join(" ")
        .toLowerCase();
}
const roleTypeIconMap: Record<string, string> = {
    스트라이커: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_STRIKER.png",
    레인저: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_RANGER.png",
    디펜더: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_DEFENDER.png",
    스나이퍼: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SNIPER.png",
    서포터: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SUPPORTER.png",
    시즈: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_SIEGE.png",
    타워: "/unit/unit_type/NKM_UI_COMMON_UNIT_CLASS_ICON_TOWER.png",
};
const unitTypeIconMap: Record<string, string> = {
    카운터: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_COUNTER.png",
    솔저: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_SOLDIER.png",
    메카닉: "/unit/unit_type/NKM_UI_COMMON_UNIT_TYPE_MECHANIC.png",
};
const moveTypeIconMap: Record<string, string> = {
    지상: "/unit/unit_type/UI_COMMON_UNIT_TYPE_LAND.png",
    공중: "/unit/unit_type/UI_COMMON_UNIT_TYPE_AIR.png",
};
const attackTypeIconMap: Record<string, string> = {
    지상: "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_LAND.png",
    공중: "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_AIR.png",
    모두: "/unit/unit_type/UI_COMMON_UNIT_ATTACK_TYPE_ALL.png",
};
const sourceTypeIconMap: Record<string, string> = {
    투쟁: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_CONFLICT.png",
    안정: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_STABLE.png",
    변화: "/unit/unit_type/NKM_UI_COMMON_WEAK_TAG_SYMBOL_LIBERAL.png",
};
function getRoleTypeIconPath(roleType?: string) {
    if (!roleType) {
        return "";
    }
    return roleTypeIconMap[roleType] ?? "";
}
function getUnitTypeIconPath(unitType?: string) {
    if (!unitType) {
        return "";
    }
    return unitTypeIconMap[unitType] ?? "";
}
function getFilterOptionIconPath(key: FilterKey, option: string) {
    if (key === "unitTypes") {
        return unitTypeIconMap[option] ?? "";
    }
    if (key === "roleTypes") {
        return roleTypeIconMap[option] ?? "";
    }
    if (key === "moveTypes") {
        return moveTypeIconMap[option] ?? "";
    }
    if (key === "attackTypes") {
        return attackTypeIconMap[option] ?? "";
    }
    if (key === "sourceTypes") {
        return sourceTypeIconMap[option] ?? "";
    }
    return "";
}
export default function CharacterSearchList({ characters, }: CharacterSearchListProps) {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [sortMode, setSortMode] = useState<"order" | "name">("order");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<FilterState>(() => createEmptyFilters());
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const costFilterOptions = useMemo(() => {
        const costs = characters
            .map((character) => typeof character.cost === "number" ? String(character.cost) : "")
            .filter(Boolean);
        return Array.from(new Set(costs)).sort((a, b) => Number(b) - Number(a));
    }, [characters]);
    const filterSections = useMemo<FilterSection[]>(() => {
        const sections: FilterSection[] = [
            {
                key: "unitTypes",
                title: "사원 타입",
                options: ["카운터", "솔저", "메카닉"],
            },
            {
                key: "growthTypes",
                title: "육성",
                options: ["각성", "재무장", "일반"],
                columns: "sm:grid-cols-3",
            },
            {
                key: "roleTypes",
                title: "클래스",
                options: [
                    "스트라이커",
                    "디펜더",
                    "레인저",
                    "스나이퍼",
                    "서포터",
                    "시즈",
                    "타워",
                ],
                columns: "sm:grid-cols-3",
            },
            {
                key: "moveTypes",
                title: "이동 타입",
                options: ["지상", "공중"],
            },
            {
                key: "attackTypes",
                title: "공격 타입",
                options: ["지상", "공중", "모두"],
                columns: "sm:grid-cols-3",
            },
            {
                key: "grades",
                title: "희귀도",
                options: ["SSR", "SR", "R", "N"],
                columns: "grid-cols-4",
            },
            {
                key: "costs",
                title: "코스트",
                options: costFilterOptions,
                columns: "grid-cols-4 sm:grid-cols-6",
            },
            {
                key: "sourceTypes",
                title: "근원성",
                options: ["투쟁", "안정", "변화"],
                columns: "sm:grid-cols-3",
            },
        ];
        return sections.filter((section) => section.options.length > 0);
    }, [costFilterOptions]);
    const activeFilterCount = Object.values(selectedFilters).reduce((total, values) => total + values.length, 0);
    const filteredCharacters = useMemo(() => {
        const filtered = characters.filter((character) => {
            const matchesKeyword = !normalizedKeyword ||
                getSearchText(character).includes(normalizedKeyword);
            const matchesUnitType = matchesSelectedFilter(selectedFilters.unitTypes, character.unitType);
            const matchesGrowthType = matchesSelectedFilter(selectedFilters.growthTypes, character.growthType);
            const matchesRoleType = matchesSelectedFilter(selectedFilters.roleTypes, character.roleType);
            const matchesMoveType = matchesSelectedFilter(selectedFilters.moveTypes, character.moveType);
            const matchesAttackType = matchesSelectedFilter(selectedFilters.attackTypes, character.attackType);
            const matchesSourceType = matchesSelectedFilter(selectedFilters.sourceTypes, character.sourceType);
            const matchesGrade = matchesSelectedFilter(selectedFilters.grades, character.grade);
            const matchesCost = matchesSelectedFilter(selectedFilters.costs, typeof character.cost === "number" ? String(character.cost) : "");
            return (matchesKeyword &&
                matchesUnitType &&
                matchesGrowthType &&
                matchesRoleType &&
                matchesMoveType &&
                matchesAttackType &&
                matchesSourceType &&
                matchesGrade &&
                matchesCost);
        });
        return sortMode === "name"
            ? filtered.sort((first, second) => first.name.localeCompare(second.name, "ko-KR"))
            : filtered;
    }, [characters, normalizedKeyword, selectedFilters, sortMode]);
    function toggleFilterValue(key: FilterKey, value: string) {
        setSelectedFilters((currentFilters) => {
            const currentValues = currentFilters[key];
            const nextValues = toggleSelectedValue(currentValues, value);
            return {
                ...currentFilters,
                [key]: nextValues,
            };
        });
    }
    function resetFilters() {
        setSelectedFilters(createEmptyFilters());
    }
    return (<>
      <div className="mt-8 flex flex-col gap-3 rounded-md border border-[#343844] bg-[#171a21] p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-white">사원 검색</span>
            <SearchInput value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} ariaLabel="사원 검색"/>
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
          <CollectionSortButtons label="사원" value={sortMode} onChange={setSortMode}/>
          <ListResultCount label="사원" count={filteredCharacters.length} total={characters.length}/>
        </div>
      </div>

      {isFilterOpen ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="character-filter-title">
          <div className="filter-scroll-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[#4b5563] bg-[linear-gradient(90deg,#151515_0%,#303030_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#4b5563] pb-4">
              <h2 id="character-filter-title" className="text-center text-2xl font-black text-[#e5e7eb]">
                필터
              </h2>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="border border-[#4b5563] px-3 py-1 text-sm font-bold text-[#9ca3af] transition hover:border-[#9ca3af] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {filterSections.map((section) => (<section key={section.key}>
                  <FilterSectionHeading>{section.title}</FilterSectionHeading>
                  <div className={`grid grid-cols-2 gap-2 ${section.columns ?? ""}`}>
                    {section.options.map((option) => {
                    const isSelected = selectedFilters[section.key].includes(option);
                    const optionIconPath = getFilterOptionIconPath(section.key, option);
                    return (<FilterOptionButton key={`${section.key}-${option}`} aria-label={section.key === "grades"
                            ? `${option} 희귀도`
                            : undefined} selected={isSelected} onClick={() => toggleFilterValue(section.key, option)}>
                          {section.key === "grades" ? (<span className="flex justify-center">
                              <RarityIcon grade={option} size="sm"/>
                            </span>) : optionIconPath ? (<span className="inline-flex items-center justify-center gap-2">
                              <Image src={optionIconPath} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain"/>
                              <span>{option}</span>
                            </span>) : (option)}
                        </FilterOptionButton>);
                })}
                  </div>
                </section>))}
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-[#4b5563] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetFilters} className="min-h-12 min-w-28 border border-[#5b6270] bg-[#181b22] px-6 py-3 text-base font-black text-[#d1d5db] transition hover:border-[#9ca3af] hover:bg-[#222631] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                초기화
              </button>
              <button type="button" onClick={() => setIsFilterOpen(false)} className="min-h-12 min-w-28 border border-[#6b7280] bg-[#2d333d] px-6 py-3 text-base font-black text-white transition hover:border-[#d1d5db] hover:bg-[#3f4754] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
                확인
              </button>
            </div>
          </div>
        </div>) : null}

      <style>{`
        .filter-scroll-panel {
          scrollbar-color: #6b7280 #151515;
          scrollbar-width: thin;
        }

        .filter-scroll-panel::-webkit-scrollbar {
          width: 12px;
        }

        .filter-scroll-panel::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }

        .filter-scroll-panel::-webkit-scrollbar-track {
          background: #151515;
          border-left: 1px solid #343844;
        }

        .filter-scroll-panel::-webkit-scrollbar-thumb {
          background: #4b5563;
          border: 3px solid #151515;
        }

        .filter-scroll-panel::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

      `}</style>

      {filteredCharacters.length > 0 ? (<div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredCharacters.map((character) => {
                const unitTypeIconPath = getUnitTypeIconPath(character.unitType);
                const roleTypeIconPath = getRoleTypeIconPath(character.roleType);
                return (<UnitCollectionCard key={character.id} href={character.href} name={character.name} title={character.title} grade={character.grade} gradeColor={character.gradeColor} imagePath={character.imagePath} artworkBackground={<CharacterAwakenCircuit grade={character.grade} isAwakened={character.growthType === "각성"}/>} footer={character.displayIndex ? (<div className="flex items-center justify-between text-[11px] text-[#9ca3af]">
                      <span className="flex items-center gap-2">
                        <span className="flex h-[24px] w-[24px] items-center justify-center">
                          {unitTypeIconPath ? (<Image src={unitTypeIconPath} alt="" width={24} height={24} className="h-6 w-6 shrink-0 object-contain"/>) : null}
                        </span>
                        <span className="flex h-[22px] w-[22px] items-center justify-center">
                          {roleTypeIconPath ? (<Image src={roleTypeIconPath} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain"/>) : null}
                        </span>
                        {character.growthType === "재무장" ? (<Image src="/unit/unit_type/NKM_UI_UNIT_SELECT_LIST_UNIT_REARM.png" alt="재무장" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain"/>) : null}
                      </span>
                      {character.displayIndex < 1000 ? (<span className="shrink-0 text-white">
                          #{character.displayIndex}
                        </span>) : null}
                    </div>) : null}/>);
            })}
        </div>) : (<div className="mt-8 rounded-lg border border-[#343844] bg-[#171a21] px-4 py-12 text-center text-sm font-semibold text-[#9ca3af]">
          검색 결과가 없습니다.
        </div>)}
    </>);
}
