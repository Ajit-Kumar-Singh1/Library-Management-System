import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  UserPlus,
  Users,
  CreditCard,
  Grid3X3,
  Receipt,
  DollarSign,
  Settings,
  Building2,
  UserCog,
  LogOut,
  ChevronDown,
  Library,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { MenuItem, Library as LibraryType } from "@shared/schema";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  reports: FileText,
  "register-student": UserPlus,
  "manage-students": Users,
  "manage-subscriptions": CreditCard,
  "seat-management": Grid3X3,
  "active-shifts": Clock,
  clock: Clock,
  "expense-tracker": Receipt,
  "revenue-tracker": DollarSign,
  "user-management": UserCog,
  "access-management": Settings,
  "library-onboarding": Building2,
  settings: Settings,
};

interface AppSidebarProps {
  selectedLibraryId: number | null;
  onLibraryChange: (libraryId: number) => void;
}

export function AppSidebar({ selectedLibraryId, onLibraryChange }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout, isLoggingOut, isSuperAdmin, canAccessMenu } = useAuth();

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: libraries, isLoading: librariesLoading } = useQuery<LibraryType[]>({
    queryKey: ["/api/libraries"],
    enabled: isSuperAdmin,
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return LayoutDashboard;
    return iconMap[iconName] || LayoutDashboard;
  };

  const filteredMenuItems = menuItems?.filter(item => {
    if (!item.isActive) return false;
    
    // Library Onboarding is only for super_admin (app owner)
    if (item.path === "/library-onboarding") {
      return isSuperAdmin;
    }
    
    if (isSuperAdmin) return true;
    return canAccessMenu(item.path);
  }) || [];

  const regularMenuItems = filteredMenuItems.filter(
    item => !["user-management", "access-management", "library-onboarding"].includes(item.path.replace("/", ""))
  );

  // Admin menu items - library-onboarding only for super_admin
  const adminMenuItems = filteredMenuItems.filter(item => {
    const pathName = item.path.replace("/", "");
    if (pathName === "library-onboarding") {
      return isSuperAdmin; // Only super_admin sees library onboarding
    }
    return pathName === "user-management" || pathName === "access-management";
  });

  const userInitials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Library className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">OLMS</span>
            <span className="text-xs text-muted-foreground">Library Management</span>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="mt-4">
            {librariesLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={selectedLibraryId?.toString() || ""}
                onValueChange={(value) => onLibraryChange(parseInt(value))}
              >
                <SelectTrigger className="w-full h-9" data-testid="select-library">
                  <SelectValue placeholder="Select Library" />
                </SelectTrigger>
                <SelectContent>
                  {libraries?.map((library) => (
                    <SelectItem 
                      key={library.id} 
                      value={library.id.toString()}
                      data-testid={`library-option-${library.id}`}
                    >
                      {library.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4 py-2">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {menuLoading ? (
              <div className="space-y-2 px-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <SidebarMenu>
                {regularMenuItems.map((item) => {
                  const Icon = getIcon(item.icon);
                  const isActive = location === item.path;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-10"
                      >
                        <Link href={item.path} data-testid={`menu-${item.path.replace("/", "")}`}>
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {adminMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4 py-2">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => {
                  const Icon = getIcon(item.icon);
                  const isActive = location === item.path;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-10"
                      >
                        <Link href={item.path} data-testid={`menu-${item.path.replace("/", "")}`}>
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 h-auto py-2 px-2"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.username}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role === "super_admin" ? "Creator Admin" : user?.role?.replace("_", " ")}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive focus:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
