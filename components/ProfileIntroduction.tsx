import type { ReactNode } from "react";
type ProfileIntroductionProps = {
    text: string;
    children?: ReactNode;
};
export default function ProfileIntroduction({ text, children, }: ProfileIntroductionProps) {
    return (<div className="min-h-32 border-b border-[#343844] py-5 text-base leading-7 text-[#9ca3af]">
      <div className="flex flex-col gap-5">
        {children}
        {text ? (<blockquote className="min-w-0 border-l-4 border-white bg-[#171a21]/70 px-5 py-4 text-[#d1d5db] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <p className="whitespace-pre-line">{text}</p>
          </blockquote>) : null}
      </div>
    </div>);
}
