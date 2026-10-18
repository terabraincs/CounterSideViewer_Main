import type { Metadata } from "next";
import StoryReader from "@/components/story/StoryReader";
export const metadata: Metadata = {
    title: "인게임 스토리 뷰어 | 카운터사이드 데이터베이스",
    description: "카운터사이드의 에피소드와 컷신을 인게임 화면 구성으로 감상합니다.",
};
export default function StoryReaderPage() {
    return <StoryReader />;
}
