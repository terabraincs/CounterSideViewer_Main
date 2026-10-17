"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./SpineNameSelect.module.css";
type NameOption = {
    value: string;
    label: string;
    originalName?: string | null;
    disabled?: boolean;
};
type Props = {
    label: string;
    value: string;
    options: NameOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
    fitContent?: boolean;
    className?: string;
    emptyLabel?: string;
    testId: string;
};
function OptionName({ option }: {
    option: NameOption;
}) {
    return (<span className={styles.name}>
      <span className={styles.localizedName}>{option.label}</span>
      {option.originalName !== null ? (<small className={styles.originalName}>({option.originalName ?? option.value})</small>) : null}
      {option.disabled ? <small className={styles.originalName}> (자료 없음)</small> : null}
    </span>);
}
export default function SpineNameSelect({ label, value, options, onChange, disabled = false, fitContent = false, className = "", emptyLabel = "없음", testId, }: Props) {
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const openedTopRef = useRef(0);
    const searchRef = useRef({ text: "", time: 0 });
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [placement, setPlacement] = useState({ above: true, maxHeight: 280 });
    const selectedIndex = options.findIndex((option) => option.value === value);
    const selected = options[selectedIndex];
    const isDisabled = disabled || options.every((option) => option.disabled);
    const isOpen = open && !isDisabled;
    function openMenu(index = Math.max(0, selectedIndex)) {
        if (isDisabled)
            return;
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
            openedTopRef.current = rect.top;
            const headerBottom = document.querySelector("body header")?.getBoundingClientRect().bottom ?? 0;
            const above = Math.max(0, rect.top - Math.max(12, headerBottom + 8) - 6);
            const below = Math.max(0, window.innerHeight - rect.bottom - 18);
            const showAbove = above >= Math.min(280, options.length * 40) || above > below;
            setPlacement({ above: showAbove, maxHeight: Math.max(40, Math.min(280, showAbove ? above : below)) });
        }
        setActiveIndex(options[index]?.disabled ? options.findIndex((option) => !option.disabled) : index);
        setOpen(true);
    }
    function choose(index: number, focus = true) {
        const option = options[index];
        if (!option || option.disabled)
            return;
        onChange(option.value);
        setOpen(false);
        if (focus)
            buttonRef.current?.focus({ preventScroll: true });
    }
    useEffect(() => {
        if (!isOpen)
            return;
        const closeOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target))
                setOpen(false);
        };
        const closeOnScroll = (event: Event) => {
            if (event.target instanceof Node && rootRef.current?.contains(event.target))
                return;
            const top = buttonRef.current?.getBoundingClientRect().top;
            // Focus can queue a scroll event before the menu opens; its position is already accounted for.
            if (top === undefined || Math.abs(top - openedTopRef.current) > 1)
                setOpen(false);
        };
        const close = () => setOpen(false);
        document.addEventListener("pointerdown", closeOutside);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", closeOnScroll, true);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", closeOnScroll, true);
        };
    }, [isOpen]);
    useEffect(() => {
        if (!isOpen)
            return;
        const list = listRef.current;
        const option = list?.children[activeIndex] as HTMLElement | undefined;
        if (!list || !option)
            return;
        if (option.offsetTop < list.scrollTop)
            list.scrollTop = option.offsetTop;
        else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
        }
    }, [activeIndex, isOpen]);
    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (isDisabled)
            return;
        if (event.key === "Escape") {
            if (isOpen)
                event.preventDefault();
            setOpen(false);
            return;
        }
        if (event.key === "Tab") {
            if (isOpen)
                choose(activeIndex, false);
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isOpen)
                choose(activeIndex);
            else
                openMenu();
            return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const direction = event.key === "Home" || event.key === "ArrowDown" ? 1 : -1;
            let index = event.key === "Home" ? 0
                : event.key === "End" ? options.length - 1
                    : !isOpen ? Math.max(0, selectedIndex) : activeIndex + direction;
            while (index >= 0 && index < options.length && options[index].disabled)
                index += direction;
            if (index < 0 || index >= options.length)
                index = activeIndex;
            if (isOpen)
                setActiveIndex(index);
            else
                openMenu(index);
            return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            const now = Date.now();
            const text = (now - searchRef.current.time < 750 ? searchRef.current.text : "") + event.key.toLowerCase();
            searchRef.current = { text, time: now };
            const query = [...text].every((character) => character === text[0]) ? text[0] : text;
            const start = isOpen ? activeIndex : selectedIndex;
            for (let step = 1; step <= options.length; step++) {
                const index = (start + step + options.length) % options.length;
                const option = options[index];
                if (!option.disabled && (option.label.toLowerCase().startsWith(query) || option.value.toLowerCase().startsWith(query))) {
                    if (isOpen)
                        setActiveIndex(index);
                    else
                        openMenu(index);
                    break;
                }
            }
        }
    }
    return (<div ref={rootRef} className={`${styles.field} ${fitContent ? styles.fitContent : ""} ${className}`} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
                setOpen(false);
        }}>
      <label id={`${id}-label`} htmlFor={`${id}-button`} className={styles.label}>{label}</label>
      <div className={styles.control}>
        {fitContent ? (<div className={styles.optionSizer} aria-hidden="true">
            <span>{emptyLabel}</span>
            {options.map((option) => <OptionName key={option.value} option={option}/>)}
          </div>) : null}
        <button ref={buttonRef} id={`${id}-button`} type="button" role="combobox" aria-labelledby={`${id}-label`} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={isOpen ? `${id}-list` : undefined} aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined} className={styles.trigger} disabled={isDisabled} data-testid={testId} data-value={value} title={selected ? `${selected.label}${selected.originalName !== null ? `(${selected.originalName ?? selected.value})` : ""}` : emptyLabel} onClick={() => isOpen ? setOpen(false) : openMenu()} onKeyDown={onKeyDown}>
          {selected ? <OptionName option={selected}/> : <span>{emptyLabel}</span>}
          <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
        {isOpen ? (<div ref={listRef} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className={styles.list} data-above={placement.above} style={{ maxHeight: placement.maxHeight }}>
            {options.map((option, index) => (<button key={option.value} id={`${id}-option-${index}`} type="button" role="option" tabIndex={-1} aria-selected={option.value === value} disabled={option.disabled} data-value={option.value} data-active={index === activeIndex} className={styles.option} onMouseDown={(event) => event.preventDefault()} onPointerMove={() => { if (!option.disabled)
                setActiveIndex(index); }} onClick={() => choose(index)}>
                <OptionName option={option}/>
              </button>))}
          </div>) : null}
      </div>
    </div>);
}
