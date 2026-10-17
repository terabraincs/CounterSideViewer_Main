import fs from "node:fs";
import path from "node:path";
import catalog from "@/data/cutscene-gallery.json";
import flashbackNames from "@/data/cutscene-flashback-names.json";
import backgroundNames from "@/data/cutscene-background-names.json";

export type CutsceneImage = {
  id: string;
  name: string;
  imagePath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  kind: "background" | "image";
  category: "flashback" | "background" | "other";
  stories: string[];
  categories: string[];
};

export function getCutsceneImages(): CutsceneImage[] {
  // Original registered item names, matched to the client's background images.
  const names: Record<string, string> = { ...backgroundNames, ...flashbackNames };
  return catalog.images.map((image) => ({
    ...image,
    kind: image.kind as CutsceneImage["kind"],
    name: names[image.imagePath] ?? image.name,
    // Registration is separate from the background/image slot used by a story.
    category: Object.hasOwn(flashbackNames, image.imagePath)
      ? "flashback"
      : Object.hasOwn(backgroundNames, image.imagePath) ? "background" : "other",
  }));
}

export function getCutsceneCoverImagePath() {
  const images = getCutsceneImages();
  return images.find((image) => image.imagePath === "/story/reader/backgrounds/ca_yoomina_02.png")?.thumbnailPath
    ?? images[0]?.thumbnailPath
    ?? "";
}

export type CutsceneStoryGroup = {
  title: string;
  options: { value: string; label: string }[];
};

export function getCutsceneStoryGroups(): CutsceneStoryGroup[] {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), "public", "story", "reader", "manifest.json"),
    "utf8",
  )) as { episodes: { category: string; strId: string; title: string; name: string }[] };

  const episodesByStory = new Map(manifest.episodes.map((episode) => {
    const fullName = [...new Set([episode.title, episode.name]
      .map((part) => part.trim()).filter(Boolean))].join(" · ");
    return [fullName, episode];
  }));
  const groups: CutsceneStoryGroup[] = [
    { title: "메인스트림", options: [] },
    { title: "서브스트림", options: [] },
    { title: "전조", options: [] },
    { title: "시즈널 레코드", options: [] },
    { title: "콜라보", options: [] },
    { title: "기타", options: [] },
  ];
  const groupByCategory: Record<string, CutsceneStoryGroup> = {
    EC_MAINSTREAM: groups[0],
    EC_SIDESTORY: groups[1],
    EC_SIDESTORY_OMEN: groups[2],
    EC_SEASONAL: groups[3],
  };
  const stories = [...new Set(catalog.images.flatMap((image) => image.stories))]
    .sort((a, b) => a.localeCompare(b, "ko-KR", { numeric: true }));

  for (const story of stories) {
    const episode = episodesByStory.get(story);
    // EC_EVENT also contains non-collaboration episodes such as HORIZON_CM.
    const isCollaboration = episode?.category === "EC_EVENT"
      && episode.strId.startsWith("ESI_EVENT_CLB_");
    const group = isCollaboration ? groups[4] : groupByCategory[episode?.category ?? ""] ?? groups[5];
    group.options.push({
      value: story,
      label: episode?.category === "EC_SIDESTORY" && episode.name.trim()
        ? episode.name.trim()
        : story,
    });
  }

  return groups;
}
