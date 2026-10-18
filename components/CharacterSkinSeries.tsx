import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import type { CharacterSkinSeries as SkinSeries } from "@/lib/characterSkinSeries";
type CharacterSkinSeriesProps = {
    series: SkinSeries;
    currentSkinId: string;
    sectionNumber: number;
};
export default function CharacterSkinSeries({ series, currentSkinId, sectionNumber, }: CharacterSkinSeriesProps) {
    return (<section id="skin-series" aria-labelledby="skin-series-heading" className="scroll-mt-24">
      <h2 id="skin-series-heading" className="border-b border-[#343844] pb-3 text-2xl font-bold text-[#cfd4dc]">
        <span className="mr-2 text-[#9ca3af]">{sectionNumber}.</span>
        시리즈
      </h2>

      <div className="mt-5 rounded-md border border-[#343844] bg-[#171a21] p-4 sm:p-5">
        <h3 className="mb-5 border-b border-[#343844] pb-4 text-2xl font-black text-[#e5e7eb]">
          {series.title}
        </h3>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {series.skins.map((skin) => {
            const isCurrent = skin.id === currentSkinId;
            return (<li key={skin.id} className="min-w-0">
                <Link href={skin.href} aria-current={isCurrent ? "page" : undefined} className={`group flex h-full flex-col overflow-hidden border bg-[#171a21] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isCurrent
                    ? "border-white ring-1 ring-white/30"
                    : "border-[#343844] transition hover:border-white hover:bg-[#1d2028]"}`}>
                  <div className="border-b border-[#343844] bg-[#111318] p-1.5">
                    <div className="relative aspect-[256/354] w-full overflow-hidden bg-[#0b0d12]">
                      {skin.backgroundPath ? (<Image src={skin.backgroundPath} alt="" fill sizes="(min-width: 1152px) 186px, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 45vw" className="object-fill"/>) : null}
                      {skin.imagePath ? (<Image src={skin.imagePath} alt={`${skin.title} 스킨 이미지`} fill sizes="(min-width: 1152px) 186px, (min-width: 1024px) 19vw, (min-width: 640px) 30vw, 45vw" className="object-fill"/>) : (<div className="flex h-full items-center justify-center text-xs font-bold text-[#565c6b]">
                          NO IMAGE
                        </div>)}
                    </div>
                  </div>

                  <div className="min-w-0 px-2.5 py-2.5">
                    <p className="break-words text-sm font-semibold text-[#9ca3af]">{skin.unitName}</p>
                    <h4 className="mt-1 break-words text-base font-black leading-6 text-[#e5e7eb] transition group-hover:text-white">
                      {skin.title}
                    </h4>
                  </div>
                </Link>
              </li>);
        })}
        </ul>
      </div>
    </section>);
}
