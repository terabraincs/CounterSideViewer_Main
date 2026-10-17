import type { Metadata } from "next";
import OperatorSearchList from "@/components/OperatorSearchList";
import CatalogPage from "@/components/CatalogPage";
import { loadOperators } from "@/lib/operators";
export const metadata: Metadata = {
    title: "오퍼레이터 | 카운터사이드 웹뷰어",
    description: "카운터사이드 오퍼레이터 목록을 확인하는 페이지입니다.",
};
export default function OperatorsPage() {
    const operators = loadOperators();
    const isUsingLocalData = operators.length > 0;
    return (<CatalogPage title="오퍼레이터 목록">
      {isUsingLocalData ? (<OperatorSearchList operators={operators}/>) : (<div className="mt-8 rounded-md border border-[#343844] bg-[#171a21] px-4 py-12 text-center text-sm font-semibold text-[#9ca3af]">
          표시할 오퍼레이터가 없습니다.
        </div>)}
    </CatalogPage>);
}
