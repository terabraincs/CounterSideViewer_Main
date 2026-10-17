"use client";
import dynamic from "next/dynamic";
import type { CollectionTrophyItem } from "@/lib/collectionTrophies";
const EmbeddedSpineViewer = dynamic(() => import("@/components/SpineViewer"), {
    ssr: false,
    loading: () => (<div className="flex h-[60dvh] min-h-[400px] max-h-[720px] items-center justify-center text-sm text-[#9ca3af]" role="status">
      스파인 뷰어를 불러오는 중입니다.
    </div>),
});
export default function CollectionTrophySpineViewer({ trophy }: {
    trophy: CollectionTrophyItem;
}) {
    return (<div className="overflow-hidden rounded-md border border-[#343844] bg-[#0b0d12]" data-trophy-spine-viewer={trophy.id}>
      {trophy.spine ? (<EmbeddedSpineViewer embeddedModel={trophy.spine.model} initialState={trophy.spine.initialState} compact ariaLabel="트로피 스파인 뷰어"/>) : (<div className="flex h-[60dvh] min-h-[400px] max-h-[720px] items-center justify-center text-sm text-[#9ca3af]" role="status">
          이 트로피의 스파인 모델을 지원하지 않습니다.
        </div>)}
    </div>);
}
