import type { Metadata } from "next";
import GuideViewer from "@/components/GuideViewer";
import SitePage from "@/components/SitePage";
import { getGuideCategories } from "@/lib/guides";

export const metadata: Metadata = {
  title: "인게임 가이드 | 카운터사이드 웹뷰어",
  description: "카운터사이드의 시스템과 콘텐츠 안내를 확인할 수 있습니다.",
};

export default function GuidePage() {
  return (
    <SitePage>
      <article className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="border-b border-[#343844] pb-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">인게임 가이드</h1>
        </header>
        <GuideViewer categories={getGuideCategories()} />
      </article>
    </SitePage>
  );
}
