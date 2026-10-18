import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import StorylineMap from "@/components/StorylineMap";
import { loadStorylineLayout } from "@/lib/storyline";
export const metadata: Metadata = {
    title: "스토리 연대기 | 카운터사이드 웹뷰어",
    description: "카운터사이드 메인스트림과 서브스트림의 연대기 및 연결 관계를 확인합니다.",
};
export default function StorylinePage() {
    const layout = loadStorylineLayout();
    return (<div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#0b0d12] text-[#e5e7eb]" data-story-chronicle-page-scale="STV-CHR-007">
      <SiteHeader />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {layout ? (<StorylineMap layout={layout}/>) : (<div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="border border-[#343844] bg-[#111318] px-5 py-12 text-center text-sm text-[#9ca3af]">
                스토리라인 레이아웃 데이터를 찾을 수 없습니다.
              </div>
            </div>)}
        </section>
      </main>

      <SiteFooter />
    </div>);
}
