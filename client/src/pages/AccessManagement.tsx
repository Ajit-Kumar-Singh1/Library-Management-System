import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Loader2, Eye, Pencil, Save, Users } from "lucide-react";
import type { User, MenuItem, UserPermission } from "@shared/schema";

interface LibraryContextProps {
  libraryId: number | null;
}

interface PermissionState {
  [menuItemId: number]: {
    canRead: boolean;
    canWrite: boolean;
  };
}

export default function AccessManagement({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin, isAdmin, user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users", libraryId],
    enabled: !!libraryId || isSuperAdmin,
  });

  const { data: menuItems, isLoading: menuItemsLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery<UserPermission[]>({
    queryKey: ["/api/users", selectedUserId, "permissions"],
    enabled: !!selectedUserId,
  });

  useEffect(() => {
    if (userPermissions && menuItems) {
      const permState: PermissionState = {};
      menuItems.forEach(item => {
        const existing = userPermissions.find(p => p.menuItemId === item.id);
        permState[item.id] = {
          canRead: existing?.canRead || false,
          canWrite: existing?.canWrite || false,
        };
      });
      setPermissions(permState);
      setHasChanges(false);
    }
  }, [userPermissions, menuItems, selectedUserId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const permArray = Object.entries(permissions).map(([menuItemId, perm]) => ({
        menuItemId: parseInt(menuItemId),
        canRead: perm.canRead,
        canWrite: perm.canWrite,
      }));
      return await apiRequest("POST", `/api/users/${selectedUserId}/permissions`, {
        permissions: permArray,
      });
    },
    onSuccess: () => {
      toast({
        title: "Permissions Saved",
        description: "User permissions have been updated successfully.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedUserId, "permissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save Permissions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (menuItemId: number, type: "canRead" | "canWrite", value: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev };
      if (!updated[menuItemId]) {
        updated[menuItemId] = { canRead: false, canWrite: false };
      }
      updated[menuItemId][type] = value;
      if (type === "canWrite" && value) {
        updated[menuItemId].canRead = true;
      }
      if (type === "canRead" && !value) {
        updated[menuItemId].canWrite = false;
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleSelectAll = (type: "canRead" | "canWrite", value: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev };
      menuItems?.forEach(item => {
        if (!updated[item.id]) {
          updated[item.id] = { canRead: false, canWrite: false };
        }
        updated[item.id][type] = value;
        if (type === "canWrite" && value) {
          updated[item.id].canRead = true;
        }
        if (type === "canRead" && !value) {
          updated[item.id].canWrite = false;
        }
      });
      return updated;
    });
    setHasChanges(true);
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);
  const staffUsers = users?.filter(u => u.role === "staff" || u.role === "readonly");

  if (!libraryId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to manage user access
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Access Denied</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Only administrators can manage user access permissions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="access-management-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access Management</h1>
        <p className="text-muted-foreground">Manage page access permissions for staff users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select User
            </CardTitle>
            <CardDescription>
              Choose a staff user to manage their page access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : staffUsers && staffUsers.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {staffUsers.map((user) => (
                    <Button
                      key={user.id}
                      variant={selectedUserId === user.id ? "default" : "outline"}
                      className="w-full justify-start h-auto py-3"
                      onClick={() => setSelectedUserId(user.id)}
                      data-testid={`user-select-${user.id}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                            : user.username}
                        </div>
                        <div className="text-xs opacity-80">
                          @{user.username} - {user.role}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No staff users found. Create users in User Management first.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Page Permissions
                </CardTitle>
                <CardDescription>
                  {selectedUser 
                    ? `Managing permissions for ${selectedUser.firstName || selectedUser.username}`
                    : "Select a user to manage their permissions"}
                </CardDescription>
              </div>
              {selectedUserId && hasChanges && (
                <Button 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-permissions"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedUserId ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Select a user from the list to configure their page access permissions
                </p>
              </div>
            ) : permissionsLoading || menuItemsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Page</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span>Read</span>
                          <Checkbox 
                            checked={menuItems?.every(item => permissions[item.id]?.canRead)}
                            onCheckedChange={(checked) => handleSelectAll("canRead", !!checked)}
                            data-testid="checkbox-select-all-read"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Pencil className="w-4 h-4" />
                          <span>Write</span>
                          <Checkbox 
                            checked={menuItems?.every(item => permissions[item.id]?.canWrite)}
                            onCheckedChange={(checked) => handleSelectAll("canWrite", !!checked)}
                            data-testid="checkbox-select-all-write"
                          />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.path}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={permissions[item.id]?.canRead || false}
                            onCheckedChange={(checked) => handlePermissionChange(item.id, "canRead", !!checked)}
                            data-testid={`checkbox-read-${item.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            checked={permissions[item.id]?.canWrite || false}
                            onCheckedChange={(checked) => handlePermissionChange(item.id, "canWrite", !!checked)}
                            data-testid={`checkbox-write-${item.id}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedUserId && !permissionsLoading && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Permission Guide</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span><strong>Read:</strong> User can view this page</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    <span><strong>Write:</strong> User can make changes (automatically enables Read)</span>
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
