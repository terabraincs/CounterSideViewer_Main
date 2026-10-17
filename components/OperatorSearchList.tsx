"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useMemo, useState } from "react";
import UnitCollectionCard from "@/components/UnitCollectionCard";
import SearchInput from "@/components/SearchInput";
import CollectionSortButtons from "@/components/CollectionSortButtons";
import ListResultCount from "@/components/ListResultCount";
import RarityIcon from "@/components/RarityIcon";
import type { OperatorListItem } from "@/lib/operators";
import { mainImageAssetUrl } from "@/lib/mainImageAssets";
type OperatorSearchListProps = {
    operators: OperatorListItem[];
};
function getSearchText(operator: OperatorListItem) {
    return [
        operator.name,
        operator.title,
        operator.grade,
        operator.skillName,
        operator.id,
    ]
        .join(" ")
        .toLowerCase();
}
export default function OperatorSearchList({ operators, }: OperatorSearchListProps) {
    const [searchKeyword, setSearchKeyword] = useState("");
    const [sortMode, setSortMode] = useState<"order" | "name">("order");
    const [selectedGrade, setSelectedGrade] = useState("");
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const gradeOptions = useMemo(() => {
        return ["SSR", "SR", "R", "N"].filter((grade) => operators.some((operator) => operator.grade === grade));
    }, [operators]);
    const filteredOperators = useMemo(() => {
        const filtered = operators.filter((operator) => {
            const matchesKeyword = !normalizedKeyword || getSearchText(operator).includes(normalizedKeyword);
            const matchesGrade = !selectedGrade || operator.grade === selectedGrade;
            return matchesKeyword && matchesGrade;
        });
        return sortMode === "name"
            ? filtered.sort((first, second) => first.name.localeCompare(second.name, "ko-KR"))
            : filtered;
    }, [normalizedKeyword, operators, selectedGrade, sortMode]);
    return (<div className="mt-8">
      <div className="flex flex-col gap-3 rounded-md border border-[#343844] bg-[#171a21] p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-sm font-bold text-white">오퍼레이터 검색</span>
            <SearchInput value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} ariaLabel="오퍼레이터 검색"/>
          </label>

          <div className="flex min-w-0 items-end gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-[260px] sm:flex-none">
              <span className="text-sm font-bold text-white">희귀도</span>
              <div className="grid grid-cols-4 gap-2">
                {gradeOptions.map((grade) => (<button key={grade} type="button" aria-label={`${grade} 희귀도`} aria-pressed={selectedGrade === grade} onClick={() => setSelectedGrade((currentGrade) => currentGrade === grade ? "" : grade)} className={`h-11 rounded-md border text-sm font-bold transition ${selectedGrade === grade
                ? "border-white bg-white text-[#111318]"
                : "border-[#343844] bg-[#0b0d12] text-[#9ca3af] hover:border-white hover:text-white"}`}>
                    <span className="flex justify-center">
                      <RarityIcon grade={grade} size="sm"/>
                    </span>
                  </button>))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 lg:justify-end">
          <CollectionSortButtons label="오퍼레이터" value={sortMode} onChange={setSortMode}/>
          <ListResultCount label="오퍼레이터" count={filteredOperators.length} total={operators.length}/>
        </div>
      </div>

      {filteredOperators.length > 0 ? (<div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredOperators.map((operator) => (<UnitCollectionCard key={operator.id} href={deploymentUrl(operator.href)} name={operator.name} title={operator.title} grade={operator.grade} gradeColor={operator.gradeColor} imagePath={mainImageAssetUrl(operator.imagePath)} footer={<div className="flex justify-end">
                  <RarityIcon grade={operator.grade} size="sm"/>
                </div>}/>))}
        </div>) : (<div className="mt-6 rounded-md border border-[#343844] bg-[#171a21] px-4 py-10 text-center text-sm font-semibold text-[#9ca3af]">
          검색 결과가 없습니다.
        </div>)}
    </div>);
}
