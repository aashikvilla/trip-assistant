import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

function initVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:hello@vibetrip.app", pub, priv);
  return true;
}

export async function POST(req: NextRequest) {
  if (!initVapid()) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }
  const body = await req.json();
  const { subscription, payload } = body as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    payload: { title: string; body: string; data?: Record<string, unknown> };
  };

  if (!subscription?.endpoint || !payload) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload)
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
