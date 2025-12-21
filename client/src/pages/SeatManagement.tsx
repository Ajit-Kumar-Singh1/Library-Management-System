import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Grid3X3, User, UserRound } from "lucide-react";
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

const StatusLegend = () => (
  <div className="flex flex-wrap gap-4 text-sm">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-sm bg-muted border border-border" />
      <span className="text-muted-foreground">Vacant</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-sm bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700" />
      <span className="text-muted-foreground">Male</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-sm bg-pink-100 dark:bg-pink-900 border border-pink-300 dark:border-pink-700" />
      <span className="text-muted-foreground">Female</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded-sm bg-destructive/20 border border-destructive/40" />
      <span className="text-muted-foreground">Blocked</span>
    </div>
  </div>
);

// Colors for shift pills in tooltip
const SHIFT_PILL_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200",
];

type TooltipStudent = {
  studentName: string;
  studentId?: string;
  shiftName?: string;
  shiftId?: number;
  startTime?: string;
  endTime?: string;
};

function SeatCell({
  seat,
  tooltipStudents,
}: {
  seat: SeatAllocationData;
  tooltipStudents?: TooltipStudent[];
}) {
  const getStatusClasses = () => {
    if (seat.status === "blocked") {
      return "bg-destructive/20 border-destructive/40 cursor-not-allowed";
    }
    if (seat.status === "occupied") {
      if (seat.gender === "male") {
        return "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700";
      }
      return "bg-pink-100 dark:bg-pink-900 border-pink-300 dark:border-pink-700";
    }
    return "bg-muted border-border hover-elevate cursor-pointer";
  };

  const content = (
    <div
      className={`
        relative w-12 h-12 rounded-md border-2 
        flex items-center justify-center
        transition-all duration-150
        ${getStatusClasses()}
      `}
      data-testid={`seat-${seat.seatNumber}`}
    >
      <span className="text-sm font-medium tabular-nums">{seat.seatNumber}</span>
      {seat.status === "occupied" && (
        <div className="absolute -top-1 -right-1">
          {seat.gender === "male" ? (
            <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          ) : (
            <UserRound className="w-3 h-3 text-pink-600 dark:text-pink-400" />
          )}
        </div>
      )}
    </div>
  );

  // Multi-student tooltip (All Shifts)
  if (tooltipStudents && tooltipStudents.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-2">
            {tooltipStudents.map((s, idx) => {
              const colorClass =
                SHIFT_PILL_COLORS[
                  (s.shiftId ?? idx) % SHIFT_PILL_COLORS.length
                ];

              const hasTime = s.startTime && s.endTime;

              return (
                <div key={idx} className="space-y-0.5">
                  {s.shiftName && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}
                    >
                      {s.shiftName}
                      {hasTime && (
                        <span className="ml-1 opacity-80">
                          {s.startTime}–{s.endTime}
                        </span>
                      )}
                    </span>
                  )}
                  <p className="font-medium leading-tight">{s.studentName}</p>
                  {s.studentId && (
                    <p className="text-xs text-muted-foreground leading-tight">
                      {s.studentId}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Old single-student tooltip behavior (for specific shift view)
  if (seat.status === "occupied" && seat.studentName) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{seat.studentName}</p>
            <p className="text-muted-foreground">{seat.studentId}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

function SeatGrid({
  seats,
  totalSeats,
  tooltipMap,
  selectedShift,
  shifts,
}: {
  seats: SeatAllocationData[];
  totalSeats: number;
  tooltipMap?: Map<number, TooltipStudent[]>;
  selectedShift: string;
  shifts?: Shift[];
}) {
  const columns = totalSeats <= 50 ? 10 : totalSeats <= 100 ? 10 : 15;

  const allSeats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNumber = i + 1;
    const existingSeat = seats.find((s) => s.seatNumber === seatNumber);
    return (
      existingSeat || {
        seatId: 0,
        seatNumber,
        status: "vacant" as const,
        shiftId: 0,
      }
    );
  });

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {allSeats.map((seat) => {
        let tooltipStudents: TooltipStudent[] | undefined;

        if (selectedShift === "all") {
          tooltipStudents = tooltipMap?.get(seat.seatNumber);
        } else if (seat.status === "occupied" && seat.studentName) {
          const shift = shifts?.find((s) => s.id === seat.shiftId);
          tooltipStudents = [
            {
              studentName: seat.studentName,
              studentId: seat.studentId,
              shiftName: shift?.name,
              shiftId: shift?.id,
              startTime: shift?.startTime,
              endTime: shift?.endTime,
            },
          ];
        }

        return (
          <SeatCell
            key={seat.seatNumber}
            seat={seat}
            tooltipStudents={tooltipStudents}
          />
        );
      })}
    </div>
  );
}

export default function SeatManagement({ libraryId }: LibraryContextProps) {
  const [selectedShift, setSelectedShift] = useState<string>("all");

  const { data: seatData, isLoading } = useQuery<SeatGridData>({
    queryKey: ["/api/seats/grid", libraryId],
    enabled: !!libraryId,
  });

  // Build tooltip map: seatNumber -> all students (with shift info) for that seat across shifts
  const buildTooltipMapForAllShifts = () => {
    if (!seatData)
      return new Map<number, TooltipStudent[]>();

    const map = new Map<number, TooltipStudent[]>();

    seatData.allocations.forEach((a) => {
      if (a.status === "occupied" && a.studentName) {
        const shift = seatData.shifts.find((s) => s.id === a.shiftId);
        const arr = map.get(a.seatNumber) ?? [];

        arr.push({
          studentName: a.studentName,
          studentId: a.studentId,
          shiftName: shift?.name,
          shiftId: shift?.id,
          startTime: shift?.startTime,
          endTime: shift?.endTime,
        });

        map.set(a.seatNumber, arr);
      }
    });

    return map;
  };

  const getFilteredSeats = () => {
    if (!seatData) return [];
    if (selectedShift === "all") {
      // For grid display, deduplicate by seat number (prefer occupied for display)
      const seatMap = new Map<number, SeatAllocationData>();
      seatData.allocations.forEach(seat => {
        const existing = seatMap.get(seat.seatNumber);
        if (!existing || seat.status === "occupied") {
          seatMap.set(seat.seatNumber, seat);
        }
      });
      return Array.from(seatMap.values());
    }
    return seatData.allocations.filter(
      seat => seat.shiftId === parseInt(selectedShift)
    );
  };

  const filteredSeats = getFilteredSeats();
  const tooltipMap = selectedShift === "all" ? buildTooltipMapForAllShifts() : undefined;

  const calculateStats = () => {
    if (!seatData) return { vacant: 0, occupied: 0, blocked: 0, male: 0, female: 0, total: 0 };
    
    const totalSeats = seatData.totalSeats || 0;
    const shiftsCount = seatData.shifts?.length || 1;
    
    if (selectedShift === "all") {
      // For "All Shifts" view: count across all shifts
      const allAllocations = seatData.allocations;
      const occupied = allAllocations.filter(s => s.status === "occupied").length;
      const blocked = allAllocations.filter(s => s.status === "blocked").length;
      const male = allAllocations.filter(s => s.status === "occupied" && s.gender === "male").length;
      const female = allAllocations.filter(s => s.status === "occupied" && s.gender === "female").length;
      
      const totalSlots = totalSeats * shiftsCount;
      const vacant = totalSlots - occupied - blocked;
      
      return { vacant, occupied, blocked, male, female, total: totalSlots };
    } else {
      const shiftAllocations = seatData.allocations.filter(
        s => s.shiftId === parseInt(selectedShift)
      );
      const occupied = shiftAllocations.filter(s => s.status === "occupied").length;
      const blocked = shiftAllocations.filter(s => s.status === "blocked").length;
      const male = shiftAllocations.filter(s => s.status === "occupied" && s.gender === "male").length;
      const female = shiftAllocations.filter(s => s.status === "occupied" && s.gender === "female").length;
      const vacant = totalSeats - occupied - blocked;
      
      return { vacant, occupied, blocked, male, female, total: totalSeats };
    }
  };

  const stats = calculateStats();

  if (!libraryId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Grid3X3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Select a Library</h3>
          <p className="text-sm text-muted-foreground">
            Choose a library from the sidebar to manage its seating layout and allocations.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !seatData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <div className="border rounded-lg p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: 50 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { shifts } = seatData;

  return (
    <div className="space-y-6" data-testid="seat-management-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seat Management</h1>
        <p className="text-muted-foreground">Visual overview of all seats and their allocation status</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-total-seats">
              {seatData.totalSeats}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-occupied-seats">
              {stats.occupied}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Occupied Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-vacant-seats">
              {stats.vacant}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Vacant Shifts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-blocked-seats">
              {stats.blocked}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-male-seats">
              {stats.male}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Male</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="stat-female-seats">
              {stats.female}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Female</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Seat Grid View</CardTitle>
            <CardDescription>
              Hover on a seat to view student details, including shift and timings.
            </CardDescription>
          </div>
          <StatusLegend />
        </CardHeader>
        <CardContent>
          <Tabs value={selectedShift} onValueChange={setSelectedShift} className="space-y-4">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-shifts">
                All Shifts
              </TabsTrigger>
              {shifts.map((shift) => (
                <TabsTrigger
                  key={shift.id}
                  value={shift.id.toString()}
                  data-testid={`tab-shift-${shift.id}`}
                >
                  {shift.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedShift} className="mt-0">
              <ScrollArea className="w-full">
                <div className="min-w-[600px] p-2">
                  <SeatGrid 
                    seats={filteredSeats} 
                    totalSeats={seatData?.totalSeats || 0}
                    tooltipMap={selectedShift === "all" ? tooltipMap : undefined}
                    selectedShift={selectedShift}
                    shifts={seatData?.shifts}
                  />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
