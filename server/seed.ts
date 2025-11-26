import { db } from "./db";
import { users, menuItems, reportsConfig } from "@shared/schema";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  console.log("Starting database seed...");

  // Check if super admin exists
  const existingAdmin = await db.select().from(users).limit(1);
  if (existingAdmin.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Create Creator Admin (master user who can manage all libraries)
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    username: "superadmin",
    password: hashedPassword,
    email: "creator@olms.com",
    firstName: "Creator",
    lastName: "Admin",
    role: "super_admin",
    isActive: true,
    createdBy: "system",
  });
  console.log("Created Creator Admin user (username: superadmin, password: admin123)");

  // Create Menu Items
  const menuItemsData = [
    { name: "Dashboard", path: "/dashboard", icon: "dashboard", sortOrder: 1 },
    { name: "Reports", path: "/reports", icon: "reports", sortOrder: 2 },
    { name: "Register Student", path: "/register-student", icon: "register-student", sortOrder: 3 },
    { name: "Manage Students", path: "/manage-students", icon: "manage-students", sortOrder: 4 },
    { name: "Manage Subscriptions", path: "/manage-subscriptions", icon: "manage-subscriptions", sortOrder: 5 },
    { name: "Seat Management", path: "/seat-management", icon: "seat-management", sortOrder: 6 },
    { name: "Expense Tracker", path: "/expense-tracker", icon: "expense-tracker", sortOrder: 7 },
    { name: "Revenue Tracker", path: "/revenue-tracker", icon: "revenue-tracker", sortOrder: 8 },
    { name: "User Management", path: "/user-management", icon: "user-management", sortOrder: 9 },
    { name: "Library Onboarding", path: "/library-onboarding", icon: "library-onboarding", sortOrder: 10 },
  ];

  for (const item of menuItemsData) {
    await db.insert(menuItems).values({
      name: item.name,
      path: item.path,
      icon: item.icon,
      sortOrder: item.sortOrder,
      isActive: true,
    });
  }
  console.log("Created menu items");

  // Create Reports Configuration
  const reportsData = [
    {
      reportName: "Active/Inactive Students",
      reportKey: "active-inactive-students",
      columns: JSON.stringify([
        { key: "studentId", label: "Student ID" },
        { key: "studentName", label: "Name" },
        { key: "mobileNo", label: "Mobile" },
        { key: "gender", label: "Gender" },
        { key: "status", label: "Status", type: "status" },
        { key: "admissionDate", label: "Admission Date", type: "date" },
      ]),
      query: "SELECT * FROM students WHERE library_id = $1",
      description: "View all active and inactive students",
    },
    {
      reportName: "Upcoming Renewals",
      reportKey: "upcoming-renewals",
      columns: JSON.stringify([
        { key: "studentId", label: "Student ID" },
        { key: "studentName", label: "Name" },
        { key: "mobileNo", label: "Mobile" },
        { key: "seatNumber", label: "Seat No" },
        { key: "planEndDate", label: "End Date", type: "date" },
        { key: "subscriptionCost", label: "Amount", type: "currency" },
      ]),
      query: "SELECT * FROM subscriptions WHERE library_id = $1 AND status = 'active'",
      description: "Students with subscriptions ending in the next 30 days",
    },
    {
      reportName: "Monthly Expenses",
      reportKey: "monthly-expenses",
      columns: JSON.stringify([
        { key: "purpose", label: "Purpose" },
        { key: "subject", label: "Subject" },
        { key: "amount", label: "Amount", type: "currency" },
        { key: "expenseDate", label: "Date", type: "date" },
        { key: "description", label: "Notes" },
      ]),
      query: "SELECT * FROM expenses WHERE library_id = $1",
      description: "All expenses for the current month",
    },
    {
      reportName: "Monthly Payments",
      reportKey: "monthly-payments",
      columns: JSON.stringify([
        { key: "studentId", label: "Student ID" },
        { key: "studentName", label: "Name" },
        { key: "amount", label: "Amount", type: "currency" },
        { key: "paymentDate", label: "Date", type: "date" },
        { key: "paymentMode", label: "Mode" },
        { key: "status", label: "Status", type: "status" },
      ]),
      query: "SELECT * FROM payments WHERE library_id = $1",
      description: "All payments received this month",
    },
  ];

  for (const report of reportsData) {
    await db.insert(reportsConfig).values({
      reportName: report.reportName,
      reportKey: report.reportKey,
      columns: report.columns,
      query: report.query,
      description: report.description,
      isActive: true,
    });
  }
  console.log("Created reports configuration");

  console.log("Database seed completed!");
}
