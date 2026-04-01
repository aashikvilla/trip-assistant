-- Trip Real-time Chat System Migration
-- This replaces the discussion feed with a real-time chat system

-- Drop existing discussion tables if they exist
DROP TABLE IF EXISTS trip_comment_reactions CASCADE;
DROP TABLE IF EXISTS trip_post_comments CASCADE;
DROP TABLE IF EXISTS trip_post_reactions CASCADE;
DROP TABLE IF EXISTS trip_posts CASCADE;
DROP TABLE IF EXISTS trip_messages CASCADE;
DROP TABLE IF EXISTS trip_message_reactions CASCADE;
DROP TABLE IF EXISTS trip_polls CASCADE;
DROP TABLE IF EXISTS trip_poll_votes CASCADE;
DROP TABLE IF EXISTS trip_typing_indicators CASCADE;

-- Trip Messages Table (main chat messages)
CREATE TABLE trip_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'poll', 'system')),
    reply_to_id UUID REFERENCES trip_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions Table
CREATE TABLE trip_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES trip_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'thumbs_up', 'thumbs_down', 'fire', 'party')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction_type)
);

-- Trip Polls Table
CREATE TABLE trip_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES trip_messages(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    poll_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (poll_type IN ('multiple_choice', 'yes_no', 'rating')),
    options JSONB NOT NULL DEFAULT '[]', -- Array of poll options
    settings JSONB DEFAULT '{"multiple_votes": false, "anonymous": false}',
    expires_at TIMESTAMPTZ,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll Votes Table
CREATE TABLE trip_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES trip_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL, -- Index of the selected option
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- For rating polls
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id, option_index) -- Allow multiple votes if settings allow
);

-- Typing Indicators Table (for real-time typing status)
CREATE TABLE trip_typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id)
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_trip_messages_trip_id;
DROP INDEX IF EXISTS idx_trip_messages_created_at;
DROP INDEX IF EXISTS idx_trip_messages_author_id;
DROP INDEX IF EXISTS idx_trip_message_reactions_message_id;
DROP INDEX IF EXISTS idx_trip_polls_message_id;
DROP INDEX IF EXISTS idx_trip_poll_votes_poll_id;
DROP INDEX IF EXISTS idx_trip_typing_indicators_trip_id;

-- Create indexes for performance
CREATE INDEX idx_trip_messages_trip_id ON trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON trip_messages(created_at DESC);
CREATE INDEX idx_trip_messages_author_id ON trip_messages(author_id);
CREATE INDEX idx_trip_message_reactions_message_id ON trip_message_reactions(message_id);
CREATE INDEX idx_trip_polls_message_id ON trip_polls(message_id);
CREATE INDEX idx_trip_poll_votes_poll_id ON trip_poll_votes(poll_id);
CREATE INDEX idx_trip_typing_indicators_trip_id ON trip_typing_indicators(trip_id);

-- Enable Row Level Security
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trip members can view messages" ON trip_messages;
DROP POLICY IF EXISTS "Trip members can insert messages" ON trip_messages;
DROP POLICY IF EXISTS "Authors can update their messages" ON trip_messages;
DROP POLICY IF EXISTS "Authors can delete their messages" ON trip_messages;
DROP POLICY IF EXISTS "Trip members can view reactions" ON trip_message_reactions;
DROP POLICY IF EXISTS "Trip members can manage their reactions" ON trip_message_reactions;
DROP POLICY IF EXISTS "Trip members can view polls" ON trip_polls;
DROP POLICY IF EXISTS "Trip members can create polls" ON trip_polls;
DROP POLICY IF EXISTS "Trip members can view poll votes" ON trip_poll_votes;
DROP POLICY IF EXISTS "Trip members can manage their votes" ON trip_poll_votes;
DROP POLICY IF EXISTS "Trip members can view typing indicators" ON trip_typing_indicators;
DROP POLICY IF EXISTS "Trip members can manage their typing status" ON trip_typing_indicators;

-- RLS Policies for trip_messages
CREATE POLICY "Trip members can view messages" ON trip_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_messages.trip_id 
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Trip members can insert messages" ON trip_messages
    FOR INSERT WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_messages.trip_id 
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Authors can update their messages" ON trip_messages
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their messages" ON trip_messages
    FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for trip_message_reactions
CREATE POLICY "Trip members can view reactions" ON trip_message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_messages tm
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tm.id = trip_message_reactions.message_id 
            AND tmem.profile_id = auth.uid()
        )
    );

CREATE POLICY "Trip members can manage their reactions" ON trip_message_reactions
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM trip_messages tm
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tm.id = trip_message_reactions.message_id 
            AND tmem.profile_id = auth.uid()
        )
    );

-- RLS Policies for trip_polls
CREATE POLICY "Trip members can view polls" ON trip_polls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_messages tm
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tm.id = trip_polls.message_id 
            AND tmem.profile_id = auth.uid()
        )
    );

CREATE POLICY "Trip members can create polls" ON trip_polls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trip_messages tm
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tm.id = trip_polls.message_id 
            AND tmem.profile_id = auth.uid()
            AND tm.author_id = auth.uid()
        )
    );

