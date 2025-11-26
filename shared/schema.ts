import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  decimal,
  jsonb,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Libraries (Tenants) - Multi-tenant support
export const libraries = pgTable("libraries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  totalSeats: integer("total_seats").notNull().default(90),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  description: text("description"),
});

// Users table with role-based access
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 50 }).notNull().default("staff"),
  libraryId: integer("library_id").references(() => libraries.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedBy: varchar("modified_by", { length: 100 }),
  description: text("description"),
});

// Menu Items - Dynamic menu from database
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  path: varchar("path", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  modifiedOn: timestamp("modified_on").defaultNow(),
  description: text("description"),
});

// User Permissions - Page-level access control
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  canRead: boolean("can_read").notNull().default(false),
  canWrite: boolean("can_write").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
});

// Shifts - 4 shifts of 6 hours each
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  totalHours: integer("total_hours").notNull().default(6),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  description: text("description"),
});

// Seats - Dynamically created based on library's seat count
export const seats = pgTable("seats", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  seatNumber: integer("seat_number").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("vacant"),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  description: text("description"),
});

// Seat Allocations - Tracks which seat is allocated for which shift
export const seatAllocations = pgTable("seat_allocations", {
  id: serial("id").primaryKey(),
  seatId: integer("seat_id").references(() => seats.id).notNull(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  studentId: integer("student_id").references(() => students.id),
  status: varchar("status", { length: 50 }).notNull().default("vacant"),
  gender: varchar("gender", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
});

// Students - Student information with auto-generated IDs
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  studentId: varchar("student_id", { length: 20 }).notNull().unique(),
  studentName: varchar("student_name", { length: 255 }).notNull(),
  mobileNo: varchar("mobile_no", { length: 15 }).notNull(),
  emailId: varchar("email_id", { length: 255 }),
  gender: varchar("gender", { length: 10 }).notNull(),
  guardianName: varchar("guardian_name", { length: 255 }),
  guardianPhone: varchar("guardian_phone", { length: 15 }),
  address: text("address"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  admissionDate: date("admission_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  manualComments: text("manual_comments"),
  description: text("description"),
});

// Subscriptions - Student subscription plans
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  seatId: integer("seat_id").references(() => seats.id).notNull(),
  planName: varchar("plan_name", { length: 100 }).notNull(),
  shiftIds: text("shift_ids").notNull(),
  totalHours: integer("total_hours").notNull(),
  shiftStart: varchar("shift_start", { length: 10 }).notNull(),
  shiftEnd: varchar("shift_end", { length: 10 }).notNull(),
  planStartDate: date("plan_start_date").notNull(),
  planEndDate: date("plan_end_date").notNull(),
  subscriptionCost: decimal("subscription_cost", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  pendingAmount: decimal("pending_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  manualComments: text("manual_comments"),
  description: text("description"),
});

// Payments - Payment tracking
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }).notNull().default("cash"),
  transactionId: varchar("transaction_id", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("completed"),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  manualComments: text("manual_comments"),
  description: text("description"),
});

// Expenses - Expense tracking
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  libraryId: integer("library_id").references(() => libraries.id).notNull(),
  purpose: varchar("purpose", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  createdBy: varchar("created_by", { length: 100 }),
  modifiedOn: timestamp("modified_on").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 100 }),
  manualComments: text("manual_comments"),
  description: text("description"),
});

// Reports Configuration - Dynamic report field mapping
export const reportsConfig = pgTable("reports_config", {
  id: serial("id").primaryKey(),
  reportName: varchar("report_name", { length: 100 }).notNull(),
  reportKey: varchar("report_key", { length: 100 }).notNull().unique(),
  columns: jsonb("columns").notNull(),
  query: text("query").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdOn: timestamp("created_on").defaultNow(),
  modifiedOn: timestamp("modified_on").defaultNow(),
  description: text("description"),
});

// Relations
export const librariesRelations = relations(libraries, ({ many }) => ({
  users: many(users),
  shifts: many(shifts),
  seats: many(seats),
  students: many(students),
  subscriptions: many(subscriptions),
  payments: many(payments),
  expenses: many(expenses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  library: one(libraries, { fields: [users.libraryId], references: [libraries.id] }),
  permissions: many(userPermissions),
}));

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  library: one(libraries, { fields: [shifts.libraryId], references: [libraries.id] }),
  seatAllocations: many(seatAllocations),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  library: one(libraries, { fields: [seats.libraryId], references: [libraries.id] }),
  allocations: many(seatAllocations),
  subscriptions: many(subscriptions),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  library: one(libraries, { fields: [students.libraryId], references: [libraries.id] }),
  subscriptions: many(subscriptions),
  payments: many(payments),
  seatAllocations: many(seatAllocations),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  library: one(libraries, { fields: [subscriptions.libraryId], references: [libraries.id] }),
  student: one(students, { fields: [subscriptions.studentId], references: [students.id] }),
  seat: one(seats, { fields: [subscriptions.seatId], references: [seats.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  library: one(libraries, { fields: [payments.libraryId], references: [libraries.id] }),
  student: one(students, { fields: [payments.studentId], references: [students.id] }),
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  library: one(libraries, { fields: [expenses.libraryId], references: [libraries.id] }),
}));

export const menuItemsRelations = relations(menuItems, ({ many }) => ({
  permissions: many(userPermissions),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
  menuItem: one(menuItems, { fields: [userPermissions.menuItemId], references: [menuItems.id] }),
}));

export const seatAllocationsRelations = relations(seatAllocations, ({ one }) => ({
  seat: one(seats, { fields: [seatAllocations.seatId], references: [seats.id] }),
  shift: one(shifts, { fields: [seatAllocations.shiftId], references: [shifts.id] }),
  student: one(students, { fields: [seatAllocations.studentId], references: [students.id] }),
}));

// Insert Schemas
export const insertLibrarySchema = createInsertSchema(libraries).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertSeatSchema = createInsertSchema(seats).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertSeatAllocationSchema = createInsertSchema(seatAllocations).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

export const insertReportsConfigSchema = createInsertSchema(reportsConfig).omit({
  id: true,
  createdOn: true,
  modifiedOn: true,
});

// Types
export type Library = typeof libraries.$inferSelect;
export type InsertLibrary = z.infer<typeof insertLibrarySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type Seat = typeof seats.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;

export type SeatAllocation = typeof seatAllocations.$inferSelect;
export type InsertSeatAllocation = z.infer<typeof insertSeatAllocationSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type ReportsConfig = typeof reportsConfig.$inferSelect;
export type InsertReportsConfig = z.infer<typeof insertReportsConfigSchema>;

// Login schema for authentication
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
