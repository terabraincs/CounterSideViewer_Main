import { mainImageAssetUrl } from "@/lib/mainImageAssets";
import { minigameAssetUrl } from "@/lib/minigameAssets";
import audioAssets from "@/data/site-audio-assets.json";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const MAIN_BASE_PATH = process.env.NEXT_PUBLIC_MAIN_BASE_PATH ?? '';
export const MINIGAMES_BASE_PATH = process.env.NEXT_PUBLIC_MINIGAMES_BASE_PATH ?? '/minigames';
export const MODULE: string = 'main';
export function deploymentUrl(url:string):string {
  if (/^\/story\/reader\/fonts\/(?:MainFont|Rajdhani-SemiBold)\.ttf(?:[?#]|$)/.test(url)) {
    return deploymentUrl(url.replace('/story/reader/fonts/', '/game-assets/common/fonts/'));
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    const separator = url.search(/[?#]/);
    const pathname = separator < 0 ? url : url.slice(0, separator);
    const suffix = separator < 0 ? '' : url.slice(separator);
    const audio = (audioAssets.aliases as Record<string,string>)[decodeURI(pathname)];
    if (audio) return audio + suffix;
  }
  const imageUrl=mainImageAssetUrl(minigameAssetUrl(url));
  if(imageUrl!==url)return imageUrl;
  if (!url.startsWith('/') || url.startsWith('//') || !BASE_PATH || url===BASE_PATH || url.startsWith(BASE_PATH+'/')) return url;
  return BASE_PATH+url;
}
export function deploymentData<T>(data:T):T {
  if (typeof data==='string') return (mainImageAssetUrl(minigameAssetUrl(data))!==data || /^\/(?:game-assets|equipment|operators?|ships?|collection|unit|ui|story|music|spine|guide|cutscenes|voice|assets)(?:\/|$)/.test(data) ? deploymentUrl(data) : data) as T;
  if (Array.isArray(data)) return data.map(deploymentData) as T;
  if (data && typeof data==='object') return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,deploymentData(v)])) as T;
  return data;
}
export function siteLink(href:string):{href:string;external:boolean} {
  if (!href.startsWith('/') || href.startsWith('//')) return {href,external:/^https?:/.test(href)};
  const raw=BASE_PATH && (href===BASE_PATH || href.startsWith(BASE_PATH+'/')) ? href.slice(BASE_PATH.length)||'/' : href;
  return {href:raw,external:false};
}
