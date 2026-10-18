import remote from "@/data/webtoon-remote-assets.json";
import type { WebtoonLanguage } from "@/lib/webtoonTypes";

/** Encode individual segments so original archive folders and filenames stay intact. */
export function webtoonRepositoryImageUrl(repositoryPath: string): string {
  const segments = repositoryPath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    throw new Error(`Invalid webtoon repository path: ${repositoryPath}`);
  }
  return `${remote.baseUrl}/${segments.map(encodeURIComponent).join("/")}`;
}

/** Keep catalog paths local for source verification; resolve published PNGs at the UI boundary. */
export function webtoonImageUrl(imagePath: string, language: WebtoonLanguage): string {
  const filename = imagePath.split("/").pop();
  if (!filename) throw new Error(`Missing webtoon image filename: ${imagePath}`);
  const path = ["클라이언트", remote.languageFolders[language], filename];
  return webtoonRepositoryImageUrl(path.join("/"));
}
