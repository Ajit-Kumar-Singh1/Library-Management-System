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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Loader2, Edit, RefreshCw, IndianRupee } from "lucide-react";
import type { Shift, Student, Subscription } from "@shared/schema";

const manageStudentSchema = z.object({
  studentName: z.string().min(2, "Name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Enter a valid mobile number"),
  emailId: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  description: z.string().optional(),
});

type ManageStudentForm = z.infer<typeof manageStudentSchema>;

interface StudentWithSubscription extends Student {
  subscription?: Subscription;
  seatNumber?: number;
}

interface LibraryContextProps {
  libraryId: number | null;
}

export default function ManageStudents({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithSubscription | null>(null);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewalData, setRenewalData] = useState({
    planStartDate: new Date().toISOString().split("T")[0],
    planEndDate: "",
    subscriptionCost: "",
    paidAmount: "0",
    discount: "0",
  });

  const form = useForm<ManageStudentForm>({
    resolver: zodResolver(manageStudentSchema),
    defaultValues: {
      studentName: "",
      mobileNo: "",
      emailId: "",
      gender: "male",
      guardianName: "",
      guardianPhone: "",
      address: "",
      status: "active",
      description: "",
    },
  });

  const { data: students, isLoading: studentsLoading } = useQuery<StudentWithSubscription[]>({
    queryKey: ["/api/students", libraryId, { searchQuery }],
    enabled: !!libraryId,
  });

  const { data: shifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", libraryId],
    enabled: !!libraryId,
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("GET", `/api/students/search/${libraryId}/${encodeURIComponent(query)}`);
      return response;
    },
    onSuccess: (data: StudentWithSubscription[]) => {
      if (data.length > 0) {
        loadStudentData(data[0]);
      } else {
        toast({
          title: "No Results",
          description: "No student found with that ID or name",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ManageStudentForm) => {
      return await apiRequest("PATCH", `/api/students/${selectedStudent?.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Student Updated",
        description: "Student information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (data: typeof renewalData) => {
      return await apiRequest("POST", `/api/subscriptions/renew/${selectedStudent?.id}`, {
        ...data,
        libraryId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Subscription Renewed",
        description: "The subscription has been renewed successfully.",
      });
      setShowRenewDialog(false);
      setSelectedStudent(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Renewal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loadStudentData = (student: StudentWithSubscription) => {
    setSelectedStudent(student);
    form.reset({
      studentName: student.studentName,
      mobileNo: student.mobileNo,
      emailId: student.emailId || "",
      gender: student.gender as "male" | "female",
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
      address: student.address || "",
      status: student.status as "active" | "inactive",
      description: student.description || "",
    });
    
    if (student.subscription) {
      setRenewalData({
        planStartDate: new Date().toISOString().split("T")[0],
        planEndDate: "",
        subscriptionCost: student.subscription.subscriptionCost,
        paidAmount: "0",
        discount: "0",
      });
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const onSubmit = (data: ManageStudentForm) => {
    updateMutation.mutate(data);
  };

  const handleRenew = () => {
    if (selectedStudent?.status === "active") {
      setShowRenewDialog(true);
    } else {
      renewMutation.mutate(renewalData);
    }
  };

  const confirmRenewal = () => {
    renewMutation.mutate(renewalData);
  };

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to manage students
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manage-students-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Students</h1>
        <p className="text-muted-foreground">Search, update, and renew student subscriptions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter Student ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="max-w-md"
              data-testid="input-search-student"
            />
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              data-testid="button-search"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Student Details
            </CardTitle>
            <CardDescription>
              {selectedStudent 
                ? `Editing: ${selectedStudent.studentName} (${selectedStudent.studentId})` 
                : "Search for a student to edit their details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="studentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter full name" 
                            {...field} 
                            disabled={!selectedStudent}
                            data-testid="input-edit-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter mobile number" 
                            {...field} 
                            disabled={!selectedStudent}
                            data-testid="input-edit-mobile"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emailId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email" 
                            {...field} 
                            disabled={!selectedStudent}
                            data-testid="input-edit-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedStudent}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-gender">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardianName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter guardian name" 
                            {...field} 
                            disabled={!selectedStudent}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardianPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Phone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter guardian phone" 
                            {...field} 
                            disabled={!selectedStudent}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedStudent}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
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
                          placeholder="Enter full address" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                          disabled={!selectedStudent}
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
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                          disabled={!selectedStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRenew}
                    disabled={!selectedStudent || renewMutation.isPending}
                    data-testid="button-renew"
                  >
                    {renewMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Renew Subscription
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!selectedStudent || updateMutation.isPending}
                    data-testid="button-update"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Update
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
            <CardTitle className="text-lg">Subscription Info</CardTitle>
            <CardDescription>
              {selectedStudent?.subscription 
                ? "Current subscription details"
                : "No subscription data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent?.subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Seat Number</p>
                    <p className="font-medium">#{selectedStudent.seatNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{selectedStudent.subscription.planName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Hours</p>
                    <p className="font-medium">{selectedStudent.subscription.totalHours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Shift</p>
                    <p className="font-medium">
                      {selectedStudent.subscription.shiftStart} - {selectedStudent.subscription.shiftEnd}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {new Date(selectedStudent.subscription.planStartDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {new Date(selectedStudent.subscription.planEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {Number(selectedStudent.subscription.subscriptionCost).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {Number(selectedStudent.subscription.paidAmount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-medium flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {Number(selectedStudent.subscription.discount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending</p>
                    <p className="font-medium text-destructive flex items-center gap-1">
                      <IndianRupee className="w-3 h-3" />
                      {Number(selectedStudent.subscription.pendingAmount).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge 
                  className={`${
                    selectedStudent.subscription.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedStudent.subscription.status}
                </Badge>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {selectedStudent 
                  ? "No active subscription found"
                  : "Search for a student to view subscription"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              The current subscription is still active. This will mark the current subscription as inactive and create a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Start Date</label>
                <Input
                  type="date"
                  value={renewalData.planStartDate}
                  onChange={(e) => setRenewalData({ ...renewalData, planStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan End Date</label>
                <Input
                  type="date"
                  value={renewalData.planEndDate}
                  onChange={(e) => setRenewalData({ ...renewalData, planEndDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subscription Cost</label>
                <Input
                  type="number"
                  value={renewalData.subscriptionCost}
                  onChange={(e) => setRenewalData({ ...renewalData, subscriptionCost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Paid Amount</label>
                <Input
                  type="number"
                  value={renewalData.paidAmount}
                  onChange={(e) => setRenewalData({ ...renewalData, paidAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount</label>
                <Input
                  type="number"
                  value={renewalData.discount}
                  onChange={(e) => setRenewalData({ ...renewalData, discount: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRenewal} disabled={renewMutation.isPending}>
              {renewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm Renewal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
