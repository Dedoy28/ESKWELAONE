// src/pages/TakeAttendance.tsx
// ⭐️ FULLY UPDATED: Added Export PDF Feature ⭐️

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Loader2, 
  ArrowLeft, 
  Check, 
  X, 
  Clock, 
  UserMinus, 
  Camera, 
  Download,
  FileText // ⭐️ Added Icon
} from 'lucide-react'; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Import your existing components
import { 
  QRScannerModal, 
  AttendanceHistoryModal 
} from './AttendanceComponents';

// --- INTERFACES ---

interface RosterStudent {
  id: number; 
  student: number; 
  student_lrn: string; 
  student_name: string; 
  attendance_id: number | null; 
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  updated_at: string | null; 
}

interface StudentData {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  current_enrollment: {
    section: {
      name: string;
      grade: string;
    };
  } | null;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  quarter: number;
  updated_at: string;
}

type AttendanceStatus = "present" | "absent" | "late" | "excused" | "";

const frontendToBackendStatus: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
  "": "Absent", 
};

const getQuarterFromDate = (date: Date = new Date()): number => {
  const month = date.getMonth() + 1; 
  if (month >= 8 && month <= 10) return 1;
  if (month === 11 || month === 12 || month === 1) return 2;
  if (month >= 2 && month <= 4) return 3;
  return 4;
};

