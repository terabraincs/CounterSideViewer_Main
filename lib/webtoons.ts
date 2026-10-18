import catalog from "@/data/webtoon-catalog.json";
import archiveCatalog from "@/data/webtoon-archive-catalog.json";
import { webtoonImageUrl, webtoonRepositoryImageUrl } from "@/lib/webtoonAssets";
import { isWebtoonLanguage, type WebtoonEntry } from "@/lib/webtoonTypes";

export function getWebtoons(): WebtoonEntry[] {
  const archiveEntries = archiveCatalog.entries.map((entry): WebtoonEntry => {
    if (!isWebtoonLanguage(entry.language)) {
      throw new Error(`Unknown webtoon language: ${entry.id}`);
    }
    if (entry.collection !== "official" && entry.collection !== "guide") {
      throw new Error(`Unknown webtoon collection: ${entry.id}`);
    }
    const pages = entry.pages.map((page) => ({
      imagePath: webtoonRepositoryImageUrl(page.repositoryPath),
      width: page.width,
      height: page.height,
    }));
    const cover = pages[0];
    if (!cover) throw new Error(`Missing webtoon pages: ${entry.id}`);
    return {
      id: entry.id,
      episodeId: entry.episodeId,
      language: entry.language,
      title: entry.title,
      order: entry.order,
      collection: entry.collection,
      series: entry.series || undefined,
      pages,
      ...cover,
      searchText: `${entry.searchText} ${entry.collection === "official" ? "공식 웹툰" : "가이드 웹툰"}`,
    };
  });
  const clientOrderOffset = Math.max(0, ...archiveEntries.map((entry) => entry.order));
  const clientEntries = catalog.entries.map((entry): WebtoonEntry => {
    if (!isWebtoonLanguage(entry.language)) {
      throw new Error(`Unknown webtoon language: ${entry.id}`);
    }
    const page = {
      imagePath: webtoonImageUrl(entry.imagePath, entry.language),
      width: entry.width,
      height: entry.height,
      clipInsets: entry.clipInsets,
    };
    return {
      id: entry.id,
      episodeId: entry.episodeId,
      language: entry.language,
      title: entry.description.trim() || entry.title,
      order: clientOrderOffset + entry.order,
      collection: "client",
      pages: [page],
      ...page,
      description: entry.description,
      searchText: `${entry.searchText} 클라이언트 웹툰`,
    };
  });
  return [...archiveEntries, ...clientEntries];
}

export function getWebtoonCoverImagePath(): string {
  const cover = catalog.entries.find((entry) => entry.language === "ko" && entry.order === 1);
  if (!cover) throw new Error("Missing Korean webtoon cover");
  return webtoonImageUrl(cover.imagePath, "ko");
}
