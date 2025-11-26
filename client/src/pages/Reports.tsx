import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FileText, 
  Users, 
  Calendar, 
  Receipt, 
  CreditCard,
  Download,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import type { ReportsConfig } from "@shared/schema";

interface ReportColumn {
  key: string;
  label: string;
  type?: string;
}

interface LibraryContextProps {
  libraryId: number | null;
}

const reportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "active-inactive-students": Users,
  "upcoming-renewals": Calendar,
  "monthly-expenses": Receipt,
  "monthly-payments": CreditCard,
};

export default function Reports({ libraryId }: LibraryContextProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: reportsConfig, isLoading: configLoading } = useQuery<ReportsConfig[]>({
    queryKey: ["/api/reports/config"],
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<any[]>({
    queryKey: ["/api/reports/data", libraryId, selectedReport, { status: filterStatus !== "all" ? filterStatus : undefined }],
    enabled: !!libraryId && !!selectedReport,
  });

  const selectedReportConfig = reportsConfig?.find(r => r.reportKey === selectedReport);
  const columns: ReportColumn[] = selectedReportConfig?.columns 
    ? (typeof selectedReportConfig.columns === 'string' 
        ? JSON.parse(selectedReportConfig.columns) 
        : selectedReportConfig.columns as ReportColumn[])
    : [];

  const handleExportCSV = () => {
    if (!reportData || !columns.length) return;
    
    const headers = columns.map(c => c.label).join(",");
    const rows = reportData.map(row => 
      columns.map(c => {
        const value = row[c.key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return "-";
    
    if (type === "currency") {
      return (
        <span className="flex items-center gap-1">
          <IndianRupee className="w-3 h-3" />
          {Number(value).toLocaleString()}
        </span>
      );
    }
    if (type === "date") {
      return new Date(value).toLocaleDateString();
    }
    if (type === "status") {
      const isActive = value === "active";
      return (
        <Badge 
          className={`text-xs ${
            isActive
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {value}
        </Badge>
      );
    }
    return String(value);
  };

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to view reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and view various library reports</p>
      </div>

      {!selectedReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configLoading ? (
            [...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            reportsConfig?.map((report) => {
              const Icon = reportIcons[report.reportKey] || FileText;
              return (
                <Card 
                  key={report.id}
                  className="hover-elevate cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedReport(report.reportKey)}
                  data-testid={`report-card-${report.reportKey}`}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{report.reportName}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {report.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setSelectedReport(null)}
              data-testid="button-back-reports"
            >
              <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Reports
            </Button>
            <div className="flex gap-3">
              {selectedReport === "active-inactive-students" && (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={!reportData?.length}
                data-testid="button-export-csv"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedReportConfig?.reportName}
              </CardTitle>
              <CardDescription>
                {reportData?.length || 0} records found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {reportLoading ? (
                  <div className="space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !reportData || reportData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No data available for this report</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col.key}>{col.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row, idx) => (
                        <TableRow key={idx} data-testid={`report-row-${idx}`}>
                          {columns.map((col) => (
                            <TableCell key={col.key}>
                              {formatCellValue(row[col.key], col.type)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
