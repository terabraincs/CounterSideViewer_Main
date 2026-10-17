import type { ReactNode } from "react";
import SitePage from "@/components/SitePage";
type CatalogPageProps = {
    title: string;
    children: ReactNode;
};
export default function CatalogPage({ title, children }: CatalogPageProps) {
    return (<SitePage>
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-col gap-3 border-b border-[#343844] pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                {title}
              </h1>
            </div>
          </div>
        </div>

        {children}
      </section>
    </SitePage>);
}
