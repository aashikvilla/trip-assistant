import type { Metadata } from "next";
import Settings from "@/views/Settings";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account and travel preferences.",
};

export default function SettingsPage() {
  return <Settings />;
}
