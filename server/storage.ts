import { db } from "./db";
import { eq, and, desc, sql, asc, gte, lte, like, or, inArray } from "drizzle-orm";
import {
  type User, type InsertUser,
  type Library, type InsertLibrary,
  type MenuItem, type InsertMenuItem,
  type UserPermission, type InsertUserPermission,
  type Shift, type InsertShift,
  type Seat, type InsertSeat,
  type SeatAllocation, type InsertSeatAllocation,
  type Student, type InsertStudent,
  type Subscription, type InsertSubscription,
  type Payment, type InsertPayment,
  type Expense, type InsertExpense,
  type ReportsConfig,
  users, libraries, menuItems, userPermissions,
  shifts, seats, seatAllocations, students,
  subscriptions, payments, expenses, reportsConfig, sessions,
} from "@shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getUsersByLibrary(libraryId: number): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Library operations
  getLibrary(id: number): Promise<Library | undefined>;
  getAllLibraries(): Promise<Library[]>;
  createLibrary(library: InsertLibrary): Promise<Library>;
  updateLibrary(id: number, data: Partial<InsertLibrary>): Promise<Library | undefined>;
  deleteLibrary(id: number): Promise<void>;

  // Menu operations
  getAllMenuItems(): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  
  // Permission operations
  getUserPermissions(userId: string): Promise<UserPermission[]>;
  setUserPermissions(userId: string, permissions: { menuItemId: number; canRead: boolean; canWrite: boolean }[]): Promise<void>;

  // Shift operations
  getShiftsByLibrary(libraryId: number): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;

  // Seat operations
  getSeatsByLibrary(libraryId: number): Promise<Seat[]>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  getVacantSeatsForShifts(libraryId: number, shiftIds: number[]): Promise<Seat[]>;
  getSeatGrid(libraryId: number): Promise<{ seats: Seat[]; allocations: SeatAllocation[] }>;
  createSeatAllocation(data: InsertSeatAllocation): Promise<SeatAllocation>;
  deleteSeatAllocationsForStudent(studentId: number): Promise<void>;

  // Student operations
  getStudentsByLibrary(libraryId: number): Promise<Student[]>;
  getStudentById(id: number): Promise<Student | undefined>;
  searchStudents(libraryId: number, query: string): Promise<Student[]>;
  getRecentStudents(libraryId: number, limit?: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  generateStudentId(libraryId: number): Promise<string>;

  // Subscription operations
  getSubscriptionsByLibrary(libraryId: number): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getActiveSubscriptionByStudent(studentId: number): Promise<Subscription | undefined>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  cancelSubscription(id: number): Promise<void>;
  renewSubscription(studentId: number, data: InsertSubscription): Promise<Subscription>;

  // Payment operations
  getPaymentsByLibrary(libraryId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsSummary(libraryId: number): Promise<{ totalRevenue: number; monthlyRevenue: number; paymentCount: number; averagePayment: number }>;

  // Expense operations
  getExpensesByLibrary(libraryId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Dashboard operations
  getDashboardStats(libraryId: number): Promise<any>;
  getPaymentOverview(libraryId: number): Promise<any[]>;
  getRecentExpenses(libraryId: number, limit?: number): Promise<any[]>;
  getRecentPayments(libraryId: number, limit?: number): Promise<any[]>;
  getUpcomingRenewals(libraryId: number, limit?: number): Promise<any[]>;
  getStudentsWithDue(libraryId: number): Promise<any[]>;
  getPeakPaymentDays(libraryId: number): Promise<any[]>;

  // Reports
  getReportsConfig(): Promise<ReportsConfig[]>;
  getReportData(libraryId: number, reportKey: string, filters?: Record<string, string>): Promise<any[]>;

  // Onboarding
  onboardLibrary(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    totalSeats: number;
    description?: string;
    adminUsername: string;
    adminPassword: string;
    adminEmail?: string;
  }): Promise<Library>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));
  }

  async getUsersByLibrary(libraryId: number): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.libraryId, libraryId), eq(users.isActive, true)));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.isActive, true));
  }

  // Library operations
  async getLibrary(id: number): Promise<Library | undefined> {
    const [library] = await db.select().from(libraries).where(eq(libraries.id, id));
    return library;
  }

  async getAllLibraries(): Promise<Library[]> {
    return db.select().from(libraries).where(eq(libraries.isActive, true)).orderBy(asc(libraries.name));
  }

  async createLibrary(library: InsertLibrary): Promise<Library> {
    const [created] = await db.insert(libraries).values(library).returning();
    return created;
  }

  async updateLibrary(id: number, data: Partial<InsertLibrary>): Promise<Library | undefined> {
    const [library] = await db.update(libraries).set({ ...data, modifiedOn: new Date() }).where(eq(libraries.id, id)).returning();
    return library;
  }

  async deleteLibrary(id: number): Promise<void> {
    await db.update(libraries).set({ isActive: false }).where(eq(libraries.id, id));
  }

  // Menu operations
  async getAllMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.isActive, true)).orderBy(asc(menuItems.sortOrder));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  // Permission operations
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    return db.select().from(userPermissions).where(and(eq(userPermissions.userId, userId), eq(userPermissions.isActive, true)));
  }

  async setUserPermissions(userId: string, permissions: { menuItemId: number; canRead: boolean; canWrite: boolean }[]): Promise<void> {
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    if (permissions.length > 0) {
      await db.insert(userPermissions).values(
        permissions.map(p => ({
          userId,
          menuItemId: p.menuItemId,
          canRead: p.canRead,
          canWrite: p.canWrite,
        }))
      );
    }
  }

  // Shift operations
  async getShiftsByLibrary(libraryId: number): Promise<Shift[]> {
    return db.select().from(shifts).where(and(eq(shifts.libraryId, libraryId), eq(shifts.isActive, true))).orderBy(asc(shifts.startTime));
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(shift).returning();
    return created;
  }

  // Seat operations
  async getSeatsByLibrary(libraryId: number): Promise<Seat[]> {
    return db.select().from(seats).where(and(eq(seats.libraryId, libraryId), eq(seats.isActive, true))).orderBy(asc(seats.seatNumber));
  }

  async createSeat(seat: InsertSeat): Promise<Seat> {
    const [created] = await db.insert(seats).values(seat).returning();
    return created;
  }

  async getVacantSeatsForShifts(libraryId: number, shiftIds: number[]): Promise<Seat[]> {
    const allSeats = await this.getSeatsByLibrary(libraryId);
    const occupiedAllocations = await db.select()
      .from(seatAllocations)
      .where(and(
        inArray(seatAllocations.shiftId, shiftIds),
        eq(seatAllocations.status, "occupied"),
        eq(seatAllocations.isActive, true)
      ));
    
    const occupiedSeatIds = new Set(occupiedAllocations.map(a => a.seatId));
    return allSeats.filter(s => !occupiedSeatIds.has(s.id) && s.status === "vacant");
  }

  async getSeatGrid(libraryId: number): Promise<{ seats: Seat[]; allocations: SeatAllocation[] }> {
    const librarySeats = await this.getSeatsByLibrary(libraryId);
    const seatIds = librarySeats.map(s => s.id);
    
    if (seatIds.length === 0) {
      return { seats: librarySeats, allocations: [] };
    }
    
    const allocations = await db.select()
      .from(seatAllocations)
      .where(and(
        inArray(seatAllocations.seatId, seatIds),
        eq(seatAllocations.isActive, true)
      ));
    return { seats: librarySeats, allocations };
  }

  async createSeatAllocation(data: InsertSeatAllocation): Promise<SeatAllocation> {
    const [created] = await db.insert(seatAllocations).values(data).returning();
    return created;
  }

  async deleteSeatAllocationsForStudent(studentId: number): Promise<void> {
    await db.update(seatAllocations)
      .set({ isActive: false })
      .where(eq(seatAllocations.studentId, studentId));
  }

  // Student operations
  async getStudentsByLibrary(libraryId: number): Promise<Student[]> {
    return db.select().from(students).where(and(eq(students.libraryId, libraryId), eq(students.isActive, true))).orderBy(desc(students.createdOn));
  }

  async getStudentById(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async searchStudents(libraryId: number, query: string): Promise<Student[]> {
    return db.select().from(students).where(
      and(
        eq(students.libraryId, libraryId),
        eq(students.isActive, true),
        or(
          like(students.studentId, `%${query}%`),
          like(students.studentName, `%${query}%`),
          like(students.mobileNo, `%${query}%`)
        )
      )
    );
  }

  async getRecentStudents(libraryId: number, limit = 10): Promise<Student[]> {
    return db.select().from(students)
      .where(and(eq(students.libraryId, libraryId), eq(students.isActive, true)))
      .orderBy(desc(students.createdOn))
      .limit(limit);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [created] = await db.insert(students).values(student).returning();
    return created;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updated] = await db.update(students).set({ ...data, modifiedOn: new Date() }).where(eq(students.id, id)).returning();
    return updated;
  }

  async generateStudentId(libraryId: number): Promise<string> {
    const result = await db.select({ maxId: sql<number>`COALESCE(MAX(id), 0)` }).from(students);
    const nextId = Number(result[0]?.maxId || 0) + 1;
    return `STD${String(nextId).padStart(6, "0")}`;
  }

  // Subscription operations
  async getSubscriptionsByLibrary(libraryId: number): Promise<Subscription[]> {
    return db.select().from(subscriptions)
      .where(and(eq(subscriptions.libraryId, libraryId), eq(subscriptions.isActive, true)))
      .orderBy(desc(subscriptions.createdOn));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub;
  }

  async getActiveSubscriptionByStudent(studentId: number): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.studentId, studentId), eq(subscriptions.status, "active"), eq(subscriptions.isActive, true)));
    return sub;
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(sub).returning();
    return created;
  }

  async updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set({ ...data, modifiedOn: new Date() }).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async cancelSubscription(id: number): Promise<void> {
    await db.update(subscriptions).set({ status: "cancelled", modifiedOn: new Date() }).where(eq(subscriptions.id, id));
  }

  async renewSubscription(studentId: number, data: InsertSubscription): Promise<Subscription> {
    await db.update(subscriptions)
      .set({ status: "expired", modifiedOn: new Date() })
      .where(and(eq(subscriptions.studentId, studentId), eq(subscriptions.status, "active")));
    return this.createSubscription(data);
  }

  // Payment operations
  async getPaymentsByLibrary(libraryId: number): Promise<Payment[]> {
    return db.select().from(payments)
      .where(and(eq(payments.libraryId, libraryId), eq(payments.isActive, true)))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    if (payment.subscriptionId) {
      const sub = await db.select().from(subscriptions).where(eq(subscriptions.id, payment.subscriptionId));
      if (sub.length > 0) {
        const newPaid = Number(sub[0].paidAmount) + Number(payment.amount);
        const newPending = Number(sub[0].subscriptionCost) - newPaid - Number(sub[0].discount);
        await db.update(subscriptions).set({
          paidAmount: String(newPaid),
          pendingAmount: String(Math.max(0, newPending)),
          modifiedOn: new Date(),
        }).where(eq(subscriptions.id, payment.subscriptionId));
      }
    }
    return created;
  }

  async getPaymentsSummary(libraryId: number): Promise<{ totalRevenue: number; monthlyRevenue: number; paymentCount: number; averagePayment: number }> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const allPayments = await db.select({ amount: payments.amount })
      .from(payments)
      .where(and(eq(payments.libraryId, libraryId), eq(payments.status, "completed")));
    
    const monthlyPayments = await db.select({ amount: payments.amount })
      .from(payments)
      .where(and(
        eq(payments.libraryId, libraryId),
        eq(payments.status, "completed"),
        gte(payments.paymentDate, firstOfMonth.toISOString().split("T")[0])
      ));

    const totalRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const paymentCount = allPayments.length;
    const averagePayment = paymentCount > 0 ? totalRevenue / paymentCount : 0;

    return { totalRevenue, monthlyRevenue, paymentCount, averagePayment };
  }

  // Expense operations
  async getExpensesByLibrary(libraryId: number): Promise<Expense[]> {
    return db.select().from(expenses)
      .where(and(eq(expenses.libraryId, libraryId), eq(expenses.isActive, true)))
      .orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.update(expenses).set({ isActive: false }).where(eq(expenses.id, id));
  }

  // Dashboard operations
  async getDashboardStats(libraryId: number): Promise<any> {
    const [library] = await db.select().from(libraries).where(eq(libraries.id, libraryId));
    const totalSeats = library?.totalSeats || 0;

    const activeStudentsList = await db.select()
      .from(students)
      .where(and(eq(students.libraryId, libraryId), eq(students.status, "active"), eq(students.isActive, true)));

    const occupiedSeats = await db.select({ count: sql<number>`count(distinct ${seatAllocations.seatId})` })
      .from(seatAllocations)
      .innerJoin(seats, eq(seatAllocations.seatId, seats.id))
      .where(and(eq(seats.libraryId, libraryId), eq(seatAllocations.status, "occupied")));

    const totalBoys = activeStudentsList.filter(s => s.gender === "male").length;
    const totalGirls = activeStudentsList.filter(s => s.gender === "female").length;

    return {
      totalSeats,
      occupiedSeats: Number(occupiedSeats[0]?.count || 0),
      activeStudents: activeStudentsList.length,
      totalBoys,
      totalGirls,
    };
  }

  async getPaymentOverview(libraryId: number): Promise<any[]> {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString("default", { month: "short" }),
        start: d.toISOString().split("T")[0],
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0],
      });
    }

    const result = [];
    for (const m of months) {
      const monthPayments = await db.select({ amount: payments.amount })
        .from(payments)
        .where(and(
          eq(payments.libraryId, libraryId),
          eq(payments.status, "completed"),
          gte(payments.paymentDate, m.start),
          lte(payments.paymentDate, m.end)
        ));
      result.push({
        month: m.month,
        amount: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
      });
    }
    return result;
  }

  async getRecentExpenses(libraryId: number, limit = 10): Promise<any[]> {
    return db.select({
      id: expenses.id,
      purpose: expenses.purpose,
      amount: expenses.amount,
      date: expenses.expenseDate,
    })
      .from(expenses)
      .where(and(eq(expenses.libraryId, libraryId), eq(expenses.isActive, true)))
      .orderBy(desc(expenses.expenseDate))
      .limit(limit);
  }

  async getRecentPayments(libraryId: number, limit = 10): Promise<any[]> {
    return db.select({
      id: payments.id,
      studentName: students.studentName,
      amount: payments.amount,
      date: payments.paymentDate,
    })
      .from(payments)
      .innerJoin(students, eq(payments.studentId, students.id))
      .where(and(eq(payments.libraryId, libraryId), eq(payments.status, "completed")))
      .orderBy(desc(payments.paymentDate))
      .limit(limit);
  }

  async getUpcomingRenewals(libraryId: number, limit = 10): Promise<any[]> {
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    
    return db.select({
      id: subscriptions.id,
      studentName: students.studentName,
      planEndDate: subscriptions.planEndDate,
      amount: subscriptions.subscriptionCost,
    })
      .from(subscriptions)
      .innerJoin(students, eq(subscriptions.studentId, students.id))
      .where(and(
        eq(subscriptions.libraryId, libraryId),
        eq(subscriptions.status, "active"),
        gte(subscriptions.planEndDate, today),
        lte(subscriptions.planEndDate, thirtyDaysLater)
      ))
      .orderBy(asc(subscriptions.planEndDate))
      .limit(limit);
  }

  async getStudentsWithDue(libraryId: number): Promise<any[]> {
    return db.select({
      id: subscriptions.id,
      studentName: students.studentName,
      pendingAmount: subscriptions.pendingAmount,
      seatNo: seats.seatNumber,
    })
      .from(subscriptions)
      .innerJoin(students, eq(subscriptions.studentId, students.id))
      .innerJoin(seats, eq(subscriptions.seatId, seats.id))
      .where(and(
        eq(subscriptions.libraryId, libraryId),
        eq(subscriptions.status, "active"),
        sql`${subscriptions.pendingAmount}::decimal > 0`
      ))
      .orderBy(desc(subscriptions.pendingAmount))
      .limit(10);
  }

  async getPeakPaymentDays(libraryId: number): Promise<any[]> {
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    
    const result = await db.select({
      date: payments.paymentDate,
      totalAmount: sql<number>`sum(${payments.amount}::decimal)`,
      paymentCount: sql<number>`count(*)`,
    })
      .from(payments)
      .where(and(
        eq(payments.libraryId, libraryId),
        eq(payments.status, "completed"),
        gte(payments.paymentDate, firstOfMonth)
      ))
      .groupBy(payments.paymentDate)
      .orderBy(desc(sql`sum(${payments.amount}::decimal)`))
      .limit(5);
    
    return result.map(r => ({
      id: Math.random(),
      date: r.date,
      totalAmount: Number(r.totalAmount),
      paymentCount: Number(r.paymentCount),
    }));
  }

  // Reports
  async getReportsConfig(): Promise<ReportsConfig[]> {
    return db.select().from(reportsConfig).where(eq(reportsConfig.isActive, true));
  }

  async getReportData(libraryId: number, reportKey: string, filters?: Record<string, string>): Promise<any[]> {
    switch (reportKey) {
      case "active-inactive-students": {
        const statusFilter = filters?.status;
        let query = db.select({
          id: students.id,
          studentId: students.studentId,
          studentName: students.studentName,
          mobileNo: students.mobileNo,
          gender: students.gender,
          status: students.status,
          admissionDate: students.admissionDate,
        })
          .from(students)
          .where(and(eq(students.libraryId, libraryId), eq(students.isActive, true)));
        
        if (statusFilter && statusFilter !== "all") {
          return db.select({
            id: students.id,
            studentId: students.studentId,
            studentName: students.studentName,
            mobileNo: students.mobileNo,
            gender: students.gender,
            status: students.status,
            admissionDate: students.admissionDate,
          })
            .from(students)
            .where(and(eq(students.libraryId, libraryId), eq(students.isActive, true), eq(students.status, statusFilter)));
        }
        return query;
      }
      case "upcoming-renewals": {
        const today = new Date().toISOString().split("T")[0];
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        return db.select({
          id: subscriptions.id,
          studentId: students.studentId,
          studentName: students.studentName,
          mobileNo: students.mobileNo,
          seatNumber: seats.seatNumber,
          planEndDate: subscriptions.planEndDate,
          subscriptionCost: subscriptions.subscriptionCost,
        })
          .from(subscriptions)
          .innerJoin(students, eq(subscriptions.studentId, students.id))
          .innerJoin(seats, eq(subscriptions.seatId, seats.id))
          .where(and(
            eq(subscriptions.libraryId, libraryId),
            eq(subscriptions.status, "active"),
            gte(subscriptions.planEndDate, today),
            lte(subscriptions.planEndDate, thirtyDaysLater)
          ))
          .orderBy(asc(subscriptions.planEndDate));
      }
      case "monthly-expenses": {
        return db.select({
          id: expenses.id,
          purpose: expenses.purpose,
          subject: expenses.subject,
          amount: expenses.amount,
          expenseDate: expenses.expenseDate,
          description: expenses.description,
        })
          .from(expenses)
          .where(and(eq(expenses.libraryId, libraryId), eq(expenses.isActive, true)))
          .orderBy(desc(expenses.expenseDate));
      }
      case "monthly-payments": {
        return db.select({
          id: payments.id,
          studentId: students.studentId,
          studentName: students.studentName,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMode: payments.paymentMode,
          status: payments.status,
        })
          .from(payments)
          .innerJoin(students, eq(payments.studentId, students.id))
          .where(and(eq(payments.libraryId, libraryId), eq(payments.isActive, true)))
          .orderBy(desc(payments.paymentDate));
      }
      default:
        return [];
    }
  }

  // Onboarding
  async onboardLibrary(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    totalSeats: number;
    description?: string;
    adminUsername: string;
    adminPassword: string;
    adminEmail?: string;
  }): Promise<Library> {
    const library = await this.createLibrary({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      totalSeats: data.totalSeats,
      description: data.description,
      createdBy: "super_admin",
    });

    // Create 4 shifts
    const shiftData = [
      { name: "Morning", startTime: "06:00", endTime: "12:00", totalHours: 6 },
      { name: "Afternoon", startTime: "12:00", endTime: "18:00", totalHours: 6 },
      { name: "Evening", startTime: "18:00", endTime: "00:00", totalHours: 6 },
      { name: "Night", startTime: "00:00", endTime: "06:00", totalHours: 6 },
    ];

    for (const s of shiftData) {
      await this.createShift({
        libraryId: library.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        totalHours: s.totalHours,
        createdBy: "super_admin",
      });
    }

    // Create seats
    for (let i = 1; i <= data.totalSeats; i++) {
      await this.createSeat({
        libraryId: library.id,
        seatNumber: i,
        status: "vacant",
        createdBy: "super_admin",
      });
    }

    // Create admin user
    await this.createUser({
      username: data.adminUsername,
      password: data.adminPassword,
      email: data.adminEmail,
      role: "admin",
      libraryId: library.id,
      createdBy: "super_admin",
    });

    return library;
  }
}

export const storage = new DatabaseStorage();
