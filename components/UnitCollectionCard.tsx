import { deploymentUrl } from "@/lib/deployment";
import type { ReactNode } from "react";
import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
type UnitCollectionCardProps = {
    href: string;
    name: string;
    title: string;
    grade: string;
    gradeColor: string;
    imagePath?: string;
    artworkBackground?: ReactNode;
    footer?: ReactNode;
};
/** Shared employee/operator tile; callers supply their own badges and asset URL. */
export default function UnitCollectionCard({ href, name, title, grade, gradeColor, imagePath, artworkBackground, footer, }: UnitCollectionCardProps) {
    return (<Link href={deploymentUrl(href)} className="group overflow-hidden rounded-lg border border-[#343844] bg-[#171a21] transition duration-200 hover:-translate-y-1 hover:border-white hover:bg-[#222631] focus:outline-none focus:ring-2 focus:ring-[#9ca3af]">
      <div className="relative isolate flex aspect-[256/354] items-center justify-center overflow-hidden border-b border-[#343844] bg-[#10131a]">
        {artworkBackground}
        {imagePath ? (<Image src={deploymentUrl(imagePath)} alt={`${name} 이미지`} fill sizes="(min-width: 1280px) 180px, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw" className="z-10 object-fill transition duration-300 group-hover:scale-105"/>) : (<span className="relative z-10 text-xs font-semibold tracking-[0.18em] text-[#343844]">NO IMAGE</span>)}
      </div>
      <div className="h-1.5 w-full" style={{ backgroundColor: gradeColor }}>
        <span className="sr-only">{grade} 등급</span>
      </div>
      <div className="flex min-h-24 flex-col justify-between gap-3 px-3 py-3">
        <div>
          <h2 className="line-clamp-2 text-base font-bold leading-6 text-white group-hover:text-white">{name}</h2>
          <p className="mt-1 line-clamp-1 text-xs text-[#9ca3af]" title={title}>{title}</p>
        </div>
        {footer}
      </div>
    </Link>);
}
