-- =====================================================
-- Trip Discussion Feed Implementation
-- Phase 1: Database Schema
-- =====================================================

-- Trip Posts Table
CREATE TABLE IF NOT EXISTS trip_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'link', 'poll')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Trip Post Reactions (Likes/Dislikes)
CREATE TABLE IF NOT EXISTS trip_post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES trip_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- Trip Post Comments (Replies)
CREATE TABLE IF NOT EXISTS trip_post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES trip_posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES trip_post_comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Comment Reactions
CREATE TABLE IF NOT EXISTS trip_comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES trip_post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Optimize feed queries
CREATE INDEX IF NOT EXISTS idx_trip_posts_trip_created ON trip_posts(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_posts_author ON trip_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON trip_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON trip_post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON trip_comment_reactions(comment_id);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE trip_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies: Only trip members can access posts
CREATE POLICY "Trip members can view posts" ON trip_posts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_posts.trip_id 
            AND profile_id = auth.uid()
            AND invitation_status = 'accepted'
        )
    );

CREATE POLICY "Trip members can create posts" ON trip_posts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trip_members 
            WHERE trip_id = trip_posts.trip_id 
            AND profile_id = auth.uid()
            AND invitation_status = 'accepted'
        )
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can update their posts" ON trip_posts
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their posts" ON trip_posts
    FOR DELETE USING (author_id = auth.uid());

-- Post Reactions Policies
CREATE POLICY "Trip members can view post reactions" ON trip_post_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_posts tp
            JOIN trip_members tm ON tp.trip_id = tm.trip_id
            WHERE tp.id = trip_post_reactions.post_id
            AND tm.profile_id = auth.uid()
            AND tm.invitation_status = 'accepted'
        )
    );

CREATE POLICY "Trip members can manage their reactions" ON trip_post_reactions
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Comments Policies
CREATE POLICY "Trip members can view comments" ON trip_post_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_posts tp
            JOIN trip_members tm ON tp.trip_id = tm.trip_id
            WHERE tp.id = trip_post_comments.post_id
            AND tm.profile_id = auth.uid()
            AND tm.invitation_status = 'accepted'
        )
    );

CREATE POLICY "Trip members can create comments" ON trip_post_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trip_posts tp
            JOIN trip_members tm ON tp.trip_id = tm.trip_id
            WHERE tp.id = trip_post_comments.post_id
            AND tm.profile_id = auth.uid()
            AND tm.invitation_status = 'accepted'
        )
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can update their comments" ON trip_post_comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Authors can delete their comments" ON trip_post_comments
    FOR DELETE USING (author_id = auth.uid());

-- Comment Reactions Policies
CREATE POLICY "Trip members can view comment reactions" ON trip_comment_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_post_comments tpc
            JOIN trip_posts tp ON tpc.post_id = tp.id
            JOIN trip_members tm ON tp.trip_id = tm.trip_id
            WHERE tpc.id = trip_comment_reactions.comment_id
            AND tm.profile_id = auth.uid()
            AND tm.invitation_status = 'accepted'
        )
    );

CREATE POLICY "Trip members can manage their comment reactions" ON trip_comment_reactions
    FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Supabase Functions
-- =====================================================

-- Get trip feed with aggregated data
CREATE OR REPLACE FUNCTION get_trip_feed(trip_id_param UUID, limit_param INT DEFAULT 20, offset_param INT DEFAULT 0)
RETURNS TABLE (
    post_id UUID,
    content TEXT,
    post_type VARCHAR,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    like_count BIGINT,
    dislike_count BIGINT,
    comment_count BIGINT,
    user_reaction VARCHAR,
    is_pinned BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id as post_id,
        tp.content,
        tp.post_type,
        tp.metadata,
        tp.created_at,
        tp.updated_at,
        tp.author_id,
        COALESCE(p.first_name || ' ' || p.last_name, 'Anonymous') as author_name,
        p.avatar_url as author_avatar,
        COALESCE(likes.count, 0) as like_count,
        COALESCE(dislikes.count, 0) as dislike_count,
        COALESCE(comments.count, 0) as comment_count,
        user_reactions.reaction_type as user_reaction,
        tp.is_pinned
    FROM trip_posts tp
    LEFT JOIN profiles p ON tp.author_id = p.id
    LEFT JOIN (
        SELECT post_id, COUNT(*) as count 
        FROM trip_post_reactions 
        WHERE reaction_type = 'like' 
        GROUP BY post_id
    ) likes ON tp.id = likes.post_id
    LEFT JOIN (
        SELECT post_id, COUNT(*) as count 
        FROM trip_post_reactions 
        WHERE reaction_type = 'dislike' 
        GROUP BY post_id
    ) dislikes ON tp.id = dislikes.post_id
    LEFT JOIN (
        SELECT post_id, COUNT(*) as count 
        FROM trip_post_comments 
        WHERE is_deleted = FALSE 
        GROUP BY post_id
    ) comments ON tp.id = comments.post_id
    LEFT JOIN trip_post_reactions user_reactions ON tp.id = user_reactions.post_id 
        AND user_reactions.user_id = auth.uid()
    WHERE tp.trip_id = trip_id_param 
        AND tp.is_deleted = FALSE
    ORDER BY tp.is_pinned DESC, tp.created_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get comments for a post
CREATE OR REPLACE FUNCTION get_post_comments(post_id_param UUID)
RETURNS TABLE (
    comment_id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    author_id UUID,
    author_name TEXT,
    author_avatar TEXT,
    parent_comment_id UUID,
    like_count BIGINT,
    dislike_count BIGINT,
    user_reaction VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tpc.id as comment_id,
        tpc.content,
        tpc.created_at,
        tpc.updated_at,
        tpc.author_id,
        COALESCE(p.first_name || ' ' || p.last_name, 'Anonymous') as author_name,
        p.avatar_url as author_avatar,
        tpc.parent_comment_id,
        COALESCE(likes.count, 0) as like_count,
        COALESCE(dislikes.count, 0) as dislike_count,
        user_reactions.reaction_type as user_reaction
    FROM trip_post_comments tpc
    LEFT JOIN profiles p ON tpc.author_id = p.id
    LEFT JOIN (
        SELECT comment_id, COUNT(*) as count 
        FROM trip_comment_reactions 
        WHERE reaction_type = 'like' 
        GROUP BY comment_id
    ) likes ON tpc.id = likes.comment_id
    LEFT JOIN (
        SELECT comment_id, COUNT(*) as count 
        FROM trip_comment_reactions 
        WHERE reaction_type = 'dislike' 
        GROUP BY comment_id
    ) dislikes ON tpc.id = dislikes.comment_id
    LEFT JOIN trip_comment_reactions user_reactions ON tpc.id = user_reactions.comment_id 
        AND user_reactions.user_id = auth.uid()
    WHERE tpc.post_id = post_id_param 
        AND tpc.is_deleted = FALSE
    ORDER BY tpc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
