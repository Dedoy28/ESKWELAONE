import { Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
//
// --- !! CORRECTED IMPORTS HERE !! ---
//
import { NotFoundException } from "@zxing/library"; // Core exceptions
import {
  BrowserQRCodeReader, // Import the *browser* reader
  IScannerControls, // Import the *browser* controls type
} from "@zxing/browser";
//
// --- !! END OF CORRECTIONS !! ---
//
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Search,
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Eye,
  Trash2,
  CheckCircle2,
  QrCode,
  X,
} from "lucide-react";

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  quarter: number;
}

interface Student {
  id: number;
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  grade: number;
  section: string;
  gender: string;
  attendance_records?: AttendanceRecord[];
}

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "";

const statusConfig = {
  present: { label: "Present", color: "bg-green-500", icon: UserCheck },
  absent: { label: "Absent", color: "bg-red-500", icon: UserX },
  late: { label: "Late", color: "bg-orange-500", icon: Clock },
  excused: { label: "Excused", color: "bg-blue-500", icon: Shield },
};

const normalizeId = (id: string): string => {
  return String(id || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
};

// --- !! UPDATED FUNCTION HERE !! ---
const idsMatch = (id1: string, id2: string): boolean => {
  // Normalize both IDs: trim, uppercase, remove spaces
  const norm1 = normalizeId(id1);
  const norm2 = normalizeId(id2);

  if (norm1 === norm2) return true;

  // Also remove dashes for comparison
  const noDash1 = norm1.replace(/-/g, "");
  const noDash2 = norm2.replace(/-/g, "");

  // Fail-safe: if either is empty, don't match
  if (!noDash1 || !noDash2) return false;

  // NEW: Check if one ID ends with the other
  // This will match "SNDHS2015001256" with "2015001256"
  return noDash1.endsWith(noDash2) || noDash2.endsWith(noDash1);
};
// --- !! END OF UPDATE !! ---

const playSuccessSound = () => {
  try {
    const audio = new Audio("/ding.mp3");
    audio.play().catch(() => {});
  } catch (e) {}
};

export const StatsCards = ({
  filteredStudents,
  maleStudents,
  femaleStudents,
  quarter,
}: any) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <Card>
      <CardContent className="p-6">
        <div className="text-2xl font-bold text-primary">
          {filteredStudents.length}
        </div>
        <p className="text-sm text-muted-foreground">Total Students</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <div className="text-2xl font-bold text-blue-600">
          {maleStudents.length}
        </div>
        <p className="text-sm text-muted-foreground">Male Students</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <div className="text-2xl font-bold text-pink-600">
          {femaleStudents.length}
        </div>
        <p className="text-sm text-muted-foreground">Female Students</p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <div className="text-2xl font-bold text-accent">Quarter {quarter}</div>
        <p className="text-sm text-muted-foreground">Current Quarter</p>
      </CardContent>
    </Card>
  </div>
);

