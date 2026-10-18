import type { Metadata } from "next";
import CatalogPage from "@/components/CatalogPage";
import WebtoonGallery from "@/components/WebtoonGallery";
import { getWebtoons } from "@/lib/webtoons";

export const metadata: Metadata = {
  title: "공식 웹툰 | 카운터사이드 웹뷰어",
  description: "카운터사이드 공식 웹툰, 가이드 웹툰과 클라이언트 웹툰을 볼 수 있습니다.",
};

export default function WebtoonsPage() {
  return (
    <CatalogPage title="공식 웹툰">
      <WebtoonGallery entries={getWebtoons()} />
    </CatalogPage>
  );
}
