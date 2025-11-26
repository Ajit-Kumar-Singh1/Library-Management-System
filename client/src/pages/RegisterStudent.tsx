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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2, Calendar, IndianRupee } from "lucide-react";
import type { Shift, Seat, Student } from "@shared/schema";

const registerStudentSchema = z.object({
  studentName: z.string().min(2, "Name must be at least 2 characters"),
  mobileNo: z.string().min(10, "Enter a valid mobile number"),
  emailId: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gender: z.enum(["male", "female"]),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.string().min(1, "Admission date is required"),
  shiftIds: z.array(z.number()).min(1, "Select at least one shift"),
  seatId: z.number({ required_error: "Select a seat" }),
  planStartDate: z.string().min(1, "Plan start date is required"),
  planEndDate: z.string().min(1, "Plan end date is required"),
  subscriptionCost: z.string().min(1, "Subscription cost is required"),
  paidAmount: z.string().default("0"),
  discount: z.string().default("0"),
  description: z.string().optional(),
});

type RegisterStudentForm = z.infer<typeof registerStudentSchema>;

interface VacantSeat {
  id: number;
  seatNumber: number;
}

interface LibraryContextProps {
  libraryId: number | null;
}

export default function RegisterStudent({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedShifts, setSelectedShifts] = useState<number[]>([]);

  const form = useForm<RegisterStudentForm>({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      studentName: "",
      mobileNo: "",
      emailId: "",
      gender: "male",
      guardianName: "",
      guardianPhone: "",
      address: "",
      admissionDate: new Date().toISOString().split("T")[0],
      shiftIds: [],
      planStartDate: new Date().toISOString().split("T")[0],
      planEndDate: "",
      subscriptionCost: "",
      paidAmount: "0",
      discount: "0",
      description: "",
    },
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", libraryId],
    enabled: !!libraryId,
  });

  const { data: vacantSeats, isLoading: seatsLoading } = useQuery<VacantSeat[]>({
    queryKey: ["/api/seats/vacant", libraryId, { shiftIds: selectedShifts }],
    enabled: !!libraryId && selectedShifts.length > 0,
  });

  const { data: recentStudents, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students/recent", libraryId],
    enabled: !!libraryId,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterStudentForm) => {
      return await apiRequest("POST", "/api/students", {
        ...data,
        libraryId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Student Registered",
        description: "The student has been successfully registered.",
      });
      form.reset();
      setSelectedShifts([]);
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students/recent", libraryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleShiftToggle = (shiftId: number) => {
    const newShifts = selectedShifts.includes(shiftId)
      ? selectedShifts.filter((id) => id !== shiftId)
      : [...selectedShifts, shiftId];
    
    setSelectedShifts(newShifts);
    form.setValue("shiftIds", newShifts);
    form.setValue("seatId", undefined as any);
  };

  const calculateTotalHours = () => {
    if (!shifts) return 0;
    return selectedShifts.reduce((total, shiftId) => {
      const shift = shifts.find((s) => s.id === shiftId);
      return total + (shift?.totalHours || 0);
    }, 0);
  };

  const getShiftRange = () => {
    if (!shifts || selectedShifts.length === 0) return { start: "", end: "" };
    
    const selectedShiftData = shifts.filter((s) => selectedShifts.includes(s.id));
    const startTimes = selectedShiftData.map((s) => s.startTime);
    const endTimes = selectedShiftData.map((s) => s.endTime);
    
    return {
      start: startTimes.sort()[0] || "",
      end: endTimes.sort().reverse()[0] || "",
    };
  };

  const onSubmit = (data: RegisterStudentForm) => {
    const shiftRange = getShiftRange();
    registerMutation.mutate({
      ...data,
      shiftIds: selectedShifts,
    });
  };

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to register students
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="register-student-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register Student</h1>
        <p className="text-muted-foreground">Add a new student and allocate a seat</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Student Registration Form
            </CardTitle>
            <CardDescription>
              Fill in the student details and select a shift to allocate a seat
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
                            data-testid="input-student-name"
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
                            data-testid="input-mobile"
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
                            data-testid="input-email"
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
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-gender">
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
                            data-testid="input-guardian-name"
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
                            data-testid="input-guardian-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admissionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-admission-date"
                          />
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
                          placeholder="Enter full address" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel>Select Shifts *</FormLabel>
                  {shiftsLoading ? (
                    <div className="flex gap-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-32" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {shifts?.map((shift) => (
                        <Button
                          key={shift.id}
                          type="button"
                          variant={selectedShifts.includes(shift.id) ? "default" : "outline"}
                          className="h-auto py-2 px-4"
                          onClick={() => handleShiftToggle(shift.id)}
                          data-testid={`shift-${shift.id}`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{shift.name}</div>
                            <div className="text-xs opacity-80">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  {selectedShifts.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total Hours: <span className="font-medium">{calculateTotalHours()} hours</span>
                    </p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="seatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Seat *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        disabled={selectedShifts.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-seat">
                            <SelectValue placeholder={
                              selectedShifts.length === 0 
                                ? "Select shifts first" 
                                : seatsLoading 
                                  ? "Loading seats..." 
                                  : "Select a vacant seat"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vacantSeats?.length === 0 ? (
                            <div className="py-2 px-3 text-sm text-muted-foreground">
                              No vacant seats available for selected shifts
                            </div>
                          ) : (
                            vacantSeats?.map((seat) => (
                              <SelectItem 
                                key={seat.id} 
                                value={seat.id.toString()}
                              >
                                Seat #{seat.seatNumber}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="planStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Start Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-plan-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="planEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan End Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-plan-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="subscriptionCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Cost *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="pl-9"
                              {...field} 
                              data-testid="input-subscription-cost"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="pl-9"
                              {...field} 
                              data-testid="input-paid-amount"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="0" 
                              className="pl-9"
                              {...field} 
                              data-testid="input-discount"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes or comments" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                          data-testid="input-description"
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
                    onClick={() => {
                      form.reset();
                      setSelectedShifts([]);
                    }}
                    data-testid="button-reset"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Register Student
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
            <CardTitle className="text-lg">Recent Registrations</CardTitle>
            <CardDescription>Last 10 registered students</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {studentsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !recentStudents || recentStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No students registered yet
                </div>
              ) : (
                <div className="space-y-3">
                  {recentStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-3 rounded-lg border border-border/50 bg-card/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{student.studentName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {student.studentId}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{student.mobileNo}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            student.status === "active" 
                              ? "text-green-600 border-green-200 dark:text-green-400 dark:border-green-800" 
                              : "text-muted-foreground"
                          }`}
                        >
                          {student.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
