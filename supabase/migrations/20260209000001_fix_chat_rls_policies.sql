-- Fix RLS policies for chat tables
-- Allow anonymous users to INSERT conversations and messages (for chat functionality)
-- Admins can still SELECT all conversations and messages

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Admins can view all chat messages" ON chat_messages;

-- Allow anyone to INSERT conversations (for anonymous chat users)
CREATE POLICY "Anyone can create chat conversations"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to INSERT messages (for anonymous chat users)
CREATE POLICY "Anyone can create chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Admins can read all conversations
-- Try both profiles and customer_profiles tables (depending on which exists)
CREATE POLICY "Admins can view all chat conversations"
  ON chat_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.id = auth.uid()
      AND customer_profiles.is_admin = true
    )
  );

-- Admins can read all messages
CREATE POLICY "Admins can view all chat messages"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.id = auth.uid()
      AND customer_profiles.is_admin = true
    )
  );

-- Note: Service role (used in API routes) bypasses RLS by default
-- So no need for separate service role policies

