import Sidebar02 from "@/components/sidebar-02";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Sidebar02>{children}</Sidebar02>
      {children}
    </div>
  );
}
