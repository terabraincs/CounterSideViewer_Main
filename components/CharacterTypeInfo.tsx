"use client";
import { deploymentUrl } from "@/lib/deployment";
import { useBodyScrollLock } from "@/lib/useDialogEffects";
import Image from "@/components/DeploymentImage";
import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { CharacterTypeInfoCatalog, CharacterTypeInfoUnitTag } from "@/lib/characterTypeInfo";
import styles from "./CharacterTypeInfo.module.css";
export type CharacterTypeInfoTab = "basic" | "attack" | "tag";
const TypeInfoContext = createContext<((tab: CharacterTypeInfoTab) => void) | null>(null);
export function CharacterTypeInfoTrigger({ tab, label, children, className = "", }: {
    tab: CharacterTypeInfoTab;
    label: string;
    children: ReactNode;
    className?: string;
}) {
    const open = useContext(TypeInfoContext);
    return (<button type="button" className={`${styles.trigger} ${className}`} aria-label={`${label} 설명 보기`} aria-haspopup="dialog" onClick={() => open?.(tab)}>
      {children}
    </button>);
}
export default function CharacterTypeInfo({ catalog, selectedIds, detailTags, children, }: {
    catalog: CharacterTypeInfoCatalog;
    selectedIds: string[];
    detailTags: CharacterTypeInfoUnitTag[];
    children: ReactNode;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const [activeTab, setActiveTab] = useState<CharacterTypeInfoTab>("basic");
    const [isOpen, setIsOpen] = useState(false);
    const id = useId();
    const currentTab = catalog.tabs.find((tab) => tab.id === activeTab) ?? catalog.tabs[0];
    useBodyScrollLock(isOpen);
    useLayoutEffect(() => {
        if (isOpen)
            panelRef.current?.scrollTo({ top: 0, behavior: "instant" });
    }, [activeTab, isOpen]);
    function open(tab: CharacterTypeInfoTab) {
        setActiveTab(tab);
        setIsOpen(true);
        dialogRef.current?.showModal();
    }
    function selectTab(index: number) {
        setActiveTab(catalog.tabs[index].id);
        tabRefs.current[index]?.focus();
    }
    return (<TypeInfoContext.Provider value={open}>
      {children}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={`${id}-title`} onClose={() => setIsOpen(false)} onClick={(event) => {
            if (event.target !== event.currentTarget)
                return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right ||
                event.clientY < bounds.top || event.clientY > bounds.bottom) {
                dialogRef.current?.close();
            }
        }}>
        <div className={styles.header}>
          <h2 id={`${id}-title`}>{catalog.title}</h2>
          <button type="button" className={styles.close} aria-label="역할군 정보 닫기" onClick={() => dialogRef.current?.close()}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d="m5 5 14 14M19 5 5 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.tabs} role="tablist" aria-label={catalog.title}>
          {catalog.tabs.map((tab, index) => (<button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${tab.id}`} aria-selected={tab.id === activeTab} aria-controls={tab.id === activeTab ? `${id}-panel-${tab.id}` : undefined} tabIndex={tab.id === activeTab ? 0 : -1} className={styles.tab} onClick={() => selectTab(index)} onKeyDown={(event) => {
                let nextIndex: number;
                if (event.key === "ArrowRight")
                    nextIndex = (index + 1) % catalog.tabs.length;
                else if (event.key === "ArrowLeft")
                    nextIndex = (index + catalog.tabs.length - 1) % catalog.tabs.length;
                else if (event.key === "Home")
                    nextIndex = 0;
                else if (event.key === "End")
                    nextIndex = catalog.tabs.length - 1;
                else
                    return;
                event.preventDefault();
                selectTab(nextIndex);
            }}>
              {tab.label}
            </button>))}
        </div>
        <div ref={panelRef} role="tabpanel" id={`${id}-panel-${currentTab.id}`} aria-labelledby={`${id}-tab-${currentTab.id}`} tabIndex={0} className={styles.content}>
          {currentTab.sections.map((section) => (<section key={section.id} className={styles.section} aria-labelledby={`${id}-section-${section.id}`}>
              <h3 id={`${id}-section-${section.id}`}><span aria-hidden="true">▸</span> {section.title}</h3>
              <ul className={styles.cards} data-section={section.id}>
                {section.items.map((item) => {
                const selected = selectedIds.includes(item.id);
                return (<li key={item.id} className={styles.card} data-selected={selected} data-info-id={item.id}>
                      {item.iconPath ? (<Image src={deploymentUrl(item.iconPath)} alt="" width={64} height={64} className={styles.icon}/>) : null}
                      <h4>{item.label}{selected ? <span className="sr-only"> (현재 사원 해당)</span> : null}</h4>
                      <p>{item.description}</p>
                    </li>);
            })}
              </ul>
            </section>))}
          {currentTab.id === "tag" && detailTags.length > 0 ? (<section className={styles.section} aria-labelledby={`${id}-detail-tags`}>
              <h3 id={`${id}-detail-tags`}><span aria-hidden="true">▸</span> {catalog.detailTagsTitle}</h3>
              <ul className={styles.detailTags}>
                {detailTags.map((tag) => <li key={tag.id}>{tag.label}</li>)}
              </ul>
            </section>) : null}
        </div>
      </dialog>
    </TypeInfoContext.Provider>);
}
