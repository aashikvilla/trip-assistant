import type { Metadata } from "next";
import JoinTrip from "@/views/JoinTrip";

export const metadata: Metadata = {
  title: "Join trip",
  description: "Accept an invitation to join a trip on Vibe Trip.",
};

export default function InvitePage() {
  return <JoinTrip />;
}
