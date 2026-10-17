import type { Metadata } from "next";
import EquipmentSearchList from "@/components/EquipmentSearchList";
import CatalogPage from "@/components/CatalogPage";
import { loadEquipment } from "@/lib/equipment";
export const metadata: Metadata = {
    title: "장비 | 카운터사이드 웹뷰어",
    description: "카운터사이드 장비 목록을 확인하는 페이지입니다.",
};
export default function EquipmentPage() {
    const equipment = loadEquipment();
    const isUsingLocalData = equipment.length > 0;
    return (<CatalogPage title="장비 목록">
      {isUsingLocalData ? (<EquipmentSearchList equipment={equipment}/>) : (<div className="mt-8 rounded-md border border-[#343844] bg-[#171a21] px-4 py-12 text-center text-sm font-semibold text-[#9ca3af]">
          표시할 장비가 없습니다.
        </div>)}
    </CatalogPage>);
}
