import catalog from "@/data/story-data-assets.json";

export const STORY_DATA_BASE_URL = catalog.baseUrl;
const paths = new Set(catalog.paths);

export function storyDataAssetUrl(url: string) {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const separator = url.search(/[?#]/);
  const pathname = separator < 0 ? url : url.slice(0, separator);
  const suffix = separator < 0 ? "" : url.slice(separator);
  let local: string;
  try { local = decodeURI(pathname); } catch { return url; }
  if (!paths.has(local)) return url;
  return STORY_DATA_BASE_URL + local.split("/").map(encodeURIComponent).join("/") + suffix;
}
