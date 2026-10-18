import Image from "@/components/DeploymentImage";
import SkillCard from "@/components/SkillCard";
import SkillDescription from "@/components/SkillDescription";
import type { CharacterReactor } from "@/lib/characterReactors";
export default function CharacterReactorPanel({ reactor }: {
    reactor: CharacterReactor;
}) {
    return (<div className="mt-5 border border-[#343844] bg-[#171a21]">
      <article className="overflow-hidden">
        <div className="relative h-80 border-b border-[#343844] bg-[#111318] sm:h-[440px] lg:h-[520px]">
          <Image src={reactor.illustrationPath} alt={`${reactor.name} 일러스트`} fill sizes="(min-width: 1280px) 1216px, 100vw" className="object-contain p-5 sm:p-6"/>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <h3 className="text-xl font-black text-[#e5e7eb]">{reactor.name}</h3>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#c4c8d0]">
            {reactor.description}
          </p>
        </div>
      </article>

      <details className="border-t border-[#343844]">
        <summary className="cursor-pointer bg-[#222631] px-4 py-3 text-sm font-black text-[#e5e7eb] transition hover:bg-[#2a2f3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          강화 효과
        </summary>
        <div className="grid [&>article]:border-x-0 [&>article]:border-b-0">
          {reactor.levels.map((level) => (<SkillCard key={level.id} icon={level.skillIconPath ? (<Image src={level.skillIconPath} alt={`${level.title} 아이콘`} width={88} height={88} className="h-[88px] w-[88px] object-contain"/>) : null}>
              <div className="flex items-start gap-4">
                <div role="img" aria-label={`리액터 ${level.level}단계`} title={`리액터 ${level.level}단계`} className="flex w-[49px] shrink-0 flex-col items-center gap-[15.1px]">
                  <Image src={`/character/reactors/levels/AB_UI_REACTOR_LEVEL_${level.level}.png`} alt="" width={49} height={19} className="h-[19px] w-[49px] object-contain"/>
                  <Image src={`/character/reactors/levels/AB_UI_REACTOR_LEVEL_${level.level}_TEXT.png`} alt="" width={48} height={69} className="h-[69px] w-12 object-contain"/>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-[#e5e7eb]">{level.title}</h4>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#c4c8d0]">
                    <SkillDescription id={`reactor-${reactor.id}-${level.level}`} text={level.description}/>
                  </p>
                </div>
              </div>
            </SkillCard>))}
        </div>
      </details>
    </div>);
}
