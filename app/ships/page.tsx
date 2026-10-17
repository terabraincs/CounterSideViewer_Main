import type { Metadata } from "next";
import ShipSearchList from "@/components/ShipSearchList";
import CatalogPage from "@/components/CatalogPage";
import { loadShips } from "@/lib/ships";
export const metadata: Metadata = {
    title: "함선 | 카운터사이드 웹뷰어",
    description: "카운터사이드 함선 목록을 확인하는 페이지입니다.",
};
export default function ShipsPage() {
    const ships = loadShips();
    const isUsingLocalData = ships.length > 0;
    return (<CatalogPage title="함선 목록">
      {isUsingLocalData ? (<ShipSearchList ships={ships}/>) : (<div className="mt-8 rounded-md border border-[#343844] bg-[#171a21] px-4 py-12 text-center text-sm font-semibold text-[#9ca3af]">
          표시할 함선이 없습니다.
        </div>)}
    </CatalogPage>);
}
