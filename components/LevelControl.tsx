"use client";
type LevelControlProps = {
    value: number;
    min: number;
    max: number;
    onChange: (value: string) => void;
    ariaLabel: string;
    label?: string;
    className?: string;
    variant?: "default" | "character";
};
export default function LevelControl({ value, min, max, onChange, ariaLabel, label = "레벨 기준", className = "", variant = "default", }: LevelControlProps) {
    const inputAppearance = variant === "character"
        ? "h-10 border-[#4b5563] bg-[#111318]"
        : "h-9 border-[#4b5160] bg-[#0b0d12]";
    return (<label className={`flex w-fit shrink-0 items-center gap-2 text-sm font-bold text-[#9ca3af] ${className}`.trim()}>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} className={`w-20 border px-2 text-center font-black text-white outline-none transition focus:border-[#9ca3af] ${inputAppearance}`} aria-label={ariaLabel}/>
      {label}
    </label>);
}
