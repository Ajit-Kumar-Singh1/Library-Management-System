import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Search, 
  Loader2, 
  IndianRupee, 
  Calendar,
  Plus,
  Ban,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import type { Subscription, Student, Payment } from "@shared/schema";

interface SubscriptionWithDetails extends Subscription {
  studentName: string;
  studentIdCode: string;
  seatNumber: number;
}

interface LibraryContextProps {
  libraryId: number | null;
}

export default function ManageSubscriptions({ libraryId }: LibraryContextProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  
  // Renewal form state
  const [renewalStartDate, setRenewalStartDate] = useState("");
  const [renewalEndDate, setRenewalEndDate] = useState("");
  const [renewalCost, setRenewalCost] = useState("");
  const [renewalPaidAmount, setRenewalPaidAmount] = useState("0");
  const [renewalDiscount, setRenewalDiscount] = useState("0");
  const [renewalSecurityDeposit, setRenewalSecurityDeposit] = useState("0");

  const { data: subscriptions, isLoading } = useQuery<SubscriptionWithDetails[]>({
    queryKey: ["/api/subscriptions", libraryId],
    enabled: !!libraryId,
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (data: { subscriptionId: number; amount: string; paymentMode: string }) => {
      return await apiRequest("POST", "/api/payments", {
        ...data,
        libraryId,
        studentId: selectedSubscription?.studentId,
        paymentDate: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment Added",
        description: "The payment has been recorded successfully.",
      });
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setSelectedSubscription(null);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/subscriptions/${id}/cancel`);
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "The subscription has been cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Cancel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("PATCH", `/api/subscriptions/${id}/close`);
    },
    onSuccess: () => {
      toast({
        title: "Subscription Closed",
        description: "The subscription has been closed successfully. The seat is now available.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Close",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renewMutation = useMutation({
    mutationFn: async (data: {
      subscriptionId: number;
      planStartDate: string;
      planEndDate: string;
      subscriptionCost: string;
      paidAmount: string;
      discount: string;
      securityDeposit: string;
    }) => {
      return await apiRequest("POST", `/api/subscriptions/${data.subscriptionId}/renew`, {
        ...data,
        libraryId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Subscription Renewed",
        description: "The subscription has been renewed successfully.",
      });
      setShowRenewalDialog(false);
      resetRenewalForm();
      setSelectedSubscription(null);
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Renew",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetRenewalForm = () => {
    setRenewalStartDate("");
    setRenewalEndDate("");
    setRenewalCost("");
    setRenewalPaidAmount("0");
    setRenewalDiscount("0");
    setRenewalSecurityDeposit("0");
  };

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = 
      searchQuery === "" ||
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentIdCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "all" || 
      sub.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleAddPayment = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setPaymentAmount(subscription.pendingAmount);
    setShowPaymentDialog(true);
  };

  const confirmPayment = () => {
    if (selectedSubscription && paymentAmount) {
      addPaymentMutation.mutate({
        subscriptionId: selectedSubscription.id,
        amount: paymentAmount,
        paymentMode,
      });
    }
  };

  const handleRenewal = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    // Set default dates - start from day after current end date
    const currentEndDate = new Date(subscription.planEndDate);
    const newStartDate = new Date(currentEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);
    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1);
    
    setRenewalStartDate(newStartDate.toISOString().split("T")[0]);
    setRenewalEndDate(newEndDate.toISOString().split("T")[0]);
    setRenewalCost(subscription.subscriptionCost);
    setRenewalPaidAmount("0");
    setRenewalDiscount("0");
    setRenewalSecurityDeposit(subscription.securityDeposit || "0");
    setShowRenewalDialog(true);
  };

  const confirmRenewal = () => {
    if (selectedSubscription && renewalStartDate && renewalEndDate && renewalCost) {
      renewMutation.mutate({
        subscriptionId: selectedSubscription.id,
        planStartDate: renewalStartDate,
        planEndDate: renewalEndDate,
        subscriptionCost: renewalCost,
        paidAmount: renewalPaidAmount,
        discount: renewalDiscount,
        securityDeposit: renewalSecurityDeposit,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "expired":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "closed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "renewed":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to manage subscriptions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="manage-subscriptions-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Subscriptions</h1>
        <p className="text-muted-foreground">View and manage student subscriptions and payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">
              {subscriptions?.filter(s => s.status === "active").length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
              {subscriptions?.filter(s => s.status === "expired").length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-destructive">
              {subscriptions?.filter(s => s.status === "cancelled").length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-destructive flex items-center justify-center gap-1">
              <IndianRupee className="w-5 h-5" />
              {subscriptions
                ?.reduce((sum, s) => sum + parseFloat(s.pendingAmount || "0"), 0)
                .toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscriptions
              </CardTitle>
              <CardDescription>
                {filteredSubscriptions?.length || 0} subscriptions found
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
                  data-testid="input-search-subscription"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
            ) : !filteredSubscriptions || filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No subscriptions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center">Seat</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id} data-testid={`subscription-row-${sub.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.studentName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {sub.studentIdCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">#{sub.seatNumber}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{sub.planName}</p>
                          <p className="text-xs text-muted-foreground">
                            {sub.totalHours}h ({sub.shiftStart} - {sub.shiftEnd})
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(sub.planStartDate).toLocaleDateString()}</p>
                          <p className="text-muted-foreground">
                            to {new Date(sub.planEndDate).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1">
                          <IndianRupee className="w-3 h-3" />
                          {parseFloat(sub.subscriptionCost).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <IndianRupee className="w-3 h-3" />
                          {parseFloat(sub.paidAmount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`flex items-center justify-end gap-1 font-medium ${
                          parseFloat(sub.pendingAmount) > 0 ? "text-destructive" : ""
                        }`}>
                          <IndianRupee className="w-3 h-3" />
                          {parseFloat(sub.pendingAmount).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {sub.status === "active" && parseFloat(sub.pendingAmount) > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleAddPayment(sub)}
                              data-testid={`button-add-payment-${sub.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          {(sub.status === "active" || sub.status === "expired") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary"
                              onClick={() => handleRenewal(sub)}
                              data-testid={`button-renew-${sub.id}`}
                              title="Renew subscription"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {sub.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-600 hover:text-blue-600"
                              onClick={() => {
                                if (confirm("Are you sure you want to close this subscription? This means the student has completed their plan and their seat will be released.")) {
                                  closeMutation.mutate(sub.id);
                                }
                              }}
                              data-testid={`button-close-${sub.id}`}
                              title="Close subscription (completed)"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {sub.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this subscription?")) {
                                  cancelMutation.mutate(sub.id);
                                }
                              }}
                              data-testid={`button-cancel-${sub.id}`}
                              title="Cancel subscription"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
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

      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) setSelectedSubscription(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedSubscription?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Subscription Cost</p>
                  <p className="font-medium flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {parseFloat(selectedSubscription?.subscriptionCost || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Already Paid</p>
                  <p className="font-medium text-green-600 flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {parseFloat(selectedSubscription?.paidAmount || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Discount</p>
                  <p className="font-medium flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {parseFloat(selectedSubscription?.discount || "0").toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending Amount</p>
                  <p className="font-medium text-destructive flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {parseFloat(selectedSubscription?.pendingAmount || "0").toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="pl-9"
                  placeholder="0"
                  data-testid="input-payment-amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger data-testid="select-payment-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPayment}
              disabled={!paymentAmount || addPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {addPaymentMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenewalDialog} onOpenChange={(open) => {
        setShowRenewalDialog(open);
        if (!open) {
          setSelectedSubscription(null);
          resetRenewalForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Renew Subscription
            </DialogTitle>
            <DialogDescription>
              Renew subscription for {selectedSubscription?.studentName} (Seat #{selectedSubscription?.seatNumber})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Plan</p>
                  <p className="font-medium">{selectedSubscription?.planName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current End Date</p>
                  <p className="font-medium">
                    {selectedSubscription?.planEndDate && 
                      new Date(selectedSubscription.planEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Start Date *</label>
                <Input
                  type="date"
                  value={renewalStartDate}
                  onChange={(e) => setRenewalStartDate(e.target.value)}
                  data-testid="input-renewal-start-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New End Date *</label>
                <Input
                  type="date"
                  value={renewalEndDate}
                  onChange={(e) => setRenewalEndDate(e.target.value)}
                  data-testid="input-renewal-end-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subscription Amount *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={renewalCost}
                    onChange={(e) => setRenewalCost(e.target.value)}
                    className="pl-9"
                    placeholder="0"
                    data-testid="input-renewal-cost"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Paid Amount</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={renewalPaidAmount}
                    onChange={(e) => setRenewalPaidAmount(e.target.value)}
                    className="pl-9"
                    placeholder="0"
                    data-testid="input-renewal-paid"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={renewalDiscount}
                    onChange={(e) => setRenewalDiscount(e.target.value)}
                    className="pl-9"
                    placeholder="0"
                    data-testid="input-renewal-discount"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Security Money (Locker)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={renewalSecurityDeposit}
                    onChange={(e) => setRenewalSecurityDeposit(e.target.value)}
                    className="pl-9"
                    placeholder="0"
                    data-testid="input-renewal-security"
                  />
                </div>
              </div>
            </div>

            {renewalCost && (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Amount:</span>
                  <span className="font-medium flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {Math.max(0, parseFloat(renewalCost || "0") - parseFloat(renewalPaidAmount || "0") - parseFloat(renewalDiscount || "0")).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setShowRenewalDialog(false);
              resetRenewalForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={confirmRenewal}
              disabled={!renewalStartDate || !renewalEndDate || !renewalCost || renewMutation.isPending}
              data-testid="button-confirm-renewal"
            >
              {renewMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Renew Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
