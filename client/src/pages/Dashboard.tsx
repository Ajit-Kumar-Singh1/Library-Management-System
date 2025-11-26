import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Armchair,
  UserCheck,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Receipt,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  totalSeats: number;
  occupiedSeats: number;
  activeStudents: number;
  totalBoys: number;
  totalGirls: number;
}

interface PaymentOverview {
  month: string;
  amount: number;
}

interface RecentExpense {
  id: number;
  purpose: string;
  amount: string;
  date: string;
}

interface RecentPayment {
  id: number;
  studentName: string;
  amount: string;
  date: string;
}

interface UpcomingRenewal {
  id: number;
  studentName: string;
  planEndDate: string;
  amount: string;
}

interface StudentWithDue {
  id: number;
  studentName: string;
  pendingAmount: string;
  seatNo: number;
}

interface PeakDay {
  date: string;
  totalAmount: number;
  paymentCount: number;
}

interface LibraryContextProps {
  libraryId: number | null;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {trend && (
            <Badge 
              variant="secondary" 
              className={`text-xs ${trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {trend.positive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {trend.value}%
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-3xl font-semibold tabular-nums">{value}</h3>
          <p className="text-sm text-muted-foreground mt-1">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function DataTable<T extends { id: number }>({
  title,
  description,
  data,
  columns,
  loading,
  emptyMessage,
}: {
  title: string;
  description?: string;
  data: T[] | undefined;
  columns: { key: keyof T | string; label: string; render?: (item: T) => React.ReactNode }[];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-[280px]">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {emptyMessage}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className="text-left text-xs font-medium text-muted-foreground py-2 px-2 first:pl-0"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/50 last:border-0 ${
                      idx % 2 === 0 ? 'bg-muted/30' : ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className="py-2.5 px-2 first:pl-0 text-sm"
                      >
                        {col.render
                          ? col.render(item)
                          : String(item[col.key as keyof T] || "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ libraryId }: LibraryContextProps) {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", libraryId],
    enabled: !!libraryId,
  });

  const { data: paymentOverview, isLoading: paymentLoading } = useQuery<PaymentOverview[]>({
    queryKey: ["/api/dashboard/payment-overview", libraryId],
    enabled: !!libraryId,
  });

  const { data: recentExpenses, isLoading: expensesLoading } = useQuery<RecentExpense[]>({
    queryKey: ["/api/dashboard/recent-expenses", libraryId],
    enabled: !!libraryId,
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery<RecentPayment[]>({
    queryKey: ["/api/dashboard/recent-payments", libraryId],
    enabled: !!libraryId,
  });

  const { data: upcomingRenewals, isLoading: renewalsLoading } = useQuery<UpcomingRenewal[]>({
    queryKey: ["/api/dashboard/upcoming-renewals", libraryId],
    enabled: !!libraryId,
  });

  const { data: studentsWithDue, isLoading: dueLoading } = useQuery<StudentWithDue[]>({
    queryKey: ["/api/dashboard/students-with-due", libraryId],
    enabled: !!libraryId,
  });

  const { data: peakDays, isLoading: peakLoading } = useQuery<PeakDay[]>({
    queryKey: ["/api/dashboard/peak-days", libraryId],
    enabled: !!libraryId,
  });

  const genderData = stats
    ? [
        { name: "Boys", value: stats.totalBoys, color: CHART_COLORS[0] },
        { name: "Girls", value: stats.totalGirls, color: CHART_COLORS[1] },
      ]
    : [];

  const occupancyData = stats
    ? [
        { name: "Occupied", value: stats.occupiedSeats, color: CHART_COLORS[2] },
        { name: "Vacant", value: stats.totalSeats - stats.occupiedSeats, color: CHART_COLORS[3] },
      ]
    : [];

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library from the sidebar to view the dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your library's performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Seats"
          value={stats?.totalSeats || 0}
          icon={Armchair}
          loading={statsLoading}
        />
        <StatCard
          title="Occupied Seats"
          value={stats?.occupiedSeats || 0}
          icon={UserCheck}
          subtitle={stats ? `${Math.round((stats.occupiedSeats / stats.totalSeats) * 100)}% occupancy` : undefined}
          loading={statsLoading}
        />
        <StatCard
          title="Active Students"
          value={stats?.activeStudents || 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Gender Distribution"
          value={`${stats?.totalBoys || 0}M / ${stats?.totalGirls || 0}F`}
          icon={Users}
          subtitle="Male / Female ratio"
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Payment Overview (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paymentOverview || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-popover-border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{payload[0].payload.month}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <IndianRupee className="w-3 h-3" />
                              {Number(payload[0].value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Gender</p>
              {statsLoading ? (
                <Skeleton className="h-[120px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="middle" 
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Occupancy</p>
              {statsLoading ? (
                <Skeleton className="h-[120px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={occupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend 
                      verticalAlign="middle" 
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Recent Expenses"
          description="Last 10 expenses"
          data={recentExpenses}
          loading={expensesLoading}
          emptyMessage="No recent expenses"
          columns={[
            { key: "purpose", label: "Purpose" },
            {
              key: "amount",
              label: "Amount",
              render: (item) => (
                <span className="flex items-center gap-1 font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {Number(item.amount).toLocaleString()}
                </span>
              ),
            },
            {
              key: "date",
              label: "Date",
              render: (item) => (
                <span className="text-muted-foreground">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              ),
            },
          ]}
        />

        <DataTable
          title="Recent Payments"
          description="Last 10 payments received"
          data={recentPayments}
          loading={paymentsLoading}
          emptyMessage="No recent payments"
          columns={[
            { key: "studentName", label: "Student" },
            {
              key: "amount",
              label: "Amount",
              render: (item) => (
                <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                  <IndianRupee className="w-3 h-3" />
                  {Number(item.amount).toLocaleString()}
                </span>
              ),
            },
            {
              key: "date",
              label: "Date",
              render: (item) => (
                <span className="text-muted-foreground">
                  {new Date(item.date).toLocaleDateString()}
                </span>
              ),
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DataTable
          title="Upcoming Renewals"
          description="Next 10 renewals due"
          data={upcomingRenewals}
          loading={renewalsLoading}
          emptyMessage="No upcoming renewals"
          columns={[
            { key: "studentName", label: "Student" },
            {
              key: "planEndDate",
              label: "Due Date",
              render: (item) => (
                <Badge variant="outline" className="text-xs">
                  {new Date(item.planEndDate).toLocaleDateString()}
                </Badge>
              ),
            },
            {
              key: "amount",
              label: "Amount",
              render: (item) => (
                <span className="flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  {Number(item.amount).toLocaleString()}
                </span>
              ),
            },
          ]}
        />

        <DataTable
          title="Students with Due Fees"
          description="Pending payments"
          data={studentsWithDue}
          loading={dueLoading}
          emptyMessage="No pending dues"
          columns={[
            { key: "studentName", label: "Student" },
            { key: "seatNo", label: "Seat" },
            {
              key: "pendingAmount",
              label: "Pending",
              render: (item) => (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {Number(item.pendingAmount).toLocaleString()}
                </span>
              ),
            },
          ]}
        />

        <DataTable
          title="Peak Payment Days"
          description="Top 5 days this month"
          data={peakDays}
          loading={peakLoading}
          emptyMessage="No payment data"
          columns={[
            {
              key: "date",
              label: "Date",
              render: (item) => (
                <span className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {new Date(item.date).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: "paymentCount",
              label: "Count",
              render: (item) => (
                <Badge variant="secondary" className="text-xs">
                  {item.paymentCount}
                </Badge>
              ),
            },
            {
              key: "totalAmount",
              label: "Total",
              render: (item) => (
                <span className="flex items-center gap-1 font-medium">
                  <IndianRupee className="w-3 h-3" />
                  {Number(item.totalAmount).toLocaleString()}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
