import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import CharacterAwakenCircuit from "@/components/CharacterAwakenCircuit";
import DetailSection from "@/components/DetailSection";
import RarityIcon from "@/components/RarityIcon";
import type { CharacterTeamup as Teamup } from "@/lib/characterTeamups";
export default function CharacterTeamup({ teamup, currentUnitId, sectionNumber, }: {
    teamup: Teamup;
    currentUnitId: number;
    sectionNumber: number;
}) {
    return (<DetailSection id="teamup" title="팀업" number={sectionNumber}>
      <div className="mt-5 rounded-md border border-[#343844] bg-[#171a21] p-4 sm:p-5">
        <h3 className="mb-5 border-b border-[#343844] pb-4 text-2xl font-black text-[#e5e7eb]">
          {teamup.title}
        </h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {teamup.members.map((member) => {
            const isCurrent = member.unitId === currentUnitId;
            return (<li key={member.unitId} className="min-w-0">
                <Link href={member.href} aria-current={isCurrent ? "page" : undefined} className={`group flex h-full flex-col overflow-hidden border bg-[#171a21] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isCurrent
                    ? "border-white ring-1 ring-white/30"
                    : "border-[#343844] transition hover:border-white hover:bg-[#1d2028]"}`}>
                  <div className="border-b border-[#343844] bg-[#111318] p-1.5">
                    <div className="relative isolate aspect-[256/354] w-full overflow-hidden bg-[#0b0d12]">
                      <CharacterAwakenCircuit grade={member.grade} isAwakened={member.isAwakened}/>
                      {member.imagePath ? (<Image src={member.imagePath} alt="" fill sizes="(min-width: 1280px) 210px, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 45vw" className="z-10 object-fill"/>) : null}
                      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-6">
                        <RarityIcon grade={member.grade} size="sm"/>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 px-2.5 py-3">
                    <h4 className="break-words text-base font-black leading-6 text-[#e5e7eb] group-hover:text-white">
                      {member.name}
                    </h4>
                    {member.title ? (<p className="mt-1 break-words text-sm leading-5 text-[#9ca3af]">{member.title}</p>) : null}
                  </div>
                </Link>
              </li>);
        })}
        </ul>
      </div>
    </DetailSection>);
}
