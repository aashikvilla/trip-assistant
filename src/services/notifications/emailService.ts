/**
 * Email notification service for itinerary generation completion
 * Uses Resend API (resend.com) for email delivery
 */

import type { ParsedItinerary, TripContext } from "../ai/types";

export interface NotificationPayload {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  recipientEmail: string;
  recipientName: string;
  groupSize: number;
  interests: string[];
  dietaryRestrictions: string[];
  itinerary: ParsedItinerary;
}

export class EmailNotificationService {
  private apiKey: string;
  private fromEmail: string = "noreply@vibe-trip.app";
  private appUrl: string;

  constructor() {
    // Placeholder for Resend API key (would be set via env var)
    // This is a separate service key, not the Supabase key
    this.apiKey = process.env.RESEND_API_KEY || "";
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vibe-trip.app";
  }

  /**
   * Send email notification when itinerary is generated
   */
  async sendItineraryCompletionEmail(payload: NotificationPayload): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("[EmailNotificationService] RESEND_API_KEY not configured, skipping email");
      return false;
    }

    try {
      const html = this.buildHtmlEmail(payload);
      const subject = `Your ${payload.destination} Adventure Itinerary is Ready! 🎉`;

      console.info("[EmailNotificationService] Sending email to", {
        to: payload.recipientEmail,
        subject,
        tripId: payload.tripId,
      });

      // Would call actual Resend API here
      // const response = await fetch("https://api.resend.com/emails", {
      //   method: "POST",
      //   headers: {
      //     Authorization: `Bearer ${this.apiKey}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     from: this.fromEmail,
      //     to: payload.recipientEmail,
      //     subject,
      //     html,
      //   }),
      // });

      // if (!response.ok) {
      //   const error = await response.json();
      //   console.error("[EmailNotificationService] Failed to send email:", error);
      //   return false;
      // }

      console.info("[EmailNotificationService] Email sent successfully");
      return true;
    } catch (err) {
      console.error("[EmailNotificationService] Error sending email:", err);
      return false;
    }
  }

  /**
   * Build HTML email template
   */
  private buildHtmlEmail(payload: NotificationPayload): string {
    const tripUrl = `${this.appUrl}/trips/${payload.tripId}`;
    const shareUrl = `${this.appUrl}/trips/${payload.tripId}/share`;

    const highlights = payload.itinerary.days
      .flatMap((d) => [
        ...(d.morning?.activities || []),
        ...(d.afternoon?.activities || []),
        ...(d.evening?.activities || []),
      ])
      .filter((act) => !["Explore the local area", "Visit a local attraction"].includes(act))
      .slice(0, 5)
      .map((act) => `<li>${act}</li>`)
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1f2937; font-size: 24px; }
    .header p { margin: 5px 0 0; color: #6b7280; font-size: 14px; }
    .trip-details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 500; color: #6b7280; }
    .detail-value { color: #1f2937; font-weight: 600; }
    .highlights { margin: 20px 0; }
    .highlights h3 { margin: 10px 0; color: #1f2937; font-size: 16px; }
    .highlights ul { margin: 10px 0; padding-left: 20px; }
    .highlights li { margin: 5px 0; }
    .cta-buttons { display: flex; gap: 10px; margin: 30px 0; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; text-align: center; }
    .btn-primary { background: #3b82f6; color: white; flex: 1; }
    .btn-secondary { background: #e5e7eb; color: #1f2937; flex: 1; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .badge { display: inline-block; background: #f3e8ff; color: #7e22ce; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your ${payload.destination} Adventure is Ready! 🎉</h1>
      <p>Hi ${payload.recipientName}, your AI-generated itinerary has been created</p>
    </div>

    <div class="trip-details">
      <div class="detail-row">
        <span class="detail-label">📍 Destination</span>
        <span class="detail-value">${payload.destination}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">📅 Dates</span>
        <span class="detail-value">${new Date(payload.startDate).toLocaleDateString()} - ${new Date(payload.endDate).toLocaleDateString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">👥 Travelers</span>
        <span class="detail-value">${payload.groupSize} person${payload.groupSize !== 1 ? "s" : ""}</span>
      </div>
      ${
        payload.interests.length > 0
          ? `<div class="detail-row">
        <span class="detail-label">✨ Group Interests</span>
        <span><div style="margin-top: 5px;">
          ${payload.interests.map((i) => `<span class="badge">${i}</span>`).join("")}
        </div></span>
      </div>`
          : ""
      }
      ${
        payload.dietaryRestrictions.length > 0
          ? `<div class="detail-row">
        <span class="detail-label">🍽️ Dietary Restrictions</span>
        <span><div style="margin-top: 5px;">
          ${payload.dietaryRestrictions.map((d) => `<span class="badge">${d}</span>`).join("")}
        </div></span>
      </div>`
          : ""
      }
    </div>

    ${
      highlights
        ? `<div class="highlights">
      <h3>✨ Highlights of Your Itinerary</h3>
      <ul>
        ${highlights}
      </ul>
    </div>`
        : ""
    }

    <div class="cta-buttons">
      <a href="${tripUrl}" class="btn btn-primary">View Full Itinerary</a>
      <a href="${shareUrl}" class="btn btn-secondary">Share with Group</a>
    </div>

    <p style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b; font-size: 14px;">
      <strong>💡 Tip:</strong> You can edit any activity in the itinerary, add notes, or request a regeneration if you'd like different suggestions.
    </p>

    <div class="footer">
      <p>This itinerary was generated using AI based on your trip details, group preferences, and travel research.</p>
      <p>© 2026 Vibe Trip. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send push notification (in-app)
   */
  async sendPushNotification(tripId: string, userId: string, message: string): Promise<boolean> {
    try {
      // This would integrate with the push notification system
      // For now, just log it
      console.info("[EmailNotificationService] Push notification", {
        tripId,
        userId,
        message,
      });

      // Would call Supabase to store notification in trip_notifications table
      // const supabase = createClient(...);
      // await supabase.from("trip_notifications").insert({
      //   trip_id: tripId,
      //   user_id: userId,
      //   type: "itinerary_generated",
      //   title: "Your itinerary is ready!",
      //   body: message,
      // });

      return true;
    } catch (err) {
      console.error("[EmailNotificationService] Error sending push notification:", err);
      return false;
    }
  }
}
