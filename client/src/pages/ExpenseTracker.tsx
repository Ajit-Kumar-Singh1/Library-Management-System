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
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Plus, Loader2, IndianRupee, Calendar, Trash2 } from "lucide-react";
import type { Expense } from "@shared/schema";

const expenseSchema = z.object({
  purpose: z.string().min(2, "Purpose is required"),
  subject: z.string().min(2, "Subject is required"),
  amount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  description: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

interface LibraryContextProps {
  libraryId: number | null;
}

export default function ExpenseTracker({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      purpose: "",
      subject: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
    },
  });

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", libraryId],
    enabled: !!libraryId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      return await apiRequest("POST", "/api/expenses", {
        ...data,
        libraryId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Expense Added",
        description: "The expense has been recorded successfully.",
      });
      form.reset({
        purpose: "",
        subject: "",
        amount: "",
        expenseDate: new Date().toISOString().split("T")[0],
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Expense Deleted",
        description: "The expense has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseForm) => {
    createMutation.mutate(data);
  };

  const totalExpenses = expenses?.reduce(
    (sum, exp) => sum + parseFloat(exp.amount), 
    0
  ) || 0;

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to track expenses
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="expense-tracker-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Tracker</h1>
          <p className="text-muted-foreground">Record and manage library expenses</p>
        </div>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 flex items-center gap-3">
            <IndianRupee className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-semibold text-destructive">
                {totalExpenses.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Expense
            </CardTitle>
            <CardDescription>Record a new expense entry</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purpose *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Office Supplies" 
                          {...field} 
                          data-testid="input-expense-purpose"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Printer Paper" 
                          {...field} 
                          data-testid="input-expense-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="pl-9"
                            {...field} 
                            data-testid="input-expense-amount"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-expense-date"
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
                          placeholder="Additional details..." 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                          data-testid="input-expense-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-add-expense"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Expense Records
            </CardTitle>
            <CardDescription>
              All recorded expenses for this library
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !expenses || expenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No expenses recorded yet</p>
                  <p className="text-sm">Add your first expense using the form</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">S.No</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense, idx) => (
                      <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                        <TableCell className="font-medium text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{expense.purpose}</p>
                            {expense.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {expense.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{expense.subject}</TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1 font-medium text-destructive">
                            <IndianRupee className="w-3 h-3" />
                            {parseFloat(expense.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(expense.expenseDate).toLocaleDateString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(expense.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-expense-${expense.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
