import type { ReactNode } from "react";
type DetailSectionTitleProps = {
    id?: string;
    title: ReactNode;
    number?: number;
    className?: string;
};
type DetailSectionProps = DetailSectionTitleProps & {
    id: string;
    children: ReactNode;
};
export function DetailSectionTitle({ id, title, number, className = "", }: DetailSectionTitleProps) {
    return (<h2 id={id} className={`border-b border-[#343844] pb-3 text-2xl font-bold text-[#cfd4dc] ${className}`.trim()}>
      {number !== undefined ? (<span className="mr-2 text-[#9ca3af]">{number}.</span>) : null}
      {title}
    </h2>);
}
export default function DetailSection({ id, title, number, children, className = "", }: DetailSectionProps) {
    return (<section id={id} aria-labelledby={`${id}-heading`} className={`min-w-0 scroll-mt-24 ${className}`.trim()}>
      <DetailSectionTitle id={`${id}-heading`} title={title} number={number}/>
      {children}
    </section>);
}
