import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Building2, 
  Plus, 
  Loader2, 
  CheckCircle, 
  Armchair,
  Clock,
  Users,
  Edit,
  Trash2,
} from "lucide-react";
import type { Library } from "@shared/schema";

const librarySchema = z.object({
  name: z.string().min(2, "Library name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  totalSeats: z.number().min(1, "At least 1 seat is required").max(500, "Maximum 500 seats"),
  description: z.string().optional(),
  adminUsername: z.string().min(3, "Username must be at least 3 characters"),
  adminPassword: z.string().min(4, "Password must be at least 4 characters"),
  adminEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

type LibraryForm = z.infer<typeof librarySchema>;

export default function LibraryOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdLibrary, setCreatedLibrary] = useState<Library | null>(null);

  const form = useForm<LibraryForm>({
    resolver: zodResolver(librarySchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      totalSeats: 90,
      description: "",
      adminUsername: "",
      adminPassword: "",
      adminEmail: "",
    },
  });

  const { data: libraries, isLoading } = useQuery<Library[]>({
    queryKey: ["/api/libraries"],
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: LibraryForm) => {
      return await apiRequest("POST", "/api/libraries/onboard", data);
    },
    onSuccess: (data: Library) => {
      setCreatedLibrary(data);
      setShowSuccessDialog(true);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/libraries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Onboarding Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/libraries/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Library Deleted",
        description: "The library and all associated data have been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/libraries"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LibraryForm) => {
    createMutation.mutate(data);
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="font-medium">Access Denied</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Only Creator Admin can access library onboarding
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="library-onboarding-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Library Onboarding</h1>
        <p className="text-muted-foreground">Onboard new libraries with automatic configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Onboard New Library
            </CardTitle>
            <CardDescription>
              Create a new library with auto-configured seats, shifts, and admin user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Library Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Library Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., City Central Library" 
                              {...field} 
                              data-testid="input-library-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalSeats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Seats *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="90" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-library-seats"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            This will create seats numbered 1 to N
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+91 9876543210" {...field} />
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
                            <Input type="email" placeholder="library@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Full library address" 
                            className="resize-none" 
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes about the library" 
                            className="resize-none" 
                            rows={2}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground">Admin Account</h3>
                  <p className="text-xs text-muted-foreground">
                    This will create a library admin who can manage this specific library
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="adminUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Username *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="libadmin" 
                              {...field} 
                              data-testid="input-admin-username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Password *</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="********" 
                              {...field} 
                              data-testid="input-admin-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adminEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="admin@example.com" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-3">Auto-Configuration</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Armchair className="w-4 h-4 text-primary" />
                      <span>Seats created automatically</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>4 shifts (6h each)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Admin user created</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>Menu permissions set</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-onboard-library"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Onboarding...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Onboard Library
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Onboarded Libraries
            </CardTitle>
            <CardDescription>
              {libraries?.length || 0} libraries in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !libraries || libraries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No libraries onboarded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {libraries.map((library) => (
                    <div
                      key={library.id}
                      className="p-4 rounded-lg border border-border bg-card/50 space-y-2"
                      data-testid={`library-card-${library.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{library.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {library.address || "No address"}
                          </p>
                        </div>
                        <Badge 
                          className={`text-xs ${
                            library.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {library.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Armchair className="w-3 h-3" />
                            {library.totalSeats} seats
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Are you sure? This will delete all library data.")) {
                              deleteMutation.mutate(library.id);
                            }
                          }}
                          data-testid={`button-delete-library-${library.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Library Onboarded Successfully!
            </DialogTitle>
            <DialogDescription>
              The library has been created with all configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-3">
                {createdLibrary?.name}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Seats</p>
                  <p className="font-medium">{createdLibrary?.totalSeats}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shifts Created</p>
                  <p className="font-medium">4 (6 hours each)</p>
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>The following have been automatically configured:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{createdLibrary?.totalSeats} seats numbered 1-{createdLibrary?.totalSeats}</li>
                <li>4 shifts: 6AM-12PM, 12PM-6PM, 6PM-12AM, 12AM-6AM</li>
                <li>Admin user with full access</li>
                <li>All menu permissions for admin</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowSuccessDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
