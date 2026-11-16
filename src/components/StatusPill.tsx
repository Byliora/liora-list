import { STATUS_STYLE, type Status } from "@/lib/people";

export function StatusPill({ status }: { status: Status }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Available;
  return (
    <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  );
}
