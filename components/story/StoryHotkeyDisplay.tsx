import type { CSSProperties } from "react";
import styles from "./StoryHotkeyDisplay.module.css";
export default function StoryHotkeyDisplay({ text, trackerId, target, className, style, generation, lifetime, host, }: {
    text: string;
    trackerId: string;
    target: string;
    className?: string;
    style?: CSSProperties;
    generation?: number;
    lifetime?: string;
    host?: string;
}) {
    return (<div className={`${styles.root} ${className ?? ""}`} style={style} data-story-hotkey-display={trackerId} data-story-hotkey-display-prefab="NKM_UI_HOTKEY" data-story-hotkey-display-sprite="NKM_UI_HOYKEY_BG" data-story-hotkey-display-text={text} data-story-hotkey-display-target={target} data-story-hotkey-display-generation={generation} data-story-hotkey-display-lifetime={lifetime} data-story-hotkey-display-host={host} aria-hidden="true">
      <span className={styles.surface}>
        <span>{text}</span>
      </span>
    </div>);
}
