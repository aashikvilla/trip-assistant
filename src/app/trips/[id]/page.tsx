import type { Metadata } from "next";
import TripDetail from "@/views/TripDetail";

export const metadata: Metadata = {
  title: "Trip",
  description: "Trip details, itinerary, and group chat.",
};

export default function TripDetailPage() {
  return <TripDetail />;
}
