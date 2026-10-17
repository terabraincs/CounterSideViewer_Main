import type { ReactNode } from "react";
import styles from "./CollectionProfilePanel.module.css";
/** One approved profile composition shared by employees and operators. */
export default function CollectionProfilePanel({ summary, children }: {
    summary: ReactNode;
    children: ReactNode;
}) {
    return <div className={styles.panel} data-collection-profile-panel>
    <div className={styles.content}>{summary}{children}</div>
  </div>;
}
