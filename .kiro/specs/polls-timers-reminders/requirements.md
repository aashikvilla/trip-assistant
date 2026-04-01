# Requirements Document

## Introduction

The Polls, Timers & Reminders feature fixes the broken voting mechanism in the existing poll system and extends it with deadlines, importance flags, non-responder visibility, and automated reminders. The goal is to reduce trip cancellations caused by decision avoidance by making it easy to see who hasn't responded and to nudge them.

## Glossary

- **Poll**: A question posted in TripChat with one or more options that trip members can vote on.
- **Poll_Creator**: The trip member who created a poll.
- **Voter**: A trip member who has submitted a vote on a poll.
- **Non_Responder**: A trip member who has not yet voted on a poll before its deadline.
- **Deadline**: An optional date/time after which a poll is automatically closed.
- **Important_Poll**: A poll flagged as high-priority by the Poll_Creator.
- **Reminder**: An in-app notification sent to Non_Responders about a pending poll.
- **Vote_Store**: The Supabase `trip_poll_votes` table.
- **Poll_Store**: The Supabase `trip_polls` table.
- **Notification_Store**: The Supabase `trip_notifications` table (new).
- **TripChat**: The real-time chat component embedded in the trip detail page.
- **PollComponent**: The React component that renders a poll inside TripChat.
- **CreatePollDialog**: The React dialog used to create a new poll.

---

## Requirements

### Requirement 1: Fix Poll Voting Mechanism

**User Story:** As a trip member, I want my vote to be saved and reflected immediately, so that I can participate in group decisions reliably.

#### Acceptance Criteria

1. WHEN a Voter submits a vote, THE Vote_Store SHALL persist the vote with the correct `poll_id`, `user_id`, `option_index`, and optional `rating` fields.
2. WHEN a vote is persisted, THE PollComponent SHALL display the updated vote count and percentage for each option within 2 seconds via real-time subscription.
3. WHEN a Voter has already voted on a poll, THE PollComponent SHALL display the Voter's selected option as highlighted and disable further voting for that Voter.
4. IF a vote submission fails due to a network or database error, THEN THE PollComponent SHALL display an error message and preserve the Voter's selection so the Voter can retry.
5. WHEN the `get_trip_chat_messages` RPC returns poll data, THE Poll_Store SHALL include the `votes` array with each vote's `user_id`, `option_index`, and `rating`.
6. THE Vote_Store SHALL enforce a unique constraint on `(poll_id, user_id)` to prevent duplicate votes.

---

### Requirement 2: Poll Deadline / Timer

**User Story:** As a Poll_Creator, I want to set a deadline on a poll, so that members know when a decision must be made.

#### Acceptance Criteria

1. WHEN creating a poll, THE CreatePollDialog SHALL provide an optional date-time picker for the Deadline.
2. WHEN a Deadline is set, THE Poll_Store SHALL persist the `expires_at` timestamp in UTC.
3. WHILE a poll has a Deadline set and has not yet closed, THE PollComponent SHALL display a countdown showing days, hours, and minutes remaining.
4. WHEN the current time passes the Deadline, THE Poll_Store SHALL set `is_closed = true` for that poll.
5. WHEN a poll is closed, THE PollComponent SHALL display a "Closed" badge and disable voting for all members.
6. IF a Voter attempts to vote on a closed poll, THEN THE PollComponent SHALL display a message indicating the poll is closed.

---

### Requirement 3: Important Poll Flag

**User Story:** As a Poll_Creator, I want to mark a poll as important, so that members understand this is a high-priority decision that affects the trip.

#### Acceptance Criteria

1. WHEN creating a poll, THE CreatePollDialog SHALL provide a toggle to mark the poll as Important_Poll.
2. WHEN a poll is marked as Important_Poll, THE Poll_Store SHALL persist `is_important = true` on the poll record.
3. WHEN a poll has `is_important = true`, THE PollComponent SHALL display a prominent visual indicator (e.g., a star or "Important" badge) distinguishing it from standard polls.
4. THE Poll_Store SHALL default `is_important` to `false` for all new polls.

---

### Requirement 4: Non-Responder Visibility

**User Story:** As a Poll_Creator, I want to see a list of trip members who haven't voted on an important poll, so that I can identify who to nudge.

#### Acceptance Criteria

1. WHEN a poll has `is_important = true`, THE PollComponent SHALL display a collapsible "Non-Responders" section visible only to the Poll_Creator.
2. THE Non-Responder list SHALL be computed by comparing the trip's member list against the poll's `votes` array, showing members who have not yet voted.
3. WHEN all trip members have voted, THE PollComponent SHALL hide the Non-Responders section and display a "Everyone has responded" message to the Poll_Creator.
4. WHILE a poll is open and has Non_Responders, THE PollComponent SHALL display the count of Non_Responders next to the section header.
5. IF the poll is closed, THEN THE PollComponent SHALL still display the final Non-Responder list to the Poll_Creator for reference.

---

### Requirement 5: Reminder Notifications

**User Story:** As a trip member, I want to receive a reminder when a poll deadline is approaching or has passed and I haven't voted, so that I don't miss important decisions.

#### Acceptance Criteria

1. WHEN a poll's Deadline is 24 hours away and a trip member has not voted, THE Notification_Store SHALL create a reminder notification for that member.
2. WHEN a poll's Deadline passes and a trip member has not voted, THE Notification_Store SHALL create an overdue notification for that member.
3. WHEN a Reminder notification is created, THE notification SHALL include the poll question, trip name, and a direct link to the TripChat message containing the poll.
4. THE Notification_Store SHALL not create duplicate reminders: IF a reminder of the same type already exists for a given `(poll_id, user_id)` pair, THEN THE Notification_Store SHALL skip creation.
5. WHEN a Non_Responder votes after receiving a reminder, THE Notification_Store SHALL mark the corresponding reminder notification as resolved.

---

### Requirement 6: Manual Nudge

**User Story:** As a Poll_Creator, I want to send a manual reminder to all non-responders on an important poll, so that I can prompt them to vote without leaving the app.

#### Acceptance Criteria

1. WHEN a poll has `is_important = true` and has at least one Non_Responder, THE PollComponent SHALL display a "Nudge Non-Responders" button visible only to the Poll_Creator.
2. WHEN the Poll_Creator clicks "Nudge Non-Responders", THE Notification_Store SHALL create a manual reminder notification for each current Non_Responder.
3. WHEN the nudge is sent, THE PollComponent SHALL display a confirmation message to the Poll_Creator indicating how many members were notified.
4. THE Notification_Store SHALL rate-limit manual nudges to one nudge per poll per hour to prevent spam.
5. IF the rate limit is active, THEN THE PollComponent SHALL display the time remaining until the next nudge is allowed.
