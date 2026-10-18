import Image from "@/components/DeploymentImage";
import Link from "@/components/DeploymentLink";
import type { CharacterSkin } from "@/lib/characterSkins";
export function GameText({ text, className, }: {
    text: string;
    className: string;
}) {
    const parts = text.split(/(<color=#[0-9a-fA-F]{6}>[\s\S]*?<\/color>)/gi);
    return (<p className={className}>
      {parts.map((part, index) => {
            const colorMatch = part.match(/^<color=#([0-9a-fA-F]{6})>([\s\S]*?)<\/color>$/i);
            if (!colorMatch) {
                return part;
            }
            return (<span key={`${colorMatch[1]}-${index}`} style={{ color: `#${colorMatch[1]}` }}>
            {colorMatch[2]}
          </span>);
        })}
    </p>);
}
export function SkinDescription({ description }: {
    description: string;
}) {
    if (!description) {
        return (<p className="mt-3 text-sm leading-7 text-[#b9bec8]">
        스킨 설명이 없습니다.
      </p>);
    }
    return (<GameText text={description} className="mt-3 whitespace-pre-line text-sm leading-7 text-[#b9bec8]"/>);
}
export default function CharacterSkinCard({ skin, imageSize = "small", }: {
    skin: CharacterSkin;
    imageSize?: "small" | "large";
}) {
    const largeImage = imageSize === "large";
    return (<Link href={skin.href} className={`group grid overflow-hidden border border-[#343844] bg-[#171a21] transition hover:border-white hover:bg-[#1d2028] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${largeImage ? "sm:grid-cols-[220px_minmax(0,1fr)]" : "sm:grid-cols-[180px_minmax(0,1fr)]"}`}>
      <div className={`flex items-center justify-center border-b border-[#343844] bg-[#111318] sm:border-b-0 sm:border-r ${largeImage ? "p-2" : "p-3"}`}>
        <div className={`relative aspect-[256/354] max-w-full overflow-hidden bg-[#0b0d12] ${largeImage ? "w-[200px]" : "w-[150px]"}`}>
          {skin.backgroundPath ? (<Image src={skin.backgroundPath} alt="" fill sizes={largeImage ? "200px" : "150px"} className="object-fill"/>) : null}
          {skin.imagePath ? (<Image src={skin.imagePath} alt={`${skin.title} 스킨 이미지`} fill sizes={largeImage ? "200px" : "150px"} className="object-fill"/>) : (<div className="flex h-full items-center justify-center text-xs font-bold text-[#565c6b]">
              NO IMAGE
            </div>)}
        </div>
      </div>

      <div className="min-w-0 p-4 sm:p-5">
        <span className="inline-flex border border-[#4b5160] bg-[#222631] px-2 py-1 text-xs font-black text-[#cfd4dc]">
          {skin.grade}
        </span>
        <h3 className="mt-3 text-xl font-black text-[#e5e7eb] transition group-hover:text-white">
          {skin.title}
        </h3>
        <SkinDescription description={skin.description}/>
      </div>
    </Link>);
}
