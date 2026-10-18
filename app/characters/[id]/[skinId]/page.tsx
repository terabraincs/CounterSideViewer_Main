import type { Metadata } from "next";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import { notFound } from "next/navigation";
import CharacterSkinCard, { GameText, SkinDescription, } from "@/components/CharacterSkinCard";
import CharacterSkinSeries from "@/components/CharacterSkinSeries";
import CharacterProfileIcon from "@/components/CharacterProfileIcon";
import { getCharacterSkinProfileIcon } from "@/lib/characterProfileIcon";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FloatingSectionNav from "@/components/FloatingSectionNav";
import DialoguePanel from "@/components/DialoguePanel";
import BattleVoiceList from "@/components/BattleVoiceList";
import UnusedVoiceList from "@/components/UnusedVoiceList";
import { getCharacterSkinBattleVoices } from "@/lib/characterBattleVoices";
import { getCharacterUnusedVoices } from "@/lib/unusedVoices";
import { getCharacterSkinSeries } from "@/lib/characterSkinSeries";
import { getCharacterSkinDetail, getCharacterSkinStaticParams, } from "@/lib/characterSkins";
type CharacterSkinDetailPageProps = {
    params: Promise<{
        id: string;
        skinId: string;
    }>;
};
export const dynamicParams = false;
export function generateStaticParams() {
    return getCharacterSkinStaticParams();
}
export async function generateMetadata({ params, }: CharacterSkinDetailPageProps): Promise<Metadata> {
    const { id, skinId } = await params;
    const detail = getCharacterSkinDetail(id, skinId);
    return {
        title: `${detail?.skin.title ?? "스킨 상세"} | 카운터사이드 웹뷰어`,
        description: detail
            ? `${detail.unitName}의 ${detail.skin.title} 스킨 정보입니다.`
            : "카운터사이드 사원 스킨 상세 정보입니다.",
    };
}
export default async function CharacterSkinDetailPage({ params, }: CharacterSkinDetailPageProps) {
    const { id, skinId } = await params;
    const detail = getCharacterSkinDetail(id, skinId);
    if (!detail) {
        notFound();
    }
    const hasDialogues = detail.dialogues.length > 0;
    const dialogues = detail.dialogues.map((dialogue) => ({
        ...dialogue,
        playbackLabel: `${dialogue.label} 스킨${dialogue.isLifetime ? " 종신계약" : ""} 대사`,
    }));
    const battleVoices = getCharacterSkinBattleVoices(detail.unitId, detail.skin.id);
    const hasBattleVoices = battleVoices.length > 0;
    const unusedVoices = getCharacterUnusedVoices(detail.unitId, detail.skin.id);
    const hasUnusedVoices = unusedVoices.length > 0;
    const hasOtherSkins = detail.otherSkins.length > 0;
    const skinSeries = getCharacterSkinSeries(detail.skin.id);
    const profileIcon = getCharacterSkinProfileIcon(Number(detail.skin.id));
    const sections = [
        ...(hasDialogues || hasBattleVoices || hasUnusedVoices ? [{ id: "dialogues", title: "대사" }] : []),
        ...(hasOtherSkins ? [{ id: "other-skins", title: "다른 스킨" }] : []),
        ...(skinSeries ? [{ id: "skin-series", title: "시리즈" }] : []),
    ];
    return (<div className="flex min-h-screen flex-col bg-[#0b0d12] text-[#e5e7eb]">
      <SiteHeader />
      <FloatingSectionNav sections={sections}/>

      <main className="flex-1">
        <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link href={`/characters/${encodeURIComponent(detail.unitId)}#skins`} className="inline-flex items-center text-sm font-semibold text-white transition hover:text-[#d1d5db]">
            ← {detail.unitName} 상세
          </Link>

          <header className="mt-5 border-b border-[#343844] pb-6">
            <h1 className="text-3xl font-black text-[#cfd4dc] sm:text-4xl">
              {detail.skin.title}
            </h1>
            <p className="mt-3 text-sm font-semibold text-[#9ca3af]">
              {detail.unitName} 스킨
            </p>
          </header>

          <section className="mt-8 grid gap-6 rounded-md border border-[#343844] bg-[#171a21] p-4 sm:p-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
            <div className="mx-auto w-full max-w-[300px]">
              <div className="relative aspect-[256/354] overflow-hidden bg-[#0b0d12]">
                {detail.skin.backgroundPath ? (<Image src={detail.skin.backgroundPath} alt="" fill sizes="300px" className="object-fill" priority/>) : null}
                {detail.skin.imagePath ? (<Image src={detail.skin.imagePath} alt={`${detail.skin.title} 스킨 이미지`} fill sizes="300px" className="object-fill" priority/>) : (<div className="flex h-full items-center justify-center text-xs font-bold tracking-[0.2em] text-[#565c6b]">
                    NO IMAGE
                  </div>)}
              </div>
            </div>

            <div className="min-w-0 py-1">
              <span className="inline-flex border border-[#4b5160] bg-[#222631] px-2.5 py-1.5 text-sm font-black text-[#cfd4dc]">
                {detail.skin.grade}
              </span>
              <h2 className="mt-5 border-b border-[#343844] pb-3 text-2xl font-black text-white">
                {detail.skin.title}
              </h2>
              <div className="mt-5 flex items-start gap-4 sm:gap-5">
                <div className="min-w-0 flex-1 [&>p]:mt-0">
                  {detail.skin.description ? (<SkinDescription description={detail.skin.description}/>) : (<p className="text-sm font-semibold text-[#9ca3af]">
                      등록된 스킨 설명이 없습니다.
                    </p>)}
                </div>
                {profileIcon ? (<div className="ml-auto w-fit shrink-0 rounded-md border border-[#343844] bg-[#0b0d12] p-3">
                    <CharacterProfileIcon icon={profileIcon.icon} name={`${detail.unitName} ${detail.skin.title} 스킨`} grade={profileIcon.grade}/>
                  </div>) : null}
              </div>
            </div>
          </section>

          {sections.length > 0 ? (<div className="mt-8 space-y-10">
              {hasDialogues || hasBattleVoices || hasUnusedVoices ? (<section id="dialogues" className="scroll-mt-24">
                  <h2 className="border-b border-[#343844] pb-3 text-2xl font-bold text-[#cfd4dc]">
                    <span className="mr-2 text-[#9ca3af]">1.</span>
                    대사
                  </h2>
                  {hasDialogues ? (<DialoguePanel dialogues={dialogues.filter((dialogue) => !dialogue.isLifetime)} extraDialogues={dialogues.filter((dialogue) => dialogue.isLifetime)} extraTitle="종신계약 대사" extraBadge="종신계약" textComponent={GameText} preserveLineBreaks/>) : null}
                  {hasBattleVoices ? (<div id="battle-dialogues" className="mt-5 scroll-mt-44 sm:scroll-mt-24">
                      <BattleVoiceList groups={battleVoices}/>
                    </div>) : null}
                  {hasUnusedVoices ? (<div id="unused-dialogues" className="mt-5 scroll-mt-44 sm:scroll-mt-24">
                      <UnusedVoiceList groups={unusedVoices}/>
                    </div>) : null}
                </section>) : null}

              {hasOtherSkins ? (<section id="other-skins" className="scroll-mt-24">
                  <h2 className="border-b border-[#343844] pb-3 text-2xl font-bold text-[#cfd4dc]">
                    <span className="mr-2 text-[#9ca3af]">
                      {sections.findIndex((section) => section.id === "other-skins") + 1}.
                    </span>
                    다른 스킨
                  </h2>
                  <div className="mt-5 grid gap-4">
                    {detail.otherSkins.map((skin) => (<CharacterSkinCard key={skin.id} skin={skin} imageSize="large"/>))}
                  </div>
                </section>) : null}

              {skinSeries ? (<CharacterSkinSeries series={skinSeries} currentSkinId={detail.skin.id} sectionNumber={sections.findIndex((section) => section.id === "skin-series") + 1}/>) : null}
            </div>) : null}
        </article>
      </main>

      <SiteFooter />
    </div>);
}
