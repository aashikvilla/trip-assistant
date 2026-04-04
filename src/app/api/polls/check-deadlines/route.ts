import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // External schedulers: X-Cron-Secret header
  const secret = req.headers.get('x-cron-secret');
  if (secret && secret === process.env.CRON_SECRET) return true;
  return false;
}

// GET — called by Vercel Cron Jobs
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runDeadlineCheck();
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runDeadlineCheck();
}

async function runDeadlineCheck() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  const nowIso = now.toISOString();

  // 1. Find open polls expiring within the next 24 hours
  const { data: upcomingPolls } = await supabase
    .from('trip_polls')
    .select('id, question, trip_id:trip_messages!inner(trip_id)')
    .eq('is_closed', false)
    .gt('expires_at', nowIso)
    .lte('expires_at', in24h);

  let notified24h = 0;
  for (const poll of upcomingPolls || []) {
    const tripId = (poll.trip_id as any)?.trip_id;
    if (!tripId) continue;
    const count = await insertNotificationsForNonResponders(
      poll.id,
      tripId,
      poll.question,
      'poll_deadline_24h'
    );
    notified24h += count;
  }

  // 2. Find open polls that have now passed their deadline
  const { data: expiredPolls } = await supabase
    .from('trip_polls')
    .select('id, question, trip_id:trip_messages!inner(trip_id)')
    .eq('is_closed', false)
    .lte('expires_at', nowIso);

  let notifiedOverdue = 0;
  for (const poll of expiredPolls || []) {
    const tripId = (poll.trip_id as any)?.trip_id;
    if (!tripId) continue;

    // Close the poll
    await supabase.from('trip_polls').update({ is_closed: true }).eq('id', poll.id);

    const count = await insertNotificationsForNonResponders(
      poll.id,
      tripId,
      poll.question,
      'poll_overdue'
    );
    notifiedOverdue += count;
  }

  return NextResponse.json({
    closed: (expiredPolls || []).length,
    notified24h,
    notifiedOverdue,
  });
}

async function insertNotificationsForNonResponders(
  pollId: string,
  tripId: string,
  question: string,
  type: 'poll_deadline_24h' | 'poll_overdue'
): Promise<number> {
  const { data: votes } = await supabase
    .from('trip_poll_votes')
    .select('user_id')
    .eq('poll_id', pollId);

  const votedIds = new Set((votes || []).map((v: any) => v.user_id));

  const { data: members } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('invitation_status', 'accepted');

  const nonResponders = (members || []).filter((m: any) => !votedIds.has(m.user_id));
  if (nonResponders.length === 0) return 0;

  const label = type === 'poll_deadline_24h' ? 'closing soon' : 'now closed';
  const notifications = nonResponders.map((m: any) => ({
    trip_id: tripId,
    poll_id: pollId,
    user_id: m.user_id,
    type,
    message: `Poll "${question}" is ${label}. Cast your vote!`,
    link: `/trips/${tripId}?tab=chat`,
  }));

  await supabase
    .from('trip_notifications')
    .upsert(notifications, { onConflict: 'poll_id,user_id,type', ignoreDuplicates: true });

  // Mark previously triggered notifications as resolved when poll is overdue
  if (type === 'poll_overdue') {
    await supabase
      .from('trip_notifications')
      .update({ is_resolved: true })
      .eq('poll_id', pollId)
      .eq('type', 'poll_deadline_24h')
      .in('user_id', nonResponders.map((m: any) => m.user_id));
  }

  return nonResponders.length;
}
