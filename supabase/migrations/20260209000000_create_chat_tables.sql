-- Create chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  page_url TEXT,
  device_type TEXT,
  user_agent TEXT,
  locale TEXT DEFAULT 'nl',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_started_at ON chat_conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
-- Admins can read all conversations
CREATE POLICY "Admins can view all chat conversations"
  ON chat_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.id = auth.uid()
      AND customer_profiles.is_admin = true
    )
  );

-- RLS Policies for chat_messages
-- Admins can read all messages
CREATE POLICY "Admins can view all chat messages"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customer_profiles
      WHERE customer_profiles.id = auth.uid()
      AND customer_profiles.is_admin = true
    )
  );

-- Function to update last_message_at and message_count
CREATE OR REPLACE FUNCTION update_chat_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET 
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation stats when message is added
CREATE TRIGGER update_conversation_stats_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_conversation_stats();


