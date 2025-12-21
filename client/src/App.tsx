import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import RegisterStudent from "@/pages/RegisterStudent";
import ManageStudents from "@/pages/ManageStudents";
import ManageSubscriptions from "@/pages/ManageSubscriptions";
import SeatManagement from "@/pages/SeatManagement";
import ActiveShifts from "@/pages/ActiveShifts";
import ExpenseTracker from "@/pages/ExpenseTracker";
import RevenueTracker from "@/pages/RevenueTracker";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import AccessManagement from "@/pages/AccessManagement";
import LibraryOnboarding from "@/pages/LibraryOnboarding";
import NotFound from "@/pages/not-found";

interface UpcomingRenewal {
  id: number;
  studentName: string;
  planEndDate: string;
  amount: string;
}

function AppContent() {
  const { user, isLoading, isAuthenticated, isSuperAdmin } = useAuth();
  const [location] = useLocation();
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);

  useEffect(() => {
    // For library users (non-super-admin), always use their assigned library
    if (user?.libraryId && !isSuperAdmin) {
      setSelectedLibraryId(user.libraryId);
    }
  }, [user, isSuperAdmin]);

  // For library users, force their library ID and don't allow changes
  const effectiveLibraryId = isSuperAdmin ? selectedLibraryId : user?.libraryId || null;

  // Global upcoming renewals query (same API used by Dashboard)
  const { data: upcomingRenewals } = useQuery<UpcomingRenewal[]>({
    queryKey: ["/api/dashboard/upcoming-renewals", effectiveLibraryId],
    enabled: !!effectiveLibraryId,
  });

  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [expiringSoon, setExpiringSoon] = useState<UpcomingRenewal[]>([]);

  useEffect(() => {
    if (!effectiveLibraryId) return;
    if (!upcomingRenewals || upcomingRenewals.length === 0) return;
    if (typeof window === "undefined") return;

    const STORAGE_KEY = "expiryPopupShown_v3";

    // Prevent showing more than once per browser session
    if (window.sessionStorage.getItem(STORAGE_KEY) === "true") {
      return;
    }

    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // Filter: only those expiring within next 3 days (>= today, <= today+3)
    const soon = upcomingRenewals.filter((item) => {
      const end = new Date(item.planEndDate);
      const diff = end.getTime() - now.getTime();
      return diff >= 0 && diff <= threeDaysMs;
    });

    if (soon.length === 0) {
      return;
    }

    // ⏱ Change this to 10 * 1000 for quick testing (10 seconds)
    const timer = window.setTimeout(() => {
      setExpiringSoon(soon);
      setShowExpiryPopup(true);
      window.sessionStorage.setItem(STORAGE_KEY, "true");
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      window.clearTimeout(timer);
    };
  }, [effectiveLibraryId, upcomingRenewals]);

  // Library change handler - only super admin can change libraries
  const handleLibraryChange = (libraryId: number) => {
    if (isSuperAdmin) {
      setSelectedLibraryId(libraryId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <Skeleton className="w-16 h-16 rounded-full mx-auto" />
          <Skeleton className="w-32 h-4 mx-auto" />
          <Skeleton className="w-24 h-3 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          selectedLibraryId={effectiveLibraryId}
          onLibraryChange={handleLibraryChange}
        />
        <SidebarInset className="flex flex-col flex-1">
          {/* GLOBAL POPUP – visible on all pages */}
          <Dialog open={showExpiryPopup} onOpenChange={setShowExpiryPopup}>
            <DialogContent className="max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upcoming Renewals (within 3 days)</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {expiringSoon.length > 0 ? (
                  expiringSoon.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded p-2 bg-muted/30"
                    >
                      <div className="font-medium">
                        {item.studentName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expiry:{" "}
                        {new Date(item.planEndDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No upcoming expiries.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-4 w-px bg-border" />
              <nav className="text-sm text-muted-foreground">
                <span className="capitalize">
                  {location === "/"
                    ? "Dashboard"
                    : location.slice(1).replace(/-/g, " ")}
                </span>
              </nav>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Switch>
              <Route
                path="/"
                component={() => <Dashboard libraryId={effectiveLibraryId} />}
              />
              <Route
                path="/dashboard"
                component={() => <Dashboard libraryId={effectiveLibraryId} />}
              />
              <Route
                path="/reports"
                component={() => <Reports libraryId={effectiveLibraryId} />}
              />
              <Route
                path="/register-student"
                component={() => (
                  <RegisterStudent libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/manage-students"
                component={() => (
                  <ManageStudents libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/manage-subscriptions"
                component={() => (
                  <ManageSubscriptions libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/seat-management"
                component={() => (
                  <SeatManagement libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/active-shifts"
                component={() => (
                  <ActiveShifts libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/expense-tracker"
                component={() => (
                  <ExpenseTracker libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/revenue-tracker"
                component={() => (
                  <RevenueTracker libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/user-management"
                component={() => (
                  <UserManagement libraryId={effectiveLibraryId} />
                )}
              />
              <Route
                path="/access-management"
                component={() => (
                  <AccessManagement libraryId={effectiveLibraryId} />
                )}
              />
              <Route path="/library-onboarding" component={LibraryOnboarding} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="olms-theme">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
