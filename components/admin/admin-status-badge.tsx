const variants: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700", Successful: "bg-emerald-50 text-emerald-700", Connected: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700", Trial: "bg-amber-50 text-amber-700", "Past due": "bg-amber-50 text-amber-700",
  Suspended: "bg-red-50 text-red-700", Failed: "bg-red-50 text-red-700", Cancelled: "bg-red-50 text-red-700", Refunded: "bg-red-50 text-red-700",
};

export function AdminStatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${variants[status] ?? "bg-sunken text-muted"}`}>{status}</span>;
}
