-- ============================================================
-- PINGGT DATABASE SCHEMA
-- Optimized for low-bandwidth messaging in Guatemala
-- ============================================================

-- ===== 1. USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(10) PRIMARY KEY,
  name VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_seen ON users(last_seen DESC);

-- ===== 2. MESSAGES TABLE =====
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) PRIMARY KEY,
  from_user VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_messages_from ON messages(from_user);
CREATE INDEX idx_messages_to ON messages(to_user);
CREATE INDEX idx_messages_conversation ON messages(from_user, to_user);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- ===== 3. CONTACTS TABLE =====
-- Explicit relationship tracking (optional, for faster lookups)
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_name VARCHAR(32),
  added_at TIMESTAMP DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false,
  last_message_id VARCHAR(50) REFERENCES messages(id) ON DELETE SET NULL,
  unread_count INT DEFAULT 0,
  UNIQUE(user_id, contact_id)
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contacts_contact ON contacts(contact_id);
CREATE INDEX idx_contacts_added_at ON contacts(added_at DESC);

-- ===== 4. MESSAGE QUEUE TABLE =====
-- For offline message handling
CREATE TABLE IF NOT EXISTS message_queue (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(50) UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  from_user VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP DEFAULT NULL,
  failed_attempts INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending' -- pending, sent, failed
);

CREATE INDEX idx_queue_status ON message_queue(status);
CREATE INDEX idx_queue_from_user ON message_queue(from_user);
CREATE INDEX idx_queue_created_at ON message_queue(created_at);

-- ===== 5. SYNC LOG TABLE =====
-- Track sync operations for diagnostics
CREATE TABLE IF NOT EXISTS sync_log (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  messages_synced INT DEFAULT 0,
  bytes_received INT DEFAULT 0,
  bytes_sent INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  network_mode VARCHAR(20) DEFAULT 'real' -- real, slow, offline
);

CREATE INDEX idx_sync_log_user ON sync_log(user_id);
CREATE INDEX idx_sync_log_timestamp ON sync_log(sync_timestamp DESC);

-- ===== 6. USER SESSIONS TABLE =====
-- Track active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE,
  ip_address INET DEFAULT NULL,
  device_info JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);

-- ===== 7. NETWORK DIAGNOSTICS TABLE =====
-- Store ping and latency metrics
CREATE TABLE IF NOT EXISTS network_diagnostics (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  ping_latency_ms INT,
  response_time_ms INT,
  bytes_transferred INT,
  connection_quality VARCHAR(20), -- excellent, good, fair, poor
  signal_strength INT DEFAULT 0 -- 0-100
);

CREATE INDEX idx_diagnostics_user ON network_diagnostics(user_id);
CREATE INDEX idx_diagnostics_timestamp ON network_diagnostics(timestamp DESC);

-- ===== 8. BLOCK LIST TABLE =====
-- User blocking/blacklist functionality
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id VARCHAR(10) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(255) DEFAULT NULL,
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX idx_blocked_user ON blocked_users(user_id);
CREATE INDEX idx_blocked_blocked_user ON blocked_users(blocked_user_id);

-- ===== 9. SETTINGS TABLE =====
-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(10) DEFAULT 'es', -- es, en, etc.
  notifications_enabled BOOLEAN DEFAULT true,
  read_receipts_enabled BOOLEAN DEFAULT true,
  typing_indicators_enabled BOOLEAN DEFAULT true,
  auto_sync_interval_ms INT DEFAULT 4500,
  dark_mode BOOLEAN DEFAULT false,
  data_saver_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_user ON user_settings(user_id);

