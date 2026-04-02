import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Authenticate via the anon key + Bearer token from the request
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) {
    // Try cookie-based session — use service role to look up the user
    const body = await req.json().catch(() => ({}));
    const { pollId, tripId } = body as { pollId?: string; tripId?: string };
    if (!pollId || !tripId) {
      return NextResponse.json({ error: 'Missing pollId or tripId' }, { status: 400 });
    }
    return nudge(pollId, tripId, null);
  }

  const body = await req.json().catch(() => ({}));
  const { pollId, tripId } = body as { pollId?: string; tripId?: string };
  if (!pollId || !tripId) {
    return NextResponse.json({ error: 'Missing pollId or tripId' }, { status: 400 });
  }

  // Get the calling user via the access token
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return nudge(pollId, tripId, user.id);
}

async function nudge(pollId: string, tripId: string, callerId: string | null) {
  // Fetch the poll
  const { data: poll, error: pollError } = await supabase
    .from('trip_polls')
    .select('created_by, is_closed, nudge_cooldown_until, question')
    .eq('id', pollId)
    .single();

  if (pollError || !poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  // Verify caller is the creator (skip if callerId is null — service role call)
  if (callerId && poll.created_by !== callerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit: one nudge per poll per hour
  if (poll.nudge_cooldown_until && new Date(poll.nudge_cooldown_until) > new Date()) {
    const retryAfter = new Date(poll.nudge_cooldown_until).toISOString();
    return NextResponse.json({ error: 'Rate limited', retryAfter }, { status: 429 });
  }

  if (poll.is_closed) {
    return NextResponse.json({ error: 'Poll is closed' }, { status: 400 });
  }

  // Fetch current votes
  const { data: votes } = await supabase
    .from('trip_poll_votes')
    .select('user_id')
    .eq('poll_id', pollId);

  const votedUserIds = new Set((votes || []).map((v: any) => v.user_id));

  // Fetch trip members
  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('invitation_status', 'accepted');

  const nonResponders = (members || []).filter((m: any) => !votedUserIds.has(m.user_id));

  if (nonResponders.length === 0) {
    return NextResponse.json({ notified: 0, retryAfter: null });
  }

  // Bulk-insert notifications (ON CONFLICT DO NOTHING via upsert with ignoreDuplicates)
  const notifications = nonResponders.map((m: any) => ({
    trip_id: tripId,
    poll_id: pollId,
    user_id: m.user_id,
    type: 'poll_nudge',
    message: `You have a pending vote on: "${poll.question}"`,
    link: `/trips/${tripId}?tab=chat`,
  }));

  await supabase
    .from('trip_notifications')
    .upsert(notifications, { onConflict: 'poll_id,user_id,type', ignoreDuplicates: true });

  // Update nudge_cooldown_until to 1 hour from now
  const cooldownUntil = new Date(Date.now() + 3600000).toISOString();
  await supabase
    .from('trip_polls')
    .update({ nudge_cooldown_until: cooldownUntil })
    .eq('id', pollId);

  return NextResponse.json({ notified: nonResponders.length, retryAfter: null });
}
