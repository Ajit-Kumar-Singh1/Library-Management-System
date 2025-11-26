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

function SeatCell({ seat }: { seat: SeatAllocationData }) {
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

function SeatGrid({ seats, totalSeats }: { seats: SeatAllocationData[]; totalSeats: number }) {
  const columns = totalSeats <= 50 ? 10 : totalSeats <= 100 ? 10 : 15;
  
  const allSeats = Array.from({ length: totalSeats }, (_, i) => {
    const seatNumber = i + 1;
    const existingSeat = seats.find(s => s.seatNumber === seatNumber);
    return existingSeat || {
      seatId: 0,
      seatNumber,
      status: "vacant" as const,
      shiftId: 0,
    };
  });

  return (
    <div 
      className="grid gap-2"
      style={{ 
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {allSeats.map((seat) => (
        <SeatCell key={seat.seatNumber} seat={seat} />
      ))}
    </div>
  );
}

export default function SeatManagement({ libraryId }: LibraryContextProps) {
  const [selectedShift, setSelectedShift] = useState<string>("all");

  const { data: seatData, isLoading } = useQuery<SeatGridData>({
    queryKey: ["/api/seats/grid", libraryId],
    enabled: !!libraryId,
  });

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

  const calculateStats = () => {
    if (!seatData) return { vacant: 0, occupied: 0, blocked: 0, male: 0, female: 0, total: 0 };
    
    const totalSeats = seatData.totalSeats || 0;
    const shiftsCount = seatData.shifts?.length || 1;
    
    if (selectedShift === "all") {
      // For "All Shifts" view: Count across ALL shifts
      // A seat vacant in shift A and occupied in shift B counts as 1 vacant + 1 occupied
      // Same seat occupied by male in shift 1 and female in shift 2 = 1 male + 1 female
      const allAllocations = seatData.allocations;
      const occupied = allAllocations.filter(s => s.status === "occupied").length;
      const blocked = allAllocations.filter(s => s.status === "blocked").length;
      const male = allAllocations.filter(s => s.status === "occupied" && s.gender === "male").length;
      const female = allAllocations.filter(s => s.status === "occupied" && s.gender === "female").length;
      
      // Vacant = (total seats * number of shifts) - occupied - blocked allocations in the data
      // Since allocations only exist for occupied/blocked, vacant is computed from what's not allocated
      const totalSlots = totalSeats * shiftsCount;
      const vacant = totalSlots - occupied - blocked;
      
      return { vacant, occupied, blocked, male, female, total: totalSlots };
    } else {
      // For specific shift: count only that shift's allocations
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
          <p className="text-sm text-muted-foreground max-w-xs">
            Please select a library to view seat management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="seat-management-container">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seat Management</h1>
        <p className="text-muted-foreground">Visual overview of all seats and their allocation status</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.vacant}</p>
            <p className="text-xs text-muted-foreground">Vacant</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-primary">{stats.occupied}</p>
            <p className="text-xs text-muted-foreground">Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-destructive">{stats.blocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.male}</p>
            <p className="text-xs text-muted-foreground">Male</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-pink-600 dark:text-pink-400">{stats.female}</p>
            <p className="text-xs text-muted-foreground">Female</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                Seat Grid
              </CardTitle>
              <CardDescription>
                Click on a seat to view details. Hover to see student info.
              </CardDescription>
            </div>
            <StatusLegend />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-10 gap-2">
              {[...Array(50)].map((_, i) => (
                <Skeleton key={i} className="w-12 h-12 rounded-md" />
              ))}
            </div>
          ) : (
            <Tabs value={selectedShift} onValueChange={setSelectedShift}>
              <TabsList className="mb-6">
                <TabsTrigger value="all" data-testid="tab-all-shifts">
                  All Shifts
                </TabsTrigger>
                {seatData?.shifts.map((shift) => (
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
                      seats={getFilteredSeats()} 
                      totalSeats={seatData?.totalSeats || 0} 
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
