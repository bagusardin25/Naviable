import { STATUS_STYLE, type ElementStatus } from "@/lib/types";

/** Accessible status chip: color + pattern + text label (not color alone). */
export function StatusChip({ status }: { status: ElementStatus }) {
  const s = STATUS_STYLE[status];
  const patternMark =
    s.pattern === "cross"
      ? "✕"
      : s.pattern === "dashed"
        ? "┄"
        : s.pattern === "dotted"
          ? "·"
          : s.pattern === "empty"
            ? "?"
            : "●";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ borderColor: s.color, color: s.color }}
      data-status={status}
    >
      <span aria-hidden="true">{patternMark}</span>
      {s.label}
    </span>
  );
}
