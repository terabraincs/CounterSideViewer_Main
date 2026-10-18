import { minigameAssetUrl } from "@/lib/minigameAssets";
import Image from "@/components/DeploymentImage";
import type { ImageProps } from "next/image";
import { mainImageAssetUrl } from "@/lib/mainImageAssets";
export default function AssetImage(props: ImageProps) {
    return <Image {...props} alt={props.alt} src={typeof props.src === "string" ? mainImageAssetUrl(minigameAssetUrl(props.src)) : props.src}/>;
}