-- ===== 10. MESSAGE ATTACHMENTS TABLE =====
-- For future file/media support (minimal references)
CREATE TABLE IF NOT EXISTS message_attachments (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(50) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  attachment_url TEXT,
  attachment_type VARCHAR(50), -- image, file, audio, etc.
  file_size_bytes INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_message ON message_attachments(message_id);

-- ===== 11. AUDIT LOG TABLE =====
-- Track important events for security/compliance
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created_at ON audit_log(created_at DESC);

-- ===== 12. STATISTICS TABLE =====
-- Aggregate statistics for dashboard
CREATE TABLE IF NOT EXISTS daily_statistics (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  total_bytes_transmitted BIGINT DEFAULT 0,
  average_latency_ms INT DEFAULT 0,
  peak_connections INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stats_date ON daily_statistics(date DESC);

-- ===== STORED PROCEDURES / FUNCTIONS =====

-- Function to update user last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen(p_user_id VARCHAR(10))
RETURNS void AS $$
BEGIN
  UPDATE users SET last_seen = NOW() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_message_ids TEXT[])
RETURNS TABLE(id VARCHAR, read_at TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  UPDATE messages
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(p_message_ids)
  RETURNING messages.id, messages.read_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get user conversation count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id VARCHAR(10))
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages
    WHERE to_user = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql;

-- ===== TRIGGERS =====

-- Trigger to update updated_at on users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Trigger to update updated_at on messages
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Trigger to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < NOW() AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- ===== VIEWS =====

-- View for active conversations (user pairs with recent messages)
CREATE OR REPLACE VIEW active_conversations AS
SELECT
  LEAST(m.from_user, m.to_user) AS user_1,
  GREATEST(m.from_user, m.to_user) AS user_2,
  MAX(m.created_at) AS last_message_time,
  COUNT(CASE WHEN m.is_read = false THEN 1 END) AS unread_count
FROM messages m
GROUP BY user_1, user_2;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
  u.id,
  u.name,
  u.last_seen,
  COUNT(DISTINCT m.id) AS total_messages_sent,
  COUNT(DISTINCT CASE WHEN m.is_read = false THEN m.id END) AS unread_received,
  MAX(sl.latency_ms) AS last_latency_ms
FROM users u
LEFT JOIN messages m ON u.id = m.from_user
LEFT JOIN sync_log sl ON u.id = sl.user_id
GROUP BY u.id, u.name, u.last_seen;

-- ===== INITIAL DATA =====

-- Insert default support contact
INSERT INTO users (id, name, is_active)
VALUES ('GUAT-7777', 'PingGT Soporte', true)
ON CONFLICT (id) DO NOTHING;

-- Insert demo bot
INSERT INTO users (id, name, is_active)
VALUES ('BOT-X21', 'Bot X21', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default settings for support user
INSERT INTO user_settings (user_id, language)
VALUES ('GUAT-7777', 'es')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_settings (user_id, language)
VALUES ('BOT-X21', 'es')
ON CONFLICT (user_id) DO NOTHING;

-- ===== PERMISSIONS / RLS (Row Level Security) - Uncomment if needed =====
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policy examples (uncomment to use):
-- CREATE POLICY "Users can only see their own data" ON users
--   USING (auth.uid()::text = id);
--
-- CREATE POLICY "Users can only see messages they sent or received" ON messages
--   USING (auth.uid()::text = from_user OR auth.uid()::text = to_user);
--
-- CREATE POLICY "Users can only see their own contacts" ON contacts
--   USING (auth.uid()::text = user_id);

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE users IS 'Core user profiles with unique 8-character IDs';
COMMENT ON TABLE messages IS 'All messages sent between users';
COMMENT ON TABLE contacts IS 'Explicit relationship tracking between users';
COMMENT ON TABLE message_queue IS 'Queue for offline messages to retry delivery';
COMMENT ON TABLE sync_log IS 'Diagnostics and sync metrics for each user';
COMMENT ON TABLE network_diagnostics IS 'Network latency and quality metrics';
COMMENT ON TABLE user_settings IS 'Per-user preferences and configuration';
COMMENT ON TABLE blocked_users IS 'Users that have blocked each other';

-- ===== END SCHEMA =====
