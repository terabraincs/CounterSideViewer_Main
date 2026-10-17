import { deploymentUrl } from "@/lib/deployment";
import Image from "@/components/DeploymentImage";
import type { ChangeEventHandler } from "react";
import styles from "./SearchInput.module.css";
type SearchInputProps = {
    value: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    ariaLabel: string;
    placeholder?: string;
    testId?: string;
    containerClassName?: string;
};
export default function SearchInput({ value, onChange, ariaLabel, placeholder = "검색", testId, containerClassName = "", }: SearchInputProps) {
    return (<div className={`${styles.container} ${containerClassName}`}>
      <Image src={deploymentUrl("/ui/NKM_UI_COMMON_ICON_SEARCH.png")} alt="" width={22} height={22} className={styles.icon}/>
      <input type="search" value={value} onChange={onChange} aria-label={ariaLabel} placeholder={placeholder} data-testid={testId} className={styles.input}/>
    </div>);
}
