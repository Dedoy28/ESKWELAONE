// src/pages/AttendanceComponents.tsx
// ⭐️ FINAL FIXED VERSION: Smart QR Scanner (No Duplicates) & History ⭐️

import { Loader2, Calendar, UserCheck, UserX, Clock, Shield, QrCode, X, CheckCircle2, Trash2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ⭐️ IMPORT ZXING CORRECTLY ⭐️
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

// --- Interfaces ---
interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  quarter: number;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "";

// --- Helper Config ---
const statusConfig = {
  present: { label: "Present", color: "bg-green-500", icon: UserCheck },
  absent: { label: "Absent", color: "bg-red-500", icon: UserX },
  late: { label: "Late", color: "bg-orange-500", icon: Clock },
  excused: { label: "Excused", color: "bg-blue-500", icon: Shield },
};

// --- QR Scanner Component ---
export const QRScannerModal = ({ isOpen, onClose, onScan }: { isOpen: boolean; onClose: () => void; onScan: (lrn: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualInput, setManualInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("Initializing...");
  
  // ⭐️ NEW: Track recently scanned codes to prevent duplicates
  const recentlyScannedRef = useRef<Set<string>>(new Set());
  
  // Refs for library instances
  const codeReaderRef = useRef(new BrowserQRCodeReader());
  const controlsRef = useRef<IScannerControls | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (isOpen && mounted) {
        // Clear history when opening modal
        recentlyScannedRef.current.clear(); 
        
        // Small delay to ensure video element is rendered in DOM
        setTimeout(() => {
            if (mounted) startCamera();
        }, 300);
      } else {
        stopCamera();
      }
    };

    initCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    if (!videoRef.current) {
        console.warn("Video element not ready yet.");
        return;
    }

    try {
      setScanStatus("📷 Starting camera...");

      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const controls = await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            
            // ⭐️ CHECK: Have we scanned this specific ID recently?
            if (recentlyScannedRef.current.has(text)) {
                // Skip it! It was already scanned recently.
                return; 
            }

            // If not, add it to history and process it
            recentlyScannedRef.current.add(text);
            
            console.log("✅ QR Detected:", text);
            setScanStatus(`✅ Scanned: ${text}`);
            
            onScan(text); 

            // Allow re-scanning the SAME code after 5 seconds (cooldown)
            setTimeout(() => {
                recentlyScannedRef.current.delete(text);
            }, 5000);
          }
          
          // Ignore frame errors to keep console clean
        }
      );
      
      controlsRef.current = controls;
      setScanning(true);
      setScanStatus("✅ Ready to Scan");

    } catch (err: any) {
      console.error("Camera Start Error:", err);
      setScanStatus("❌ Camera Failed");
      toast({ title: "Camera Error", description: "Please ensure you gave camera permission.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (e) { }
      controlsRef.current = null;
    }
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      // Manual input ignores the duplicate check (user intent is explicit)
      onScan(manualInput.trim());
      setManualInput("");
    }
  };

  // ⭐️ Helper to reset the block list manually
  const handleResetScanner = () => {
      recentlyScannedRef.current.clear();
      setScanStatus("✅ Scanner Reset");
      toast({ title: "Scanner Reset", description: "You can scan the same IDs again." });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50 p-4">
      <Card className="w-full max-w-[500px] bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              <CardTitle>QR Code Scanner</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>Scan ID or enter LRN manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Video Area */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted 
            />
            <div className="absolute top-2 left-0 right-0 text-center">
                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${scanStatus.includes('✅') ? 'bg-green-500 text-white' : 'bg-black/50 text-white'}`}>
                    {scanStatus}
                 </span>
            </div>
            {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-green-500 rounded-lg opacity-50"></div>
                </div>
            )}
          </div>

          <div className="flex justify-center">
             <Button variant="ghost" size="sm" onClick={handleResetScanner} className="text-xs text-muted-foreground">
                Reset Scanner Memory
             </Button>
          </div>

          {/* Manual Input */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground bg-white">Or enter manually</span>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Enter 12-digit LRN"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              autoFocus
            />
            <Button type="submit">
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
};

// --- History Modal Component ---
export const AttendanceHistoryModal = ({
  student,
  isOpen,
  onClose,
  records,
  loading,
  updateRecord,
  deleteRecord,
}: {
  student: { id: number; name: string };
  isOpen: boolean;
  onClose: () => void;
  records: AttendanceRecord[];
  loading: boolean;
  updateRecord: (id: number, studentId: number, date: string, status: AttendanceStatus) => void;
  deleteRecord: (id: number, studentId: number, date: string) => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <Card className="w-[90%] max-w-[600px] max-h-[80vh] overflow-y-auto bg-white">
        <CardHeader>
          <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Attendance History
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4"/></Button>
          </div>
          <CardDescription>{student.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>Loading history...</p>
            </div>
          ) : records.length > 0 ? (
            <div className="space-y-2">
              {records.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{new Date(record.date).toLocaleDateString()}</div>
                    <Badge className={statusConfig[record.status.toLowerCase() as AttendanceStatus]?.color || "bg-gray-500"}>
                      {record.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Q{record.quarter}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <Select 
                        defaultValue={record.status.toLowerCase()} 
                        onValueChange={(val) => updateRecord(record.id, student.id, record.date, val as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs">
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
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                            if(confirm("Delete this record?")) deleteRecord(record.id, student.id, record.date);
                        }}
                      >
                          <Trash2 className="w-4 h-4" />
                      </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No attendance records found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};