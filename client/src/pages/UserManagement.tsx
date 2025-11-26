import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { UserCog, Plus, Loader2, Edit, Trash2, Shield, Eye, Pencil } from "lucide-react";
import type { User, MenuItem, UserPermission } from "@shared/schema";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "staff", "readonly"]),
});

type UserForm = z.infer<typeof userSchema>;

interface UserWithPermissions extends User {
  permissions?: {
    menuItemId: number;
    canRead: boolean;
    canWrite: boolean;
  }[];
}

interface LibraryContextProps {
  libraryId: number | null;
}

export default function UserManagement({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin, user: currentUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithPermissions | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [permissions, setPermissions] = useState<Record<number, { canRead: boolean; canWrite: boolean }>>({});

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "staff",
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserWithPermissions[]>({
    queryKey: ["/api/users", libraryId],
    enabled: !!libraryId || isSuperAdmin,
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return await apiRequest("POST", "/api/users", {
        ...data,
        libraryId,
      });
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      });
      form.reset();
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserForm & { id: string }) => {
      return await apiRequest("PATCH", `/api/users/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "User Updated",
        description: "The user has been updated successfully.",
      });
      setEditingUser(null);
      setShowDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "User Deleted",
        description: "The user has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete User",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const permissionMutation = useMutation({
    mutationFn: async (data: { userId: string; permissions: typeof permissions }) => {
      return await apiRequest("POST", `/api/users/${data.userId}/permissions`, {
        permissions: Object.entries(data.permissions).map(([menuItemId, perm]) => ({
          menuItemId: parseInt(menuItemId),
          ...perm,
        })),
      });
    },
    onSuccess: () => {
      toast({
        title: "Permissions Updated",
        description: "User permissions have been saved.",
      });
      setShowPermissions(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Permissions",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: UserWithPermissions) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      role: user.role as "admin" | "staff" | "readonly",
    });
    setShowDialog(true);
  };

  const handlePermissions = (user: UserWithPermissions) => {
    setSelectedUser(user);
    const perms: Record<number, { canRead: boolean; canWrite: boolean }> = {};
    menuItems?.forEach(item => {
      const existing = user.permissions?.find(p => p.menuItemId === item.id);
      perms[item.id] = {
        canRead: existing?.canRead ?? false,
        canWrite: existing?.canWrite ?? false,
      };
    });
    setPermissions(perms);
    setShowPermissions(true);
  };

  const onSubmit = (data: UserForm) => {
    if (editingUser) {
      updateMutation.mutate({ ...data, id: editingUser.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const togglePermission = (menuItemId: number, type: "canRead" | "canWrite") => {
    setPermissions(prev => ({
      ...prev,
      [menuItemId]: {
        ...prev[menuItemId],
        [type]: !prev[menuItemId]?.[type],
        ...(type === "canWrite" && !prev[menuItemId]?.canRead ? { canRead: true } : {}),
      },
    }));
  };

  if (!libraryId && !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to manage users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Create and manage user accounts and permissions</p>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingUser(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
              <DialogDescription>
                {editingUser ? "Update user information" : "Add a new user to the system"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-user-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-user-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="johndoe" 
                          {...field} 
                          disabled={!!editingUser}
                          data-testid="input-user-username" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password {editingUser ? "(leave blank to keep)" : "*"}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="********" 
                          {...field} 
                          data-testid="input-user-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="john@example.com" 
                          {...field} 
                          data-testid="input-user-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="readonly">Read Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-user"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingUser ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Users
          </CardTitle>
          <CardDescription>
            {users?.length || 0} users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCog className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                          : "-"}
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`text-xs ${
                            user.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePermissions(user)}
                            disabled={user.role === "admin" || user.role === "super_admin"}
                            data-testid={`button-permissions-${user.id}`}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                            disabled={user.id === currentUser?.id}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(user.id)}
                            disabled={user.id === currentUser?.id || deleteMutation.isPending}
                            data-testid={`button-delete-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showPermissions} onOpenChange={(open) => {
        setShowPermissions(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              Set page access for {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {menuItems?.filter(item => item.isActive).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.path}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`read-${item.id}`}
                        checked={permissions[item.id]?.canRead ?? false}
                        onCheckedChange={() => togglePermission(item.id, "canRead")}
                      />
                      <label htmlFor={`read-${item.id}`} className="text-sm flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Read
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`write-${item.id}`}
                        checked={permissions[item.id]?.canWrite ?? false}
                        onCheckedChange={() => togglePermission(item.id, "canWrite")}
                      />
                      <label htmlFor={`write-${item.id}`} className="text-sm flex items-center gap-1">
                        <Pencil className="w-3 h-3" /> Write
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPermissions(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  permissionMutation.mutate({ userId: selectedUser.id, permissions });
                }
              }}
              disabled={permissionMutation.isPending}
              data-testid="button-save-permissions"
            >
              {permissionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
