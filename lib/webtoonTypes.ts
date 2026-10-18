export const WEBTOON_LANGUAGES = [
  { value: "ko", label: "한국어", locale: "ko-KR" },
  { value: "en", label: "영어", locale: "en" },
  { value: "ja", label: "일본어", locale: "ja" },
  { value: "zh-TW", label: "중국어 번체", locale: "zh-Hant" },
  { value: "de", label: "독일어", locale: "de" },
  { value: "fr", label: "프랑스어", locale: "fr" },
] as const;

export type WebtoonLanguage = (typeof WEBTOON_LANGUAGES)[number]["value"];

export function isWebtoonLanguage(value: string): value is WebtoonLanguage {
  return WEBTOON_LANGUAGES.some((language) => language.value === value);
}

export const WEBTOON_COLLECTIONS = [
  { value: "official", label: "공식 웹툰" },
  { value: "guide", label: "가이드 웹툰" },
  { value: "client", label: "클라이언트 웹툰" },
] as const;

export type WebtoonCollection = (typeof WEBTOON_COLLECTIONS)[number]["value"];

export type WebtoonPage = {
  imagePath: string;
  width: number;
  height: number;
  clipInsets?: { top: number; right: number; bottom: number; left: number };
};

export type WebtoonEntry = WebtoonPage & {
  id: string;
  episodeId: string;
  language: WebtoonLanguage;
  title: string;
  order: number;
  collection: WebtoonCollection;
  series?: string;
  pages: WebtoonPage[];
  description?: string;
  searchText: string;
};
