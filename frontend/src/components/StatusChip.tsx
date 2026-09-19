import { STATUS_STYLE, type ElementStatus } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

/** Accessible status chip: color + icon + text label (not color alone). */
export function StatusChip({ status }: { status: ElementStatus }) {
  const s = STATUS_STYLE[status];
  const iconName =
    status === "UTUH"
      ? "check-circle"
      : status === "TERHALANG"
      ? "warning"
      : status === "TIDAK_STANDAR"
      ? "alert-circle"
      : status === "TIDAK_ADA"
      ? "x-circle"
      : "help-circle";

  return (
    <span
      className="status-chip inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ borderColor: s.color, color: s.color }}
      data-status={status}
    >
      <Icon name={iconName} size={12} />
      <span>{s.label}</span>
    </span>
  );
}
