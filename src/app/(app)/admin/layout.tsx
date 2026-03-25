export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="admin" className="min-h-screen">
      {children}
    </div>
  );
}
