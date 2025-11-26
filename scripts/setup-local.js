// This script helps set up the local environment
import 'dotenv/config';
import { execSync } from 'child_process';

console.log('');
console.log('===========================================');
console.log('  Library Management System - Local Setup');
console.log('===========================================');
console.log('');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.log('ERROR: DATABASE_URL is not set!');
  console.log('');
  console.log('Please follow these steps:');
  console.log('1. Rename .env.example to .env');
  console.log('2. Edit .env and replace YOUR_PASSWORD with your PostgreSQL password');
  console.log('3. Run this script again: node scripts/setup-local.js');
  console.log('');
  process.exit(1);
}

console.log('DATABASE_URL found!');
console.log('');
console.log('Pushing database schema...');
console.log('');

try {
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  console.log('');
  console.log('===========================================');
  console.log('  Setup Complete!');
  console.log('===========================================');
  console.log('');
  console.log('You can now start the application:');
  console.log('  npm run dev');
  console.log('');
  console.log('Then open: http://localhost:5000');
  console.log('');
  console.log('Login credentials:');
  console.log('  Username: superadmin');
  console.log('  Password: admin123');
  console.log('');
} catch (error) {
  console.log('');
  console.log('ERROR: Database setup failed!');
  console.log('Make sure PostgreSQL is running and the database exists.');
  console.log('');
  process.exit(1);
}
