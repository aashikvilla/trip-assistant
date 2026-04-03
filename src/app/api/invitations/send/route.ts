import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, tripId, role = 'viewer', invitedBy } = body as {
    email?: string;
    tripId?: string;
    role?: string;
    invitedBy?: string;
  };

  if (!email || !tripId || !invitedBy) {
    return NextResponse.json({ error: 'Missing email, tripId, or invitedBy' }, { status: 400 });
  }

  // Verify inviter is a member with owner/editor role
  const { data: inviterMember } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('profile_id', invitedBy)
    .eq('invitation_status', 'accepted')
    .single();

  if (!inviterMember || !['owner', 'editor'].includes(inviterMember.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check if user with this email already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  // Check if already a member
  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('profile_id', existingProfile.id)
      .eq('invitation_status', 'accepted')
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this trip' }, { status: 409 });
    }
  }

  // Check for existing pending invitation for this email + trip
  const { data: existingInvite } = await supabase
    .from('trip_invitations')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 });
  }

  // Generate invitation code and token
  const { data: code } = await supabase.rpc('generate_invitation_code');
  const token = crypto.randomUUID();

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('trip_invitations')
    .insert({
      trip_id: tripId,
      invited_by: invitedBy,
      email: email.toLowerCase().trim(),
      invitation_code: code,
      invitation_token: token,
      role: role,
    })
    .select()
    .single();

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  // Get trip details for the notification
  const { data: trip } = await supabase
    .from('trips')
    .select('name')
    .eq('id', tripId)
    .single();

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', invitedBy)
    .single();

  const inviterName = inviterProfile
    ? `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
    : 'Someone';

  // If user exists in the system, create an in-app notification
  if (existingProfile) {
    await supabase.from('trip_notifications').insert({
      trip_id: tripId,
      user_id: existingProfile.id,
      type: 'trip_invitation',
      message: `${inviterName} invited you to join "${trip?.name || 'a trip'}"`,
      link: `/invite/${token}`,
    }).then(() => {});
  }

  const inviteLink = `${req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${token}`;

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      token,
      code,
      link: inviteLink,
      userExists: !!existingProfile,
    },
  });
}
