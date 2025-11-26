import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import RegisterStudent from "@/pages/RegisterStudent";
import ManageStudents from "@/pages/ManageStudents";
import ManageSubscriptions from "@/pages/ManageSubscriptions";
import SeatManagement from "@/pages/SeatManagement";
import ExpenseTracker from "@/pages/ExpenseTracker";
import RevenueTracker from "@/pages/RevenueTracker";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import LibraryOnboarding from "@/pages/LibraryOnboarding";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { user, isLoading, isAuthenticated, isSuperAdmin } = useAuth();
  const [location] = useLocation();
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.libraryId && !isSuperAdmin) {
      setSelectedLibraryId(user.libraryId);
    }
  }, [user, isSuperAdmin]);

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
          selectedLibraryId={selectedLibraryId} 
          onLibraryChange={setSelectedLibraryId} 
        />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-4 w-px bg-border" />
              <nav className="text-sm text-muted-foreground">
                <span className="capitalize">
                  {location === "/" ? "Dashboard" : location.slice(1).replace(/-/g, " ")}
                </span>
              </nav>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Switch>
              <Route path="/" component={() => <Dashboard libraryId={selectedLibraryId} />} />
              <Route path="/dashboard" component={() => <Dashboard libraryId={selectedLibraryId} />} />
              <Route path="/reports" component={() => <Reports libraryId={selectedLibraryId} />} />
              <Route path="/register-student" component={() => <RegisterStudent libraryId={selectedLibraryId} />} />
              <Route path="/manage-students" component={() => <ManageStudents libraryId={selectedLibraryId} />} />
              <Route path="/manage-subscriptions" component={() => <ManageSubscriptions libraryId={selectedLibraryId} />} />
              <Route path="/seat-management" component={() => <SeatManagement libraryId={selectedLibraryId} />} />
              <Route path="/expense-tracker" component={() => <ExpenseTracker libraryId={selectedLibraryId} />} />
              <Route path="/revenue-tracker" component={() => <RevenueTracker libraryId={selectedLibraryId} />} />
              <Route path="/user-management" component={() => <UserManagement libraryId={selectedLibraryId} />} />
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
