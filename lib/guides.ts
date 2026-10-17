import catalog from "@/data/guide-catalog.json";
import type { GuideCategory } from "@/lib/guideTypes";

export function getGuideCategories(): GuideCategory[] {
  return catalog.categories;
}
