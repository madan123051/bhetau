import { AdminDashboard } from "@/features/moderation/admin-dashboard";

export default function AdminPage() {
  const allowed = process.env.NODE_ENV !== "production" || process.env.BHETAU_ADMIN_DEMO === "true";
  if (!allowed) return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div><h1 className="text-3xl font-semibold">Admin access required</h1><p className="mt-3 text-sm text-stone">Production access must be granted by a trusted server-side role.</p></div></main>;
  return <AdminDashboard/>;
}
