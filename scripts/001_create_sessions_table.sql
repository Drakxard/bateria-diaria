-- Create sessions table for tracking daily productivity
CREATE TABLE IF NOT EXISTS sessions (
  day_index INTEGER PRIMARY KEY,
  accumulated_minutes INTEGER DEFAULT 0,
  daily_goal_hours INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert first day if not exists
INSERT INTO sessions (day_index, accumulated_minutes, daily_goal_hours)
VALUES (1, 0, 1)
ON CONFLICT (day_index) DO NOTHING;
