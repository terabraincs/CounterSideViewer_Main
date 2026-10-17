import type { ReactNode } from "react";
type SkillCardProps = {
    icon: ReactNode;
    children: ReactNode;
    className?: string;
};
export default function SkillCard({ icon, children, className = "", }: SkillCardProps) {
    return (<article className={`grid overflow-hidden border border-[#343844] bg-[#171a21] ${icon ? "sm:grid-cols-[120px_minmax(0,1fr)]" : ""} ${className}`.trim()}>
      {icon ? (<div className="flex items-start justify-center border-b border-[#343844] bg-[#111318] p-4 sm:border-b-0 sm:border-r">
          {icon}
        </div>) : null}
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </article>);
}
