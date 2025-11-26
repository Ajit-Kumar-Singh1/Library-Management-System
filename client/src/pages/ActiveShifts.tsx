import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, User, UserRound, CheckCircle, XCircle } from "lucide-react";
import type { Shift } from "@shared/schema";

interface SeatAllocationData {
  seatId: number;
  seatNumber: number;
  status: "vacant" | "occupied" | "blocked";
  gender?: string;
  studentName?: string;
  studentId?: string;
  shiftId: number;
}

interface SeatGridData {
  totalSeats: number;
  shifts: Shift[];
  allocations: SeatAllocationData[];
}

interface LibraryContextProps {
  libraryId: number | null;
}

function StatusCell({ 
  status, 
  gender, 
  studentName, 
  studentId 
}: { 
  status: "vacant" | "occupied" | "blocked";
  gender?: string;
  studentName?: string;
  studentId?: string;
}) {
  if (status === "vacant") {
    return (
      <div className="flex items-center justify-center">
        <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Vacant
        </Badge>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="flex items-center justify-center">
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Blocked
        </Badge>
      </div>
    );
  }

  const content = (
    <Badge 
      className={`${
        gender === "male" 
          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" 
          : "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800"
      }`}
    >
      {gender === "male" ? (
        <User className="w-3 h-3 mr-1" />
      ) : (
        <UserRound className="w-3 h-3 mr-1" />
      )}
      Occupied
    </Badge>
  );

  if (studentName) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center cursor-help">
            {content}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{studentName}</p>
            <p className="text-muted-foreground text-xs">{studentId}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="flex items-center justify-center">{content}</div>;
}

export default function ActiveShifts({ libraryId }: LibraryContextProps) {
  const { data: seatData, isLoading } = useQuery<SeatGridData>({
    queryKey: ["/api/seats/grid", libraryId],
    enabled: !!libraryId,
  });

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to view active shifts
          </p>
        </div>
      </div>
    );
  }

  const getSeatStatusForShift = (seatNumber: number, shiftId: number): SeatAllocationData | null => {
    if (!seatData) return null;
    return seatData.allocations.find(
      a => a.seatNumber === seatNumber && a.shiftId === shiftId
    ) || null;
  };

  const calculateShiftStats = (shiftId: number) => {
    if (!seatData) return { occupied: 0, vacant: 0, blocked: 0, male: 0, female: 0 };
    
    const shiftAllocations = seatData.allocations.filter(a => a.shiftId === shiftId);
    const occupied = shiftAllocations.filter(a => a.status === "occupied").length;
    const blocked = shiftAllocations.filter(a => a.status === "blocked").length;
    const male = shiftAllocations.filter(a => a.status === "occupied" && a.gender === "male").length;
    const female = shiftAllocations.filter(a => a.status === "occupied" && a.gender === "female").length;
    const vacant = (seatData.totalSeats || 0) - occupied - blocked;
    
    return { occupied, vacant, blocked, male, female };
  };

  const allSeats = Array.from(
    { length: seatData?.totalSeats || 0 }, 
    (_, i) => i + 1
  );

  return (
    <div className="space-y-6" data-testid="active-shifts-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active Shifts</h1>
        <p className="text-muted-foreground">View seat allocation status across all shifts</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {seatData?.shifts.map((shift) => {
              const stats = calculateShiftStats(shift.id);
              return (
                <Card key={shift.id} data-testid={`shift-card-${shift.id}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {shift.name}
                    </CardTitle>
                    <CardDescription>
                      {shift.startTime} - {shift.endTime}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {stats.vacant}
                        </p>
                        <p className="text-xs text-muted-foreground">Vacant</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-primary">
                          {stats.occupied}
                        </p>
                        <p className="text-xs text-muted-foreground">Occupied</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-destructive">
                          {stats.blocked}
                        </p>
                        <p className="text-xs text-muted-foreground">Blocked</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seat Allocation Matrix</CardTitle>
              <CardDescription>
                Rows represent seat numbers, columns represent shifts. Hover over occupied seats to see student details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vacant
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    <User className="w-3 h-3 mr-1" />
                    Male
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800">
                    <UserRound className="w-3 h-3 mr-1" />
                    Female
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                </div>
              </div>

              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 sticky left-0 bg-background z-10">
                          Seat #
                        </TableHead>
                        {seatData?.shifts.map((shift) => (
                          <TableHead 
                            key={shift.id} 
                            className="text-center min-w-[120px]"
                            data-testid={`header-shift-${shift.id}`}
                          >
                            <div className="font-medium">{shift.name}</div>
                            <div className="text-xs text-muted-foreground font-normal">
                              {shift.startTime} - {shift.endTime}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allSeats.map((seatNumber) => (
                        <TableRow key={seatNumber} data-testid={`row-seat-${seatNumber}`}>
                          <TableCell className="font-medium sticky left-0 bg-background z-10">
                            Seat {seatNumber}
                          </TableCell>
                          {seatData?.shifts.map((shift) => {
                            const allocation = getSeatStatusForShift(seatNumber, shift.id);
                            return (
                              <TableCell 
                                key={shift.id} 
                                className="text-center"
                                data-testid={`cell-seat-${seatNumber}-shift-${shift.id}`}
                              >
                                <StatusCell
                                  status={allocation?.status || "vacant"}
                                  gender={allocation?.gender}
                                  studentName={allocation?.studentName}
                                  studentId={allocation?.studentId}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
