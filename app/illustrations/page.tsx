import type { Metadata } from "next";
import CutsceneGallery from "@/components/CutsceneGallery";
import SitePage from "@/components/SitePage";
import { getCutsceneImages, getCutsceneStoryGroups } from "@/lib/cutscenes";

export const metadata: Metadata = {
  title: "일러스트 | 카운터사이드 웹뷰어",
  description: "카운터사이드 스토리에 등장하는 일러스트를 모아 볼 수 있습니다.",
};

export default function IllustrationsPage() {
  return (
    <SitePage>
      <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="border-b border-[#343844] pb-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">일러스트 목록</h1>
        </header>
        <CutsceneGallery images={getCutsceneImages()} storyGroups={getCutsceneStoryGroups()} />
      </article>
    </SitePage>
  );
}
