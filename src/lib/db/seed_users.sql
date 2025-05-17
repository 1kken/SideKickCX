-- Users dummy data script
-- Note: In production, passwords should never be stored in plaintext
-- Supabase uses bcrypt for password hashing which is handled automatically by the auth.signUp function

-- Reset the sequence if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Insert dummy users
INSERT INTO users (name, email, password, created_at)
VALUES
  ('John Doe', 'john.doe@example.com', 'password123', NOW() - INTERVAL '30 days'),
  ('Jane Smith', 'jane.smith@example.com', 'securepass456', NOW() - INTERVAL '25 days'),
  ('Michael Johnson', 'michael.johnson@example.com', 'mjohnson789', NOW() - INTERVAL '20 days'),
  ('Sarah Williams', 'sarah.williams@example.com', 'williams2023', NOW() - INTERVAL '15 days'),
  ('Robert Brown', 'robert.brown@example.com', 'brownrob456', NOW() - INTERVAL '10 days'),
  ('Emily Davis', 'emily.davis@example.com', 'davis1234', NOW() - INTERVAL '5 days'),
  ('David Miller', 'david.miller@example.com', 'millerd9876', NOW() - INTERVAL '3 days'),
  ('Lisa Wilson', 'lisa.wilson@example.com', 'wilsonlisa321', NOW() - INTERVAL '2 days'),
  ('James Taylor', 'james.taylor@example.com', 'taylor567', NOW() - INTERVAL '1 day'),
  ('Admin User', 'admin@example.com', 'admin123', NOW());

-- Display inserted users 
SELECT * FROM users ORDER BY id; 