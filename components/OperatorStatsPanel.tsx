"use client";
import { useState } from "react";
import DetailSection from "@/components/DetailSection";
import LevelControl from "@/components/LevelControl";
import type { OperatorStat } from "@/lib/operators";
import { parseIntegerInput } from "@/lib/rangeControls";
type OperatorStatsPanelProps = {
    stats: OperatorStat[];
    sectionNumber: number;
};
const minimumLevel = 1;
const maximumLevel = 100;
function getStatValue(stat: OperatorStat, level: number) {
    const internalValue = stat.baseValue + stat.perLevelValue * (level - minimumLevel);
    const percentValue = internalValue / 100;
    return `${percentValue.toLocaleString("ko-KR", {
        maximumFractionDigits: 2,
    })}%`;
}
export default function OperatorStatsPanel({ stats, sectionNumber, }: OperatorStatsPanelProps) {
    const [level, setLevel] = useState(maximumLevel);
    function changeLevel(value: string) {
        const nextLevel = parseIntegerInput(value, minimumLevel, maximumLevel);
        if (nextLevel === null) {
            return;
        }
        setLevel(nextLevel);
    }
    return (<DetailSection id="stats" title="작전 능력" number={sectionNumber}>
      <div className="mt-5 rounded-md border border-[#343844] bg-[#171a21] p-5">
        <LevelControl value={level} min={minimumLevel} max={maximumLevel} onChange={changeLevel} ariaLabel="작전 능력 기준 레벨" className="ml-auto"/>
        {stats.length > 0 ? (<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (<div key={stat.label} className="border border-[#343844] bg-[#0b0d12] p-3">
                <p className="text-xs font-bold text-[#9ca3af]">{stat.label}</p>
                <p className="mt-1 text-lg font-black text-white">
                  {getStatValue(stat, level)}
                </p>
              </div>))}
          </div>) : (<div className="mt-4 border border-[#343844] bg-[#0b0d12] px-4 py-8 text-center text-sm font-semibold text-[#9ca3af]">
            능력치 데이터가 없습니다.
          </div>)}
      </div>
    </DetailSection>);
}
