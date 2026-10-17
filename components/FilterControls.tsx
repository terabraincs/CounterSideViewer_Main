import type { ButtonHTMLAttributes, ReactNode } from "react";
type FilterOptionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "aria-pressed"> & {
    selected: boolean;
};
export function FilterOptionButton({ selected, children, ...props }: FilterOptionButtonProps) {
    const className = [
        "min-h-11 border px-3 py-2 text-sm font-bold transition",
        "focus:outline-none focus:ring-2 focus:ring-[#9ca3af]",
        selected
            ? "border-white bg-white text-[#111318] shadow-[0_0_14px_rgba(255,255,255,0.22)]"
            : "border-[#4b5563] bg-black/35 text-[#9ca3af] hover:border-white hover:text-white",
    ].join(" ");
    return (<button type="button" {...props} aria-pressed={selected} className={className}>
      {children}
    </button>);
}
export function FilterSectionHeading({ children }: {
    children: ReactNode;
}) {
    return (<h3 className="mb-3 flex items-center gap-2 text-base font-black text-[#e5e7eb]">
      <span className="h-4 w-[5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.75)]"/>
      {children}
    </h3>);
}
