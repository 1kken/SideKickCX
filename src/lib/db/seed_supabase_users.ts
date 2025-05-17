// Script to seed users table through Supabase client
// This approach properly hashes passwords through Supabase auth

import { supabase } from '../supabaseClient';

interface UserSeed {
  name: string;
  email: string;
  password: string;
}

const seedUsers = async (): Promise<void> => {
  console.log('Starting to seed users...');
  
  const users: UserSeed[] = [
    { name: 'John Doe', email: 'john.doe@example.com', password: 'password123' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', password: 'securepass456' },
    { name: 'Michael Johnson', email: 'michael.johnson@example.com', password: 'mjohnson789' },
    { name: 'Sarah Williams', email: 'sarah.williams@example.com', password: 'williams2023' },
    { name: 'Robert Brown', email: 'robert.brown@example.com', password: 'brownrob456' },
    { name: 'Emily Davis', email: 'emily.davis@example.com', password: 'davis1234' },
    { name: 'David Miller', email: 'david.miller@example.com', password: 'millerd9876' },
    { name: 'Lisa Wilson', email: 'lisa.wilson@example.com', password: 'wilsonlisa321' },
    { name: 'James Taylor', email: 'james.taylor@example.com', password: 'taylor567' },
    { name: 'Admin User', email: 'admin@example.com', password: 'admin123' }
  ];
  
  for (const user of users) {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
      });
      
      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError.message);
        continue;
      }
      
      if (!authData?.user) {
        console.error(`No user data returned for ${user.email}`);
        continue;
      }
      
      console.log(`Created auth user for ${user.email} with ID: ${authData.user.id}`);
      
      // Then insert the additional user data
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          { 
            id: authData.user.id,
            name: user.name,
            email: user.email,
            // No need to add password here since it's managed by auth
            created_at: new Date()
          }
        ]);
      
      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError.message);
      } else {
        console.log(`Created profile for ${user.email}`);
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Unexpected error for ${user.email}:`, errorMessage);
    }
  }
  
  console.log('Finished seeding users!');
};

// Run the seeding function
seedUsers()
  .catch((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Fatal error during seeding:', errorMessage);
  });

/* 
HOW TO USE:
1. Make sure your Supabase project is set up with proper authentication
2. Run this script with Node.js:
   $ npx ts-node src/lib/db/seed_supabase_users.ts
3. This will create both auth entries and user profiles
*/ 