const getLocalYYYYMMDD = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TakeAttendance = () => {
  const { classId } = useParams<{ classId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [studentLrnMap, setStudentLrnMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false); // ⭐️ PDF Loading State
  
  const [date] = useState(getLocalYYYYMMDD());
  const [quarter, setQuarter] = useState<string>(() => getQuarterFromDate(new Date()).toString());

  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<{id: number, name: string} | null>(null);
  const [studentHistory, setStudentHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);


  const fetchRoster = useCallback(() => {
    if (!classId) return;
    
    setLoading(true);
    setRoster([]); 

    const rosterPromise = api.get(`/teacher/class-roster/${classId}/`);
    const attendancePromise = api.get(`/attendance/class/${classId}/`, { params: { date } });
    const allStudentsPromise = api.get("/students/");

    Promise.all([rosterPromise, attendancePromise, allStudentsPromise])
      .then(([rosterRes, attendanceRes, allStudentsRes]) => {
        
        const rosterData = rosterRes.data as RosterStudent[];
        const attendanceData = attendanceRes.data as { student_id: number, status: RosterStudent['status'], id: number, updated_at: string }[];
        const allStudentsData = allStudentsRes.data as StudentData[];

        const attendanceMap = new Map(
          attendanceData.map(att => [att.student_id, { status: att.status, id: att.id, updated_at: att.updated_at }])
        );

        const lrnMap = new Map(allStudentsData.map(s => [s.lrn, s.id]));
        setStudentLrnMap(lrnMap);
        
        const finalRoster = rosterData.map(enrollment => {
          const attendance = attendanceMap.get(enrollment.student); 
          
          return {
            id: enrollment.id, 
            student: enrollment.student, 
            student_lrn: enrollment.student_lrn,
            student_name: enrollment.student_name,
            attendance_id: attendance?.id || null,
            status: attendance?.status || 'Absent', 
            updated_at: attendance?.updated_at || null,
          };
        });

        setRoster(finalRoster);
      })
      .catch(err => {
        toast({
          title: "Error Loading Data",
          description: err.response?.data?.detail || "Failed to load class data.",
          variant: "destructive"
        });
        if (err.response?.status === 403) {
          navigate("/attendance"); 
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [classId, date, toast, navigate]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleStatusChange = (student_pk: number, newStatus: RosterStudent['status']) => {
    setRoster(prevRoster =>
      prevRoster.map(student =>
        student.student === student_pk 
          ? { ...student, status: newStatus } 
          : student
      )
    );
  };
  
  const markAll = (status: RosterStudent['status']) => {
    setRoster(prevRoster => 
      prevRoster.map(student => ({ ...student, status }))
    );
  };

  const handleSubmit = () => {
    setIsSaving(true);
    
    const payload = {
      date: date,
      quarter: quarter, 
      attendance_data: roster.map(s => ({
        student_id: s.student, 
        status: s.status,
        original_updated_at: s.updated_at 
      }))
    };
    
    api.post(`/attendance/class/${classId}/`, payload)
      .then(() => {
        toast({ title: "Success", description: "All attendance has been saved." });
        navigate("/attendance"); 
      })
      .catch((err: any) => {
        let errorMessage = "Failed to save attendance.";
        const errors = err.response?.data;

        if (errors && errors.non_field_errors) {
          const conflictError = errors.non_field_errors.find((e: any) => e.code === 'conflict');
          if (conflictError) {
            errorMessage = "Another user updated this page. Please refresh to get the latest data.";
            fetchRoster(); 
          } else {
            errorMessage = errors.non_field_errors[0];
          }
        } else if (err.response?.data?.error) {
           errorMessage = err.response.data.error;
        }

        toast({
          title: "Error Saving",
          description: errorMessage,
          variant: "destructive"
        });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const exportToCSV = () => {
    if (roster.length === 0) {
      toast({ title: "No Data to Export", description: "The roster is empty." });
      return;
    }
    const headers = ["LRN", "Student Name", "Status"];
    const rows = roster.map(student => [
      `"${student.student_lrn}"`,
      `"${student.student_name.replace(/"/g, '""')}"`, 
      `"${student.status}"`
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${date}_class_${classId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Successful",
      description: `Downloaded attendance for ${date}.`
    });
  };

  // ⭐️ --- EXPORT TO PDF FUNCTION --- ⭐️
  const exportToPDF = async () => {
    if (roster.length === 0) {
      toast({ title: "No Data", description: "The roster is empty." });
      return;
    }
    setIsExportingPdf(true);
    toast({ title: "Generating PDF...", description: "Please wait." });

    try {
      const response = await api.get(`/attendance/class/${classId}/export-pdf/`, {
        params: { date },
        responseType: 'blob', // Important for downloads
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const filename = `attendance_sheet_${date}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "PDF Downloaded", description: "Attendance sheet saved." });

    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({ title: "Export Failed", description: "Could not generate PDF.", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };


  // --- HANDLERS FOR MODALS ---
  const handleQRScan = async (scannedLrn: string) => {
    const studentPk = studentLrnMap.get(scannedLrn);
    
    if (!studentPk) {
      toast({ title: "Scan Error", description: "LRN not found in the master list.", variant: "destructive"});
      return;
    }

    const studentInRoster = roster.find(s => s.student === studentPk);
    
    if (!studentInRoster) {
      toast({ 
        title: "Scan Error", 
        description: `Student (LRN: ${scannedLrn}) is not in this class.`, 
        variant: "destructive"
      });
      return;
    }

    const originalStatus = studentInRoster.status;
    if (originalStatus === 'Present') {
       toast({ 
         title: "Already Present", 
         description: `${studentInRoster.student_name} is already marked as Present.`
       });
       return; 
    }

    handleStatusChange(studentPk, 'Present'); 
    
    const payload = {
      date: date,
      quarter: quarter, 
      attendance_data: [{
        student_id: studentPk,
        status: 'Present',
        original_updated_at: studentInRoster.updated_at 
      }]
    };
    
    toast({ 
      title: "Scanned!", 
      description: `Saving ${studentInRoster.student_name} as Present...`
    });

    try {
      const response = await api.post(`/attendance/class/${classId}/`, payload);
      
      toast({ 
        title: "Saved!", 
        description: `${studentInRoster.student_name} is saved as Present.`
      });
      
      const records = response.data?.records;
      if (records && Array.isArray(records) && records.length > 0) {
        const newRecord = records[0]; 
        setRoster(currentRoster => 
          currentRoster.map(s => 
            s.student === studentPk 
              ? { ...s, status: 'Present', id: newRecord.id, updated_at: newRecord.updated_at } 
              : s
          )
        );
      } else {
         fetchRoster(); 
      }
      
    } catch (err: any) {
      console.error("Failed to save QR scan:", err);
      
      let errorMessage = `Failed to save ${studentInRoster.student_name}. Please try again or save manually.`;
      const errors = err.response?.data;

      if (errors && errors.non_field_errors) {
        const conflictError = errors.non_field_errors.find((e: any) => e.code === 'conflict');
        if (conflictError) {
          errorMessage = "Another user updated this page. Please refresh to get the latest data.";
          fetchRoster(); 
        } else {
          errorMessage = errors.non_field_errors[0];
        }
      }

      toast({
        title: "Error Saving Scan",
        description: errorMessage,
        variant: "destructive"
      });
      handleStatusChange(studentPk, originalStatus); 
    }
  };

  const handleViewHistory = async (studentId: number, studentName: string) => {
    setSelectedStudentForHistory({ id: studentId, name: studentName });
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/attendance/class/${classId}/?student=${studentId}`);
      const sortedRecords = (res.data as AttendanceRecord[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setStudentHistory(sortedRecords);
    } catch (err) {
      toast({ title: "Error", description: "Could not fetch student history." });
      setStudentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateAttendanceHistory = async (
    recordId: number,
    studentId: number,
    recordDate: string,
    status: AttendanceStatus
  ) => {
    const record = studentHistory.find(r => r.id === recordId);
    const backendStatus = frontendToBackendStatus[status];
    const recordQuarter = record?.quarter || getQuarterFromDate(new Date(recordDate));

    try {
      const response = await api.patch(
        `/attendance/${recordId}/`,
        {
          student_id: studentId,
          date: recordDate,
          status: backendStatus,
          quarter: recordQuarter,
          original_updated_at: record?.updated_at || null 
        }
      );
      
      const newRecord = response.data;

      setStudentHistory(currentHistory =>
        currentHistory.map(r => 
          r.id === recordId ? { ...r, status: newRecord.status, updated_at: newRecord.updated_at } : r
        )
      );

      if (recordDate === date) {
        setRoster(currentRoster => 
          currentRoster.map(s => 
            s.student === studentId 
              ? { ...s, status: newRecord.status, updated_at: newRecord.updated_at } 
              : s
          )
        );
      }

      toast({ title: "Record Updated", description: "Attendance history updated." });

    } catch(err: any) {
      console.error("Failed to update record:", err);
      let errorMessage = "Failed to update record.";
      const errors = err.response?.data;
      if (errors && errors.non_field_errors) {
        const conflictError = errors.non_field_errors.find((e: any) => e.code === 'conflict');
        if (conflictError) {
          errorMessage = "Another user updated this record. Please refresh the history.";
          handleViewHistory(studentId, selectedStudentForHistory?.name || '');
        } else {
          errorMessage = errors.non_field_errors[0];
        }
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    }
  };

  const deleteAttendanceRecord = async (recordId: number, studentId: number, recordDate: string) => {
    try {
      await api.delete(`/attendance/${recordId}/`);

      setStudentHistory(currentHistory => 
        currentHistory.filter(record => record.id !== recordId)
      );

      if (recordDate === date) {
        setRoster(currentRoster => 
          currentRoster.map(s => 
            s.student === studentId 
              ? { ...s, status: 'Absent', id: null, updated_at: null } 
              : s
          )
        );
      }
      
      toast({ title: "Deleted", description: "Attendance record deleted." });
    
    } catch(err) {
      console.error("Failed to delete record:", err);
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/attendance")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Classes
          </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Take Attendance</CardTitle>
          <CardDescription>
            Select the date and quarter, then mark the status for each student.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div>
              <Label htmlFor="date">Date (Locked to Today)</Label>
              <Input
                id="date"
                type="date"
                value={date}
                disabled
                className="w-full sm:w-[180px]"
              />
            </div>
            <div>
              <Label htmlFor="quarter">Quarter (Manual)</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger id="quarter" className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Quarter 1</SelectItem>
                  <SelectItem value="2">Quarter 2</SelectItem>
                  <SelectItem value="3">Quarter 3</SelectItem>
                  <SelectItem value="4">Quarter 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" onClick={() => markAll('Present')}>
                <Check className="w-4 h-4 mr-2" />
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => markAll('Absent')}>
                <X className="w-4 h-4 mr-2" />
                Mark All Absent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQrScannerOpen(true)}
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" /> QR Scanner
              </Button>
              
              {/* ⭐️ EXPORT CSV BUTTON ⭐️ */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={roster.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export CSV
              </Button>

              {/* ⭐️ EXPORT PDF BUTTON (NEW) ⭐️ */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                disabled={roster.length === 0 || isExportingPdf}
                className="flex items-center gap-2"
              >
                 {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                 Export PDF
              </Button>

          </div>
          
          {loading ? (
            <div className="text-center p-8">
              <Loader2 className="animate-spin mx-auto w-8 h-8 text-primary" />
              <p className="text-muted-foreground mt-2">Loading roster...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {roster.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No active students are enrolled in this class.
                </p>
              )}
              {roster.map(student => (
                <div key={student.student} className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                    <span className="font-medium mb-1 sm:mb-0">{student.student_name}</span>
                    <span className="text-xs text-muted-foreground sm:ml-2">({student.student_lrn})</span>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center mt-3 sm:mt-0">
                    <Button
                      size="sm"
                      variant={student.status === 'Present' ? 'default' : 'outline'}
                      className={student.status === 'Present' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleStatusChange(student.student, 'Present')}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant={student.status === 'Absent' ? 'destructive' : 'outline'}
                      onClick={() => handleStatusChange(student.student, 'Absent')}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Absent
                    </Button>
                      <Button
                      size="sm"
                      variant={student.status === 'Late' ? 'secondary' : 'outline'}
                      className={student.status === 'Late' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                      onClick={() => handleStatusChange(student.student, 'Late')}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Late
                    </Button>
                      <Button
                      size="sm"
                      variant={student.status === 'Excused' ? 'secondary' : 'outline'}
                      className={student.status === 'Excused' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                      onClick={() => handleStatusChange(student.student, 'Excused')}
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Excused
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="View History"
                      onClick={() => handleViewHistory(student.student, student.student_name)}
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || loading || roster.length === 0} 
            className="w-full mt-6"
          >
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : null}
            Save All Changes
          </Button>
        </CardContent>
      </Card>

      {historyModalOpen && selectedStudentForHistory && (
        <AttendanceHistoryModal
          student={selectedStudentForHistory}
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          records={studentHistory}
          loading={historyLoading}
          updateRecord={updateAttendanceHistory}
          deleteRecord={deleteAttendanceRecord}
        />
      )}

      {qrScannerOpen && (
        <QRScannerModal
          isOpen={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          onScan={handleQRScan}
        />
      )}

    </DashboardLayout>
  );
};

export default TakeAttendance;