import type { Metadata } from "next";
import Index from "@/views/Index";

export const metadata: Metadata = {
  title: "Plan your next adventure",
  description:
    "Discover, plan, and share trips with Vibe Trip—group travel with AI itineraries.",
};

export default function HomePage() {
  return <Index />;
}
