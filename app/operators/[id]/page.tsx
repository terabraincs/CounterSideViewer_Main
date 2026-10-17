import { deploymentUrl } from "@/lib/deployment";
import type { Metadata } from "next";
import Link from "@/components/DeploymentLink";
import { notFound } from "next/navigation";
import OperatorSkillPanel from "@/components/OperatorSkillPanel";
import OperatorStatsPanel from "@/components/OperatorStatsPanel";
import OperatorProfilePanel from "@/components/OperatorProfilePanel";
import FloatingSectionNav from "@/components/FloatingSectionNav";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import DetailSection from "@/components/DetailSection";
import ProfileIntroduction from "@/components/ProfileIntroduction";
import DialoguePanel from "@/components/DialoguePanel";
import UnusedVoiceList from "@/components/UnusedVoiceList";
import { getOperatorDetail, loadOperators } from "@/lib/operators";
import { getOperatorProfile } from "@/lib/operatorProfiles";
import { getOperatorUnusedVoices } from "@/lib/unusedVoices";
type OperatorDetailPageProps = {
    params: Promise<{
        id: string;
    }>;
};
export const dynamicParams = false;
export function generateStaticParams() {
    return loadOperators().map((operator) => ({ id: operator.id }));
}
export async function generateMetadata({ params, }: OperatorDetailPageProps): Promise<Metadata> {
    const { id } = await params;
    const operator = getOperatorDetail(decodeURIComponent(id), {
        includeDialogues: false,
    });
    return {
        title: `${operator?.name ?? "오퍼레이터 상세"} | 카운터사이드 웹뷰어`,
        description: "카운터사이드 오퍼레이터 상세 정보를 확인하는 페이지입니다.",
    };
}
export default async function OperatorDetailPage({ params, }: OperatorDetailPageProps) {
    const { id } = await params;
    const operator = getOperatorDetail(decodeURIComponent(id));
    if (!operator) {
        notFound();
    }
    const profile = getOperatorProfile(operator.id);
    const unusedVoices = getOperatorUnusedVoices(operator.id);
    const sections = [
        ...(profile?.intro ? [{ id: "introduction", title: "소개" }] : []),
        { id: "stats", title: "작전 능력" },
        { id: "skills", title: "지휘 기술" },
        { id: "dialogues", title: "대사" },
    ];
    const sectionNumber = (sectionId: string) => sections.findIndex((section) => section.id === sectionId) + 1;
    const normalDialogues = operator.dialogues.filter((dialogue) => !dialogue.isExtra);
    const extraDialogues = operator.dialogues.filter((dialogue) => dialogue.isExtra);
    return (<div id="profile" className="flex min-h-screen flex-col bg-[#0b0d12] text-[#e5e7eb]">
      <SiteHeader />
      <FloatingSectionNav sections={[
            { id: "profile", title: "프로필", number: null },
            ...sections.map((section, index) => ({ ...section, number: index + 1 })),
        ]} contentWidth="wide"/>

      <main className="flex-1">
        <article className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link href={deploymentUrl("/operators")} className="inline-flex items-center text-sm font-semibold text-white transition hover:text-[#d1d5db]">
            ← 오퍼레이터 목록
          </Link>

          <header className="mt-5 border-b border-[#343844] pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-black text-white sm:text-4xl">
                  {operator.name}
                </h1>
                <p className="mt-2 text-sm font-semibold text-[#9ca3af]">
                  {operator.title}
                </p>
              </div>
            </div>
          </header>

          <div className="mt-8 space-y-10">
            <OperatorProfilePanel operator={operator} profile={profile}/>
            {profile?.intro ? (<DetailSection id="introduction" title="소개" number={sectionNumber("introduction")}>
                <ProfileIntroduction text={profile.intro}/>
              </DetailSection>) : null}
            <OperatorStatsPanel stats={operator.stats} sectionNumber={sectionNumber("stats")}/>
            <OperatorSkillPanel skill={operator.tacticalSkill} sectionNumber={sectionNumber("skills")}/>

            <DetailSection id="dialogues" title="대사" number={sectionNumber("dialogues")}>
              {operator.dialogues.length > 0 ? (<DialoguePanel dialogues={normalDialogues} extraDialogues={extraDialogues} extraTitle="엑스트라 대사" extraBadge="엑스트라"/>) : unusedVoices.length === 0 ? (<EmptyMessage text="대사 데이터가 없습니다."/>) : null}
              {unusedVoices.length > 0 ? (<div id="unused-dialogues" className="mt-5 scroll-mt-44 sm:scroll-mt-24">
                  <UnusedVoiceList groups={unusedVoices}/>
                </div>) : null}
            </DetailSection>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>);
}
function EmptyMessage({ text }: {
    text: string;
}) {
    return (<div className="mt-4 border border-[#343844] bg-[#0b0d12] px-4 py-8 text-center text-sm font-semibold text-[#9ca3af]">
      {text}
    </div>);
}
