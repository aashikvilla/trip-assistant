import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your trips and travel overview.",
};

export default function DashboardPage() {
  return <Dashboard />;
}
