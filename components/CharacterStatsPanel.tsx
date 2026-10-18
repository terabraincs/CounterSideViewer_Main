"use client";
import { useState } from "react";
import LevelControl from "@/components/LevelControl";
import { getSliderMarkerPosition, parseIntegerInput } from "@/lib/rangeControls";
export type CharacterStat = {
    statKey: string;
    label: string;
    baseValue: number | null;
    perLevelValue: number;
};
type CharacterStatsPanelProps = {
    stats: CharacterStat[];
};
const minimumLevel = 1;
const defaultLevel = 100;
const maximumLimitBreakCount = 3;
const maximumLimitFusionStage = 10;
const defaultLimitBreakCount = 3;
const defaultLimitFusionStage = 5;
function getMaximumLevel(limitFusionStage: number) {
    return 100 + limitFusionStage * 2;
}
function getLimitGrowthMultiplier(limitBreakCount: number, limitFusionStage: number) {
    const firstFusionCount = Math.min(limitFusionStage, 5);
    const secondFusionCount = Math.max(limitFusionStage - 5, 0);
    return ((1 + limitBreakCount * 0.1) *
        (1 + firstFusionCount * 0.02) *
        (1 + secondFusionCount * 0.02));
}
function getConvertedPercent(statKey: string, value: number) {
    switch (statKey) {
        case "NST_DEF":
            return (value / (value + 1000)) * 100;
        case "NST_CRITICAL":
            return Math.min(value * 0.05, 85);
        case "NST_HIT":
            return (value / (value + 1500)) * 100;
        case "NST_EVADE":
            return (value / (value + 800)) * 100;
        default:
            return null;
    }
}
function formatStatValue(stat: CharacterStat, level: number, limitBreakCount: number, limitFusionStage: number) {
    if (stat.baseValue === null) {
        return "추가 예정";
    }
    const rawValue = (stat.baseValue + stat.perLevelValue * (level - 1)) *
        getLimitGrowthMultiplier(limitBreakCount, limitFusionStage);
    const displayValue = Math.round(rawValue).toLocaleString("ko-KR");
    const convertedPercent = getConvertedPercent(stat.statKey, rawValue);
    if (convertedPercent === null) {
        return displayValue;
    }
    const percentText = convertedPercent.toLocaleString("ko-KR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${displayValue} (${percentText}%)`;
}
export default function CharacterStatsPanel({ stats, }: CharacterStatsPanelProps) {
    const [level, setLevel] = useState(defaultLevel);
    const [isConditionOpen, setIsConditionOpen] = useState(false);
    const [limitBreakCount, setLimitBreakCount] = useState(defaultLimitBreakCount);
    const [limitFusionStage, setLimitFusionStage] = useState(defaultLimitFusionStage);
    const maximumLevel = getMaximumLevel(limitFusionStage);
    function changeLevel(value: string) {
        const nextLevel = parseIntegerInput(value, minimumLevel, maximumLevel);
        if (nextLevel === null) {
            return;
        }
        setLevel(nextLevel);
    }
    function changeLimitBreak(value: string) {
        const nextCount = Math.min(Math.max(Number(value), 0), maximumLimitBreakCount);
        setLimitBreakCount(nextCount);
        if (nextCount < maximumLimitBreakCount) {
            setLimitFusionStage(0);
            setLevel((currentLevel) => Math.min(currentLevel, 100));
        }
    }
    function changeLimitFusion(value: string) {
        const nextStage = Math.min(Math.max(Number(value), 0), maximumLimitFusionStage);
        setLimitFusionStage(nextStage);
        if (nextStage > 0) {
            setLimitBreakCount(maximumLimitBreakCount);
        }
        setLevel((currentLevel) => Math.min(currentLevel, getMaximumLevel(nextStage)));
    }
    function resetConditions() {
        setLevel(defaultLevel);
        setLimitBreakCount(defaultLimitBreakCount);
        setLimitFusionStage(defaultLimitFusionStage);
    }
    return (<div className="mt-4">
      {isConditionOpen ? (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="character-stat-condition-title">
          <div className="character-stat-condition-panel max-h-[90vh] w-full max-w-xl overflow-y-auto border border-[#4b5563] bg-[linear-gradient(90deg,#151515_0%,#303030_100%)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#4b5563] pb-4">
              <h3 id="character-stat-condition-title" className="text-2xl font-black text-[#e5e7eb]">
                능력치 조건
              </h3>
              <button type="button" onClick={() => setIsConditionOpen(false)} className="border border-[#4b5563] px-3 py-1 text-sm font-bold text-[#9ca3af] transition hover:border-[#9ca3af] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                닫기
              </button>
            </div>

            <div className="mt-5 space-y-6">
              <section>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h4 className="flex items-center gap-2 text-base font-black text-[#e5e7eb]">
                    <span className="h-4 w-[5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"/>
                    레벨
                  </h4>
                  <LevelControl value={level} min={minimumLevel} max={maximumLevel} onChange={changeLevel} ariaLabel="사원 능력치 기준 레벨" label="레벨" variant="character"/>
                </div>
                <div className="relative py-2">
                  <input type="range" min={minimumLevel} max={maximumLevel} value={level} onChange={(event) => changeLevel(event.target.value)} className="character-stat-slider block w-full" aria-label="사원 능력치 기준 레벨 슬라이더"/>
                  {maximumLevel > 100 ? (<div className="pointer-events-none absolute top-1/2 z-10 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-[#e5e7eb] shadow-[0_0_6px_rgba(229,231,235,0.65)]" style={{
                    left: getSliderMarkerPosition(100, minimumLevel, maximumLevel),
                }}/>) : null}
                </div>
                <div className="mt-2 flex justify-between text-xs font-bold text-[#9ca3af]">
                  <span>{minimumLevel}</span>
                  <span>{maximumLevel}</span>
                </div>
              </section>

              <section className="border-t border-[#4b5563] pt-5">
                <h4 className="mb-3 flex items-center gap-2 text-base font-black text-[#e5e7eb]">
                  <span className="h-4 w-[5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"/>
                  한계 조건
                </h4>
                <div className="grid border border-[#4b5563] bg-[#111318] sm:grid-cols-2">
                  <div className="border-b border-[#4b5563] p-4 sm:border-r sm:border-b-0">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="font-black text-[#d1d5db]">한계초월</span>
                      <label className="flex items-center gap-2 text-sm font-bold text-[#9ca3af]">
                        <input type="number" min={0} max={maximumLimitBreakCount} value={limitBreakCount} onChange={(event) => changeLimitBreak(event.target.value)} className="h-10 w-16 border border-[#4b5563] bg-[#181b22] px-2 text-center font-black text-white outline-none transition focus:border-[#9ca3af]" aria-label="한계초월 횟수"/>
                        회
                      </label>
                    </div>
                    <input type="range" min={0} max={maximumLimitBreakCount} step={1} value={limitBreakCount} onChange={(event) => changeLimitBreak(event.target.value)} className="character-stat-slider w-full" aria-label="한계초월 횟수 슬라이더"/>
                    <div className="mt-2 flex justify-between text-xs font-bold text-[#9ca3af]">
                      <span>0회</span>
                      <span>{maximumLimitBreakCount}회</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="font-black text-[#d1d5db]">한계융합</span>
                      <label className="flex items-center gap-2 text-sm font-bold text-[#9ca3af]">
                        <input type="number" min={0} max={maximumLimitFusionStage} value={limitFusionStage} onChange={(event) => changeLimitFusion(event.target.value)} className="h-10 w-16 border border-[#4b5563] bg-[#181b22] px-2 text-center font-black text-white outline-none transition focus:border-[#9ca3af]" aria-label="한계융합 단계"/>
                        단계
                      </label>
                    </div>
                    <div className="relative py-2">
                      <input type="range" min={0} max={maximumLimitFusionStage} step={1} value={limitFusionStage} onChange={(event) => changeLimitFusion(event.target.value)} className="character-stat-slider block w-full" aria-label="한계융합 단계 슬라이더"/>
                      <div className="pointer-events-none absolute top-1/2 z-10 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 bg-[#e5e7eb] shadow-[0_0_6px_rgba(229,231,235,0.65)]" style={{
                left: getSliderMarkerPosition(5, 0, maximumLimitFusionStage),
            }}/>
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-bold text-[#9ca3af]">
                      <span>0단계</span>
                      <span>{maximumLimitFusionStage}단계</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col gap-2 border-t border-[#4b5563] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetConditions} className="min-h-12 min-w-28 border border-[#5b6270] bg-[#181b22] px-6 py-3 text-base font-black text-[#d1d5db] transition hover:border-[#9ca3af] hover:bg-[#222631] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
                초기화
              </button>
              <button type="button" onClick={() => setIsConditionOpen(false)} className="min-h-12 min-w-28 border border-[#6b7280] bg-[#2d333d] px-6 py-3 text-base font-black text-white transition hover:border-[#d1d5db] hover:bg-[#3f4754] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
                확인
              </button>
            </div>
          </div>
        </div>) : null}

      <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="grid overflow-hidden border border-[#343844] bg-[#0b0d12]" style={{
            gridTemplateRows: `repeat(${stats.length}, minmax(40px, 1fr))`,
        }}>
          {stats.map((stat) => (<div key={stat.statKey} className="grid min-h-10 grid-cols-[35%_65%] border-b border-[#343844] last:border-b-0 sm:grid-cols-[24%_76%]">
              <div className="flex items-center whitespace-nowrap border-r border-[#343844] bg-[#222631] px-3 py-2 text-sm font-black text-[#d1d5db]">
                {stat.label}
              </div>
              <div className="flex items-center justify-end px-3 py-2 text-right text-sm font-black text-white">
                {formatStatValue(stat, level, limitBreakCount, limitFusionStage)}
              </div>
            </div>))}
        </div>

        <aside className="flex h-full flex-col justify-between border border-[#343844] bg-[#0b0d12] p-4">
          <div>
            <h4 className="text-lg font-black text-white">능력치 조건</h4>

            <dl className="mt-5 border-y border-[#343844] text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[#343844] py-3">
                <dt className="font-bold text-[#9ca3af]">레벨 기준</dt>
                <dd className="font-black text-white">{level}레벨</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[#343844] py-3">
                <dt className="font-bold text-[#9ca3af]">한계초월</dt>
                <dd className="font-black text-white">{limitBreakCount}회</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="font-bold text-[#9ca3af]">한계융합</dt>
                <dd className="font-black text-white">
                  {limitFusionStage}단계
                </dd>
              </div>
            </dl>
          </div>

          <button type="button" onClick={() => setIsConditionOpen(true)} className="mt-6 min-h-11 w-full border border-[#5b6270] bg-[#222631] px-5 py-2 text-sm font-black text-[#e5e7eb] transition hover:border-[#9ca3af] hover:bg-[#2d333d] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#6b7280]">
            조건 설정
          </button>
        </aside>
      </div>

      <style>{`
        .character-stat-slider {
          appearance: none;
          height: 8px;
          background: #343844;
          outline: none;
        }

        .character-stat-slider::-webkit-slider-thumb {
          appearance: none;
          box-sizing: border-box;
          width: 20px;
          height: 20px;
          border: 2px solid #9ca3af;
          background: #e5e7eb;
          cursor: pointer;
        }

        .character-stat-slider::-moz-range-thumb {
          box-sizing: border-box;
          width: 20px;
          height: 20px;
          border: 2px solid #9ca3af;
          border-radius: 0;
          background: #e5e7eb;
          cursor: pointer;
        }

        .character-stat-condition-panel {
          scrollbar-color: #6b7280 #151515;
          scrollbar-width: thin;
        }

        .character-stat-condition-panel::-webkit-scrollbar {
          width: 12px;
        }

        .character-stat-condition-panel::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }

        .character-stat-condition-panel::-webkit-scrollbar-track {
          border-left: 1px solid #343844;
          background: #151515;
        }

        .character-stat-condition-panel::-webkit-scrollbar-thumb {
          border: 3px solid #151515;
          background: #4b5563;
        }

        .character-stat-condition-panel::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>);
}
