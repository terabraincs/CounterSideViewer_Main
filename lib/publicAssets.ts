import fs from "node:fs";
import path from "node:path";
import { hasMainImageAsset } from "@/lib/mainImageAssets";
import { hasSpineAsset } from "@/lib/spineAssets";

// Main's published images are represented by the checked-in asset index.
// Source JSON and other local files still use the real filesystem.
export function publicFileExists(filePath: string) {
  const relative = path.relative(path.join(process.cwd(), "public"), filePath);
  if (relative && relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative)) {
    const url = "/" + relative.split(path.sep).join("/");
    if (hasMainImageAsset(url) || hasSpineAsset(url)) return true;
  }
  return fs.existsSync(filePath);
}
