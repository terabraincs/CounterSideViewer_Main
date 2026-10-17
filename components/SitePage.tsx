import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
type SitePageProps = {
    children: ReactNode;
};
export default function SitePage({ children }: SitePageProps) {
    return (<div className="flex min-h-screen flex-col bg-[#0b0d12] text-[#e5e7eb]">
      <SiteHeader />

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>);
}
