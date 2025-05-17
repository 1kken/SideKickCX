# User Seeding Instructions

This directory contains scripts to seed the users table for your application.

## Option 1: Using SQL (Direct Database Access)

If you have direct access to your PostgreSQL database, you can run the SQL script:

```bash
psql -U your_username -d your_database_name -f seed_users.sql
```

Or you can copy and paste the contents of `seed_users.sql` into the Supabase SQL editor.

**Note:** This method stores passwords in plaintext, which is not secure and should only be used for development/testing.

## Option 2: Using Supabase Client (Recommended)

For a more secure approach that properly handles password hashing through Supabase Auth:

1. Make sure you have Node.js installed
2. Run the TypeScript seeding script:

```bash
# Install ts-node if you don't have it
npm install -g ts-node typescript

# Run the script
npx ts-node src/lib/db/seed_supabase_users.ts
```

This script:
1. Creates auth users in Supabase Auth with proper password hashing
2. Inserts corresponding records in your users table
3. Links both together using UUID from Supabase Auth

## Login Credentials

After seeding, you can use any of these accounts to log in:

| Email | Password |
|-------|----------|
| john.doe@example.com | password123 |
| jane.smith@example.com | securepass456 |
| admin@example.com | admin123 |
| (and others listed in the scripts) |

## Table Structure

The users table has the following structure:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
``` 