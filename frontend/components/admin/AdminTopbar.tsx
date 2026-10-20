"use client";

type AdminTopbarProps = {
  onMenuClick: () => void;
};

export default function AdminTopbar({
  onMenuClick,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/[0.08] bg-[#080B10]/95 px-4 backdrop-blur-md sm:px-6 lg:px-9">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-white/10 text-slate-300 hover:border-[#55DFFF]/40 hover:text-[#55DFFF] lg:hidden"
        >
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
          <span className="h-px w-4 bg-current" />
        </button>

        <div>
          <p className="text-sm font-medium text-[#E8EDF4]">
            Administration
          </p>
          <p className="mt-1 text-xs text-slate-500">
            TechXetra event management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-slate-500 sm:block">
          UI preview · Mock data
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#55DFFF]/25 bg-[#55DFFF]/10 text-sm font-medium text-[#55DFFF]">
          A
        </div>
      </div>
    </header>
  );
}