export const FilterCard = ({
  searchTerm,
  setSearchTerm,
  gradeFilter,
  setGradeFilter,
  sectionFilter,
  setSectionFilter,
  genderFilter,
  setGenderFilter,
  quarter,
  setQuarter,
  exportDate,
  setExportDate,
}: any) => (
  <Card>
    <CardHeader>
      <CardTitle>Filters & Settings</CardTitle>
      <CardDescription>Configure attendance tracking parameters</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Grade Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[7, 8, 9, 10].map((g) => (
              <SelectItem key={g} value={g.toString()}>
                Grade {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Section"
          value={sectionFilter === "all" ? "" : sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value || "all")}
        />
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={quarter.toString()}
          onValueChange={(value) => setQuarter(Number(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((q) => (
              <SelectItem key={q} value={q.toString()}>
                Quarter {q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={exportDate}
            onChange={(e) => setExportDate(e.target.value)}
            className="pl-10"
            title="Export Date"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

const AttendanceButtons = ({
  studentId,
  day,
  currentStatus,
  markAttendance,
}: any) => (
  <div className="flex gap-1 justify-center flex-wrap">
    {(["present", "absent", "late", "excused"] as AttendanceStatus[]).map(
      (status) => {
        const config = statusConfig[status];
        const isActive = currentStatus === status;
        return (
          <Button
            key={status}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={`h-8 w-8 p-0 ${
              isActive ? config.color + " text-white" : ""
            }`}
            onClick={() => markAttendance(studentId, day, status)}
            title={config.label}
          >
            {status[0].toUpperCase()}
          </Button>
        );
      }
    )}
  </div>
);

const MobileStudentCard = ({
  student,
  attendance,
  markAttendance,
  setSelectedStudent,
  todayLabel,
}: any) => (
  <Card className="mb-4">
    <CardContent className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-semibold">
            {student.last_name}, {student.first_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {student.student_id}
          </div>
          <div className="text-sm">
            Grade {student.grade} - {student.section}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedStudent(student)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
      <AttendanceButtons
        studentId={student.id}
        day={todayLabel}
        currentStatus={attendance[student.id]?.[todayLabel]}
        markAttendance={markAttendance}
      />
    </CardContent>
  </Card>
);

export const AttendanceTable = ({
  students,
  title,
  icon: Icon,
  attendance,
  markAttendance,
  setSelectedStudent,
  isMobile,
  todayLabel,
}: any) => (
  <Card className="mb-6">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        <CardTitle>{title}</CardTitle>
        <Badge variant="secondary">{students.length} students</Badge>
      </div>
    </CardHeader>
    <CardContent>
      {students.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No {title.toLowerCase()} found.</p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {students
            .sort((a: Student, b: Student) =>
              a.last_name.localeCompare(b.last_name)
            )
            .map((student: Student) => (
              <MobileStudentCard
                key={student.id}
                student={student}
                attendance={attendance}
                markAttendance={markAttendance}
                setSelectedStudent={setSelectedStudent}
                todayLabel={todayLabel}
              />
            ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-center">{todayLabel}</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students
                .sort((a: Student, b: Student) =>
                  a.last_name.localeCompare(b.last_name)
                )
                .map((student: Student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>
                      {student.last_name}, {student.first_name}
                    </TableCell>
                    <TableCell>Grade {student.grade}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell className="text-center">
                      <AttendanceButtons
                        studentId={student.id}
                        day={todayLabel}
                        currentStatus={attendance[student.id]?.[todayLabel]}
                        markAttendance={markAttendance}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

export const QRScannerModal = ({ isOpen, onClose, onScan, students }: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState("");
  const [scanStatus, setScanStatus] = useState("Initializing...");
  const [debugInfo, setDebugInfo] = useState("");
  const lastScanTimeRef = useRef<number>(0);
  const { toast } = useToast();

  // --- ZXing Refs ---
  // Use the BrowserQRCodeReader from @zxing/browser
  const codeReaderRef = useRef(new BrowserQRCodeReader());
  // Use the correct IScannerControls type from @zxing/browser
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    // Wrap startCamera in an async function to handle await
    const initCamera = async () => {
      if (isOpen) {
        await startCamera();
      } else {
        stopCamera();
      }
    };
    initCamera();

    // Cleanup function
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      setScanStatus("📷 Requesting camera access...");

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
      };

      // The 'await' here will resolve with the 'IScannerControls' object
      // This was the line causing the error
      const controls = await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err) => {
          // This callback runs on every frame
          if (result) {
            const now = Date.now();
            // Throttle scans to avoid multiple triggers
            if (now - lastScanTimeRef.current > 2000) {
              lastScanTimeRef.current = now;
              const scannedText = result.getText();

              if (scannedText !== lastScan) {
                setLastScan(scannedText);
                setScanStatus("✅ QR Code detected!");
                console.log("✅ QR Code detected:", scannedText);
                handleScan(scannedText); // This will call stopCamera
              }
            }
          }

          // Handle errors, but ignore NotFoundException (no QR code in frame)
          if (err && !(err instanceof NotFoundException)) {
            console.error("ZXing scan error:", err);
            setScanStatus(`❌ Scan error: ${err.message}`);
          }
        }
      );

      // Store controls to stop the camera later
      // This assignment should now work, as 'controls' is IScannerControls
      controlsRef.current = controls;

      // Get and set video dimensions for debug info
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.onloadedmetadata = () => {
          const width = videoEl.videoWidth || 0;
          const height = videoEl.videoHeight || 0;
          console.log("Video dimensions:", width, "x", height);
          setScanStatus("✅ Ready! Position QR code");
          setDebugInfo(`Camera: ${width}x${height}`);
        };
      }

      setScanning(true);
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Unable to access camera. Please check permissions.";
      if (err.name === "NotAllowedError") {
        errorMessage =
          "Camera access was denied. Please grant permission in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please connect a camera.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      }

      setScanStatus("❌ Camera access failed");
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.stop(); // Use ZXing's stop method
      controlsRef.current = null;
    }
    setScanning(false);
  };

  // ⭐️ --- THIS FUNCTION IS UPDATED FOR CONTINUOUS SCANNING --- ⭐️
  const handleScan = (scannedId: string) => {
    console.log("🔍 RAW Scanned ID:", JSON.stringify(scannedId));
    console.log("📋 Total students available:", students.length);

    let student = students.find((s: Student) => s.student_id === scannedId);

    if (!student) {
      student = students.find((s: Student) =>
        idsMatch(s.student_id, scannedId)
      );
    }

    if (student) {
      console.log("✅ MATCH FOUND:", student.first_name, student.last_name);
      onScan(student.id); // This calls the auto-save function
      playSuccessSound();

      toast({
        title: "✅ Attendance Marked",
        description: `${student.first_name} ${student.last_name} (${student.student_id})`,
      });

      // ⭐️ REMOVED: stopCamera() and onClose()
      
      // ⭐️ ADDED: Reset the scanner to be ready for the next scan
      setScanStatus(`✅ Scanned! Ready for next...`);
      setTimeout(() => {
        if (controlsRef.current) {
          // Check if scanning is still active
          setScanStatus("✅ Ready! Position QR code");
          setLastScan(""); // Clear last scan to allow re-scan
        }
      }, 2000); // 2-second cooldown

    } else {
      console.error("❌ NO MATCH FOUND");

      toast({
        title: "❌ Student Not Found",
        description: `No match for ID: "${scannedId}"`,
        variant: "destructive",
      });

      setScanStatus(`❌ Not found: ${scannedId}`);

      // Reset status after a delay, but only if we are still scanning
      setTimeout(() => {
        if (controlsRef.current) {
          // Check if scanning is still active
          setScanStatus("✅ Ready! Position QR code");
          setLastScan(""); // Clear last scan to allow re-scan
        }
      }, 3000);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 p-4">
      <Card className="w-full max-w-[600px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              <CardTitle>QR Code Scanner</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Scan student QR code or enter ID manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              // autoPlay, playsInline, and muted are handled by ZXing
              className="w-full rounded-lg"
              style={{ maxHeight: "400px", objectFit: "cover" }}
            />
            {/* The canvas element is no longer needed */}
            {/* <canvas ref={canvasRef} className="hidden" /> */}

            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-green-500 rounded-lg shadow-lg animate-pulse"></div>
              </div>
            )}

            <div className="absolute top-2 left-2 right-2 bg-black/80 text-white text-sm px-3 py-2 rounded">
              <div className="font-semibold">{scanStatus}</div>
              {debugInfo && (
                <div className="text-xs text-gray-300">{debugInfo}</div>
              )}
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              📷 Hold QR code 6-12 inches from camera
            </p>
            <p className="text-xs text-muted-foreground">
              • Ensure good lighting
              <br />
              • Keep QR code flat and steady
              <br />• Fill most of the green frame
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or enter manually
              </span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Input
              placeholder="Enter Student ID (e.g., SNDHS-00023)"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Submit
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const AttendanceHistoryModal = ({
  // ✅ FIX: Use the props being passed from takeattendance.tsx
  student,
  isOpen,
  onClose,
  records,
  loading,
  updateRecord, // This is the prop name from takeattendance.tsx
  deleteRecord, // This is the prop name from takeattendance.tsx
}: {
  student: { id: number; name: string };
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  loading: boolean;
  updateRecord: (
    id: number,
    studentId: number,
    date: string,
    status: AttendanceStatus
  ) => void;
  deleteRecord: (id: number, studentId: number, date: string) => void;
}) => {
  // The parent component (takeattendance.tsx) handles opening/closing
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <Card className="w-[90%] max-w-[600px] max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance History
          </CardTitle>
          <CardDescription>
            {/* ✅ FIX: Use the correct student prop */}
            {student.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ FIX: Add a loading state */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="w-12 h-12 mx-auto mb-2 opacity-50 animate-spin" />
              <p>Loading history...</p>
            </div>
          ) : records.length > 0 ? (
            // ✅ FIX: Check the 'records' prop, not 'selectedStudent'
            <div className="space-y-3">
              {records.map((record: AttendanceRecord) => {
                const lowerCaseStatus = record.status.toLowerCase();

                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {new Date(record.date).toLocaleDateString()}
                      </div>
                      <Badge
                        className={
                          lowerCaseStatus === "present"
                            ? "bg-green-500"
                            : lowerCaseStatus === "absent"
                            ? "bg-red-500"
                            : lowerCaseStatus === "late"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                        }
                      >
                        {record.status}
                      </Badge>
                      <div className="text-sm font-medium ml-2">
                        Q{record.quarter}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={lowerCaseStatus}
                        onValueChange={(value) =>
                          // ✅ FIX: Use the 'updateRecord' prop
                          updateRecord(
                            record.id,
                            student.id,
                            record.date,
                            value as AttendanceStatus
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="excused">Excused</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this record?"
                            )
                          ) {
                            // ✅ FIX: Use the 'deleteRecord' prop and pass all 3 arguments
                            deleteRecord(record.id, student.id, record.date);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No attendance history available for this class.</p>
            </div>
          )}
          <div className="flex justify-end mt-4">
            {/* ✅ FIX: Use the 'onClose' prop */}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};