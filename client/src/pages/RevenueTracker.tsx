import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { DollarSign, IndianRupee, Calendar, Search, TrendingUp, Filter } from "lucide-react";
import type { Payment } from "@shared/schema";

interface PaymentWithStudent extends Payment {
  studentName: string;
  studentId: string;
  seatNumber: number;
}

interface RevenueSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentCount: number;
  averagePayment: number;
}

interface LibraryContextProps {
  libraryId: number | null;
}

export default function RevenueTracker({ libraryId }: LibraryContextProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterMode, setFilterMode] = useState<string>("all");

  const { data: payments, isLoading } = useQuery<PaymentWithStudent[]>({
    queryKey: ["/api/payments", libraryId],
    enabled: !!libraryId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<RevenueSummary>({
    queryKey: ["/api/payments/summary", libraryId],
    enabled: !!libraryId,
  });

  const months = [
    { value: "all", label: "All Time" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
  ];

  const paymentModes = [
    { value: "all", label: "All Modes" },
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  const filteredPayments = payments?.filter((payment) => {
    const matchesSearch = 
      searchQuery === "" ||
      payment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const paymentDate = new Date(payment.paymentDate);
    const matchesMonth = 
      filterMonth === "all" || 
      paymentDate.getMonth().toString() === filterMonth;
    
    const matchesMode = 
      filterMode === "all" || 
      payment.paymentMode === filterMode;

    return matchesSearch && matchesMonth && matchesMode;
  });

  const filteredTotal = filteredPayments?.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  ) || 0;

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to track revenue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="revenue-tracker-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue Tracker</h1>
        <p className="text-muted-foreground">View and analyze payment collections</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {(summary?.totalRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-xl font-semibold flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {(summary?.monthlyRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Total Payments</p>
                <p className="text-xl font-semibold">{summary?.paymentCount || 0}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {summaryLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Average Payment</p>
                <p className="text-xl font-semibold flex items-center gap-1">
                  <IndianRupee className="w-4 h-4" />
                  {Math.round(summary?.averagePayment || 0).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Records
              </CardTitle>
              <CardDescription>
                {filteredPayments?.length || 0} payments found
                {filteredTotal > 0 && (
                  <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                    (Total: {filteredTotal.toLocaleString()})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                  data-testid="input-search-payment"
                />
              </div>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-month">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMode} onValueChange={setFilterMode}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-mode">
                  <SelectValue placeholder="Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !filteredPayments || filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No payments found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Seat</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                      <TableCell className="font-mono text-sm">
                        {payment.studentId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.studentName}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">#{payment.seatNumber}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 font-semibold text-green-600 dark:text-green-400">
                          <IndianRupee className="w-3 h-3" />
                          {parseFloat(payment.amount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">
                          {payment.paymentMode.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`text-xs ${
                            payment.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          }`}
                        >
                          {payment.status}
                        </Badge>
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
  );
}
