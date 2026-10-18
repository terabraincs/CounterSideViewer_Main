import Image from "@/components/DeploymentImage";
import { getCharacterProfileBackground, getCharacterProfileSpriteStyle, type CharacterProfileIcon as ProfileIcon, } from "@/lib/characterProfileIcon";
export default function CharacterProfileIcon({ icon, name, grade, }: {
    icon: ProfileIcon;
    name: string;
    grade: string;
}) {
    const background = getCharacterProfileBackground(grade);
    return (<div className="relative size-32 shrink-0 sm:size-36">
      {background ? (<div className="absolute" style={getCharacterProfileSpriteStyle(background.sprite, false)}>
          <Image src={background.imagePath} alt="" fill sizes="144px" className="object-fill"/>
        </div>) : null}
      {/* AB_INVEN_ICON: centered 172 × 172 portrait inside the 200 × 200 slot. */}
      <div className="absolute inset-[7%]">
        <Image src={icon.imagePath} alt={`${name} 얼굴 아이콘`} width={icon.width} height={icon.height} className="absolute max-w-none" style={getCharacterProfileSpriteStyle(icon.sprite, true)}/>
      </div>
    </div>);
}
