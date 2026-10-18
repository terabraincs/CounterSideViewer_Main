import catalog from "@/data/spine-assets.json";

export const SPINE_ASSET_BASE_URL = catalog.baseUrl;
const paths = new Set(catalog.paths);

export function hasSpineAsset(url: string) {
  try {
    const local = url.startsWith(SPINE_ASSET_BASE_URL + "/") ? url.slice(SPINE_ASSET_BASE_URL.length) : url;
    return paths.has(decodeURI(local.split(/[?#]/, 1)[0]));
  } catch {
    return false;
  }
}

export function spineAssetUrl(url: string) {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const separator = url.search(/[?#]/);
  const pathname = separator < 0 ? url : url.slice(0, separator);
  const suffix = separator < 0 ? "" : url.slice(separator);
  let local: string;
  try { local = decodeURI(pathname); } catch { return url; }
  const directory = local.endsWith("/") && catalog.paths.some(path => path.startsWith(local));
  if (!paths.has(local) && !directory) return url;
  return SPINE_ASSET_BASE_URL + local.split("/").map(encodeURIComponent).join("/") + suffix;
}
