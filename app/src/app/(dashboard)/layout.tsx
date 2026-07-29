import { Sidebar } from "@/components/Sidebar";
import { BG, FONT_FAMILY, TEXT } from "@/lib/theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="ldl-shell"
      style={{ background: BG, color: TEXT, fontFamily: FONT_FAMILY }}
    >
      <Sidebar />
      <div className="ldl-main">{children}</div>
    </div>
  );
}
