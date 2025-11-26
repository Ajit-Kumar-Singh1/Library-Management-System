import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";

const PgStore = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to check if user is super admin
async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden - Super Admin access required" });
  }
  next();
}

// Middleware to check if user is admin or super admin
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session with PostgreSQL store
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "olms-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // ================== AUTH ROUTES ==================
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      req.session.userId = user.id;
      
      // Get user permissions
      const permissions = await storage.getUserPermissions(user.id);
      const menuItems = await storage.getAllMenuItems();
      
      const permissionData = permissions.map(p => {
        const menuItem = menuItems.find(m => m.id === p.menuItemId);
        return {
          menuItemId: p.menuItemId,
          canRead: p.canRead,
          canWrite: p.canWrite,
          path: menuItem?.path || "",
        };
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, permissions: permissionData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data" });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const permissions = await storage.getUserPermissions(user.id);
    const menuItems = await storage.getAllMenuItems();
    
    const permissionData = permissions.map(p => {
      const menuItem = menuItems.find(m => m.id === p.menuItemId);
      return {
        menuItemId: p.menuItemId,
        canRead: p.canRead,
        canWrite: p.canWrite,
        path: menuItem?.path || "",
      };
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ ...userWithoutPassword, permissions: permissionData });
  });

  // ================== MENU ROUTES ==================
  
  app.get("/api/menu-items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getAllMenuItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  // ================== LIBRARY ROUTES ==================
  
  app.get("/api/libraries", requireAuth, async (req, res) => {
    try {
      const libraries = await storage.getAllLibraries();
      res.json(libraries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch libraries" });
    }
  });

  app.post("/api/libraries/onboard", requireSuperAdmin, async (req, res) => {
    try {
      const library = await storage.onboardLibrary(req.body);
      res.json(library);
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ message: "Failed to onboard library" });
    }
  });

  app.delete("/api/libraries/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteLibrary(parseInt(req.params.id));
      res.json({ message: "Library deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete library" });
    }
  });

  // ================== USER ROUTES ==================
  
  app.get("/api/users/:libraryId?", requireAdmin, async (req, res) => {
    try {
      const libraryId = req.params.libraryId ? parseInt(req.params.libraryId) : null;
      const user = await storage.getUser(req.session.userId!);
      
      if (user?.role === "super_admin") {
        if (libraryId) {
          const users = await storage.getUsersByLibrary(libraryId);
          return res.json(users.map(u => ({ ...u, password: undefined })));
        }
        const users = await storage.getAllUsers();
        return res.json(users.map(u => ({ ...u, password: undefined })));
      }
      
      if (user?.libraryId) {
        const users = await storage.getUsersByLibrary(user.libraryId);
        return res.json(users.map(u => ({ ...u, password: undefined })));
      }
      
      res.json([]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/users/:id/permissions", requireAdmin, async (req, res) => {
    try {
      await storage.setUserPermissions(req.params.id, req.body.permissions);
      res.json({ message: "Permissions updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  // ================== SHIFT ROUTES ==================
  
  app.get("/api/shifts/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.status(400).json({ message: "Library ID required" });
      }
      const shifts = await storage.getShiftsByLibrary(libraryId);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  // ================== SEAT ROUTES ==================
  
  app.get("/api/seats/vacant/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      const shiftIdsParam = req.query.shiftIds as string;
      const shiftIds = shiftIdsParam ? JSON.parse(shiftIdsParam) : [];
      if (!libraryId || shiftIds.length === 0) {
        return res.json([]);
      }
      const seats = await storage.getVacantSeatsForShifts(libraryId, shiftIds);
      res.json(seats.map(s => ({ id: s.id, seatNumber: s.seatNumber })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vacant seats" });
    }
  });

  app.get("/api/seats/grid/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.status(400).json({ message: "Library ID required" });
      }
      
      const library = await storage.getLibrary(libraryId);
      const shifts = await storage.getShiftsByLibrary(libraryId);
      const { seats, allocations } = await storage.getSeatGrid(libraryId);
      
      const allocationsWithDetails = allocations.map(a => {
        const seat = seats.find(s => s.id === a.seatId);
        return {
          seatId: a.seatId,
          seatNumber: seat?.seatNumber || 0,
          status: a.status,
          gender: a.gender,
          shiftId: a.shiftId,
        };
      });

      res.json({
        totalSeats: library?.totalSeats || 0,
        shifts,
        allocations: allocationsWithDetails,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch seat grid" });
    }
  });

  // ================== STUDENT ROUTES ==================
  
  app.get("/api/students/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const students = await storage.getStudentsByLibrary(libraryId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/recent/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const students = await storage.getRecentStudents(libraryId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent students" });
    }
  });

  app.get("/api/students/search/:libraryId/:query", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      const query = req.params.query;
      if (!libraryId || !query) {
        return res.json([]);
      }
      const students = await storage.searchStudents(libraryId, query);
      
      // Get subscription data for each student
      const studentsWithSubs = await Promise.all(students.map(async (student) => {
        const subscription = await storage.getActiveSubscriptionByStudent(student.id);
        const seats = await storage.getSeatsByLibrary(libraryId);
        const seat = subscription ? seats.find(s => s.id === subscription.seatId) : null;
        return {
          ...student,
          subscription,
          seatNumber: seat?.seatNumber,
        };
      }));
      
      res.json(studentsWithSubs);
    } catch (error) {
      res.status(500).json({ message: "Failed to search students" });
    }
  });

  app.post("/api/students", requireAuth, async (req, res) => {
    try {
      const { libraryId, shiftIds, seatId, planStartDate, planEndDate, subscriptionCost, paidAmount, discount, ...studentData } = req.body;
      
      // Generate student ID
      const studentId = await storage.generateStudentId(libraryId);
      
      // Create student
      const student = await storage.createStudent({
        ...studentData,
        libraryId,
        studentId,
        admissionDate: studentData.admissionDate,
        createdBy: req.session.userId,
      });

      // Get shifts for time range
      const allShifts = await storage.getShiftsByLibrary(libraryId);
      const selectedShifts = allShifts.filter(s => shiftIds.includes(s.id));
      const totalHours = selectedShifts.reduce((sum, s) => sum + s.totalHours, 0);
      const shiftStart = selectedShifts.sort((a, b) => a.startTime.localeCompare(b.startTime))[0]?.startTime || "06:00";
      const shiftEnd = selectedShifts.sort((a, b) => b.endTime.localeCompare(a.endTime))[0]?.endTime || "12:00";

      // Create subscription
      const cost = parseFloat(subscriptionCost || "0");
      const paid = parseFloat(paidAmount || "0");
      const disc = parseFloat(discount || "0");
      const pending = Math.max(0, cost - paid - disc);

      const subscription = await storage.createSubscription({
        libraryId,
        studentId: student.id,
        seatId,
        planName: `${totalHours}h Plan`,
        shiftIds: JSON.stringify(shiftIds),
        totalHours,
        shiftStart,
        shiftEnd,
        planStartDate,
        planEndDate,
        subscriptionCost: String(cost),
        paidAmount: String(paid),
        discount: String(disc),
        pendingAmount: String(pending),
        status: "active",
        createdBy: req.session.userId,
      });

      // Create payment record if paid amount > 0
      if (paid > 0) {
        await storage.createPayment({
          libraryId,
          studentId: student.id,
          subscriptionId: subscription.id,
          amount: String(paid),
          paymentDate: planStartDate,
          paymentMode: "cash",
          status: "completed",
          createdBy: req.session.userId,
        });
      }

      res.json({ student, subscription });
    } catch (error) {
      console.error("Create student error:", error);
      res.status(500).json({ message: "Failed to register student" });
    }
  });

  app.patch("/api/students/:id", requireAuth, async (req, res) => {
    try {
      const student = await storage.updateStudent(parseInt(req.params.id), {
        ...req.body,
        modifiedBy: req.session.userId,
      });
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // ================== SUBSCRIPTION ROUTES ==================
  
  app.get("/api/subscriptions/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const subscriptions = await storage.getSubscriptionsByLibrary(libraryId);
      
      // Enrich with student and seat info
      const students = await storage.getStudentsByLibrary(libraryId);
      const seats = await storage.getSeatsByLibrary(libraryId);
      
      const enriched = subscriptions.map(sub => {
        const student = students.find(s => s.id === sub.studentId);
        const seat = seats.find(s => s.id === sub.seatId);
        return {
          ...sub,
          studentName: student?.studentName || "",
          studentIdCode: student?.studentId || "",
          seatNumber: seat?.seatNumber || 0,
        };
      });
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions/renew/:studentId", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const { libraryId, planStartDate, planEndDate, subscriptionCost, paidAmount, discount } = req.body;
      
      const activeSub = await storage.getActiveSubscriptionByStudent(studentId);
      if (!activeSub) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      const cost = parseFloat(subscriptionCost || "0");
      const paid = parseFloat(paidAmount || "0");
      const disc = parseFloat(discount || "0");
      const pending = Math.max(0, cost - paid - disc);

      const subscription = await storage.renewSubscription(studentId, {
        libraryId,
        studentId,
        seatId: activeSub.seatId,
        planName: activeSub.planName,
        shiftIds: activeSub.shiftIds,
        totalHours: activeSub.totalHours,
        shiftStart: activeSub.shiftStart,
        shiftEnd: activeSub.shiftEnd,
        planStartDate,
        planEndDate,
        subscriptionCost: String(cost),
        paidAmount: String(paid),
        discount: String(disc),
        pendingAmount: String(pending),
        status: "active",
        createdBy: req.session.userId,
      });

      if (paid > 0) {
        await storage.createPayment({
          libraryId,
          studentId,
          subscriptionId: subscription.id,
          amount: String(paid),
          paymentDate: planStartDate,
          paymentMode: "cash",
          status: "completed",
          createdBy: req.session.userId,
        });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Renew subscription error:", error);
      res.status(500).json({ message: "Failed to renew subscription" });
    }
  });

  app.patch("/api/subscriptions/:id/cancel", requireAuth, async (req, res) => {
    try {
      await storage.cancelSubscription(parseInt(req.params.id));
      res.json({ message: "Subscription cancelled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ================== PAYMENT ROUTES ==================
  
  app.get("/api/payments/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const payments = await storage.getPaymentsByLibrary(libraryId);
      
      const students = await storage.getStudentsByLibrary(libraryId);
      const subscriptions = await storage.getSubscriptionsByLibrary(libraryId);
      const seats = await storage.getSeatsByLibrary(libraryId);
      
      const enriched = payments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        const subscription = subscriptions.find(s => s.id === p.subscriptionId);
        const seat = subscription ? seats.find(s => s.id === subscription.seatId) : null;
        return {
          ...p,
          studentName: student?.studentName || "",
          studentId: student?.studentId || "",
          seatNumber: seat?.seatNumber || 0,
        };
      });
      
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/summary/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json({ totalRevenue: 0, monthlyRevenue: 0, paymentCount: 0, averagePayment: 0 });
      }
      const summary = await storage.getPaymentsSummary(libraryId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment summary" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const payment = await storage.createPayment({
        ...req.body,
        createdBy: req.session.userId,
      });
      res.json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  // ================== EXPENSE ROUTES ==================
  
  app.get("/api/expenses/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const expenses = await storage.getExpensesByLibrary(libraryId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const expense = await storage.createExpense({
        ...req.body,
        createdBy: req.session.userId,
      });
      res.json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.delete("/api/expenses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteExpense(parseInt(req.params.id));
      res.json({ message: "Expense deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // ================== DASHBOARD ROUTES ==================
  
  app.get("/api/dashboard/stats/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json({});
      }
      const stats = await storage.getDashboardStats(libraryId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/payment-overview/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const overview = await storage.getPaymentOverview(libraryId);
      res.json(overview);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment overview" });
    }
  });

  app.get("/api/dashboard/recent-expenses/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const expenses = await storage.getRecentExpenses(libraryId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent expenses" });
    }
  });

  app.get("/api/dashboard/recent-payments/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const payments = await storage.getRecentPayments(libraryId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent payments" });
    }
  });

  app.get("/api/dashboard/upcoming-renewals/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const renewals = await storage.getUpcomingRenewals(libraryId);
      res.json(renewals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming renewals" });
    }
  });

  app.get("/api/dashboard/students-with-due/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const students = await storage.getStudentsWithDue(libraryId);
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students with due" });
    }
  });

  app.get("/api/dashboard/peak-days/:libraryId", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      if (!libraryId) {
        return res.json([]);
      }
      const peakDays = await storage.getPeakPaymentDays(libraryId);
      res.json(peakDays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch peak days" });
    }
  });

  // ================== REPORTS ROUTES ==================
  
  app.get("/api/reports/config", requireAuth, async (req, res) => {
    try {
      const config = await storage.getReportsConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reports config" });
    }
  });

  app.get("/api/reports/data/:libraryId/:reportKey", requireAuth, async (req, res) => {
    try {
      const libraryId = parseInt(req.params.libraryId);
      const reportKey = req.params.reportKey;
      const status = (req.query.status as string) || "";
      
      if (!libraryId || !reportKey) {
        return res.json([]);
      }
      
      const data = await storage.getReportData(libraryId, reportKey, { status });
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
