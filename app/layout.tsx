import type { Metadata } from 'next';
import { mainImageAssetUrl } from '@/lib/mainImageAssets';
import StoryOperationScrollHotkeyOverlayProvider from '@/components/story/StoryOperationScrollHotkeyOverlay';
import './globals.css';
export const metadata: Metadata = {title:'카운터사이드 웹뷰어',description:'카운터사이드 웹뷰어',icons:{icon:mainImageAssetUrl('/favicon.ico')}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ko"><body><StoryOperationScrollHotkeyOverlayProvider>{children}</StoryOperationScrollHotkeyOverlayProvider></body></html>; }
