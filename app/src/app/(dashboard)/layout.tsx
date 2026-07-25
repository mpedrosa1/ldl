import { Sidebar } from "@/components/Sidebar";
import { BG, FONT_FAMILY, TEXT } from "@/lib/theme";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: BG,
        color: TEXT,
        fontFamily: FONT_FAMILY,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Sidebar />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 40px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}