-- RLS Policies for trip_poll_votes
CREATE POLICY "Trip members can view poll votes" ON trip_poll_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_polls tp
            JOIN trip_messages tm ON tp.message_id = tm.id
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tp.id = trip_poll_votes.poll_id 
            AND tmem.profile_id = auth.uid()
        )
    );

CREATE POLICY "Trip members can manage their votes" ON trip_poll_votes
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM trip_polls tp
            JOIN trip_messages tm ON tp.message_id = tm.id
            JOIN trip_members tmem ON tm.trip_id = tmem.trip_id
            WHERE tp.id = trip_poll_votes.poll_id 
            AND tmem.profile_id = auth.uid()
        )
    );

-- RLS Policies for trip_typing_indicators
CREATE POLICY "Trip members can view typing indicators" ON trip_typing_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_typing_indicators.trip_id 
            AND profile_id = auth.uid()
        )
    );

CREATE POLICY "Trip members can manage their typing status" ON trip_typing_indicators
    FOR ALL USING (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_typing_indicators.trip_id 
            AND profile_id = auth.uid()
        )
    );

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_trip_chat_messages(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_typing_indicator(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS cleanup_typing_indicators();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Function to get trip chat messages with reactions and author info
CREATE OR REPLACE FUNCTION get_trip_chat_messages(p_trip_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
    message_id UUID,
    content TEXT,
    message_type VARCHAR,
    reply_to_id UUID,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    reactions JSONB,
    poll_data JSONB
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id as message_id,
        tm.content,
        tm.message_type,
        tm.reply_to_id,
        tm.is_edited,
        tm.created_at,
        tm.updated_at,
        tm.author_id,
        COALESCE(p.first_name || ' ' || p.last_name, 'Anonymous') as author_name,
        p.avatar_url as author_avatar,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'reaction_type', tmr.reaction_type,
                        'count', reaction_counts.count,
                        'users', reaction_counts.users,
                        'user_reacted', CASE WHEN user_reactions.reaction_type IS NOT NULL THEN true ELSE false END
                    )
                )
                FROM (
                    SELECT 
                        reaction_type,
                        COUNT(*) as count,
                        jsonb_agg(
                            jsonb_build_object(
                                'user_id', user_id,
                                'user_name', COALESCE(rp.first_name || ' ' || rp.last_name, 'Anonymous')
                            )
                        ) as users
                    FROM trip_message_reactions tmr2
                    LEFT JOIN profiles rp ON tmr2.user_id = rp.id
                    WHERE tmr2.message_id = tm.id
                    GROUP BY reaction_type
                ) reaction_counts
                LEFT JOIN trip_message_reactions tmr ON tmr.message_id = tm.id AND tmr.reaction_type = reaction_counts.reaction_type
                LEFT JOIN trip_message_reactions user_reactions ON user_reactions.message_id = tm.id 
                    AND user_reactions.user_id = auth.uid() 
                    AND user_reactions.reaction_type = reaction_counts.reaction_type
                GROUP BY tmr.reaction_type, reaction_counts.count, reaction_counts.users, user_reactions.reaction_type
            ),
            '[]'::jsonb
        ) as reactions,
        CASE 
            WHEN tm.message_type = 'poll' THEN
                (
                    SELECT jsonb_build_object(
                        'poll_id', tp.id,
                        'question', tp.question,
                        'poll_type', tp.poll_type,
                        'options', tp.options,
                        'settings', tp.settings,
                        'expires_at', tp.expires_at,
                        'is_closed', tp.is_closed,
                        'votes', COALESCE(
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'option_index', tpv.option_index,
                                        'rating', tpv.rating,
                                        'user_id', tpv.user_id,
                                        'user_name', COALESCE(vp.first_name || ' ' || vp.last_name, 'Anonymous')
                                    )
                                )
                                FROM trip_poll_votes tpv
                                LEFT JOIN profiles vp ON tpv.user_id = vp.id
                                WHERE tpv.poll_id = tp.id
                            ),
                            '[]'::jsonb
                        )
                    )
                    FROM trip_polls tp
                    WHERE tp.message_id = tm.id
                )
            ELSE NULL
        END as poll_data
    FROM trip_messages tm
    LEFT JOIN profiles p ON tm.author_id = p.id
    WHERE tm.trip_id = p_trip_id 
        AND tm.is_deleted = FALSE
    ORDER BY tm.created_at ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to update typing indicator
CREATE OR REPLACE FUNCTION update_typing_indicator(p_trip_id UUID, p_is_typing BOOLEAN DEFAULT TRUE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO trip_typing_indicators (trip_id, user_id, is_typing, last_activity)
    VALUES (p_trip_id, auth.uid(), p_is_typing, NOW())
    ON CONFLICT (trip_id, user_id)
    DO UPDATE SET 
        is_typing = p_is_typing,
        last_activity = NOW();
END;
$$;

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM trip_typing_indicators 
    WHERE last_activity < NOW() - INTERVAL '30 seconds';
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_trip_messages_updated_at ON trip_messages;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_messages_updated_at 
    BEFORE UPDATE ON trip_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for all chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE trip_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_typing_indicators;
