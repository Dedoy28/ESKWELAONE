// src/pages/StudentManagement.tsx
// ⭐️ FINAL FIXED VERSION: Fixed Duplicates & Context-Aware Grade Display ⭐️

import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  UserPlus,
  Edit,
  Eye,
  Download,
  Users,
  Save,
  UserX,
  UserCheck,
  QrCode,
  Loader2,
  FileText, 
} from "lucide-react";
import QRCode from "qrcode";

import { StudentForm } from "./StudentForm";

// --- DYNAMIC URLS ---
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const API_URL = `${API_BASE}/students/`;
const WS_URL_BASE = `${WS_BASE_URL}/ws/students`;
const SECTIONS_URL = `${API_BASE}/sections/`;
const TEACHERS_URL = `${API_BASE}/users/?profile__role=teacher`;
const PDF_EXPORT_URL = `${API_BASE}/students/export-pdf/`;

// --- INTERFACES ---
interface Section {
  id: number;
  name: string;
  school_year: string;
  grade: string;
  adviser_name: string | null;
  subject?: string;
}

interface Teacher {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

interface SectionEnrollment {
  id: number;
  section: Section;
  school_year: string;
  is_active: boolean;
}

interface StudentData {
  id: number;
  lrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  name_extension?: string | null;

  // Dynamic / Read-only fields
  grade: string | null;
  section: Section | null;
  adviser_name: string | null;

  // History
  section_history: SectionEnrollment[];
  current_enrollment: SectionEnrollment | null;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string | null;
  emergency_contact?: string | null;
  medical_notes?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;

  // SF10 fields
  elementary_school: string | null;
  elementary_school_id: string | null;
  elementary_school_address: string | null;
  elementary_gen_ave: number | null;
}

const NO_ADVISER_VALUE = "__NONE__";

// --- MAIN COMPONENT ---
const StudentManagement = () => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  
  // State for PDF Export
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [schoolYearFilter, setSchoolYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog States
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  const currentYear = new Date().getFullYear();
  const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;

  const [sectionFormData, setSectionFormData] = useState({
    name: "A",
    school_year: defaultSchoolYear,
    grade: "7",
    adviser_name: NO_ADVISER_VALUE,
  });
  const [isSubmittingSection, setIsSubmittingSection] = useState(false);

  // --- INITIAL FETCH ---
  useEffect(() => {
    fetchSections();
    fetchTeachers();
    setLoading(false);
  }, []);

  // --- WEBSOCKET CONNECTION ---
  const connectWebSocket = () => {
    if (ws.current || !localStorage.getItem("access_token")) return;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    const token = localStorage.getItem("access_token");
    const wsUrlWithToken = `${WS_URL_BASE}?token=${encodeURIComponent(token!)}`;
    console.log("WS: Connecting to:", wsUrlWithToken);

    try {
      ws.current = new WebSocket(wsUrlWithToken);
    } catch (error) {
      console.error("WS: Connection failed:", error);
      ws.current = null;
      attemptReconnect();
      return;
    }

    ws.current.onopen = () => {
      console.log("WS: Connected ✅");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
    ws.current.onclose = (event) => {
      console.warn(`WS: Disconnected (Code: ${event.code}) ❌`);
      ws.current = null;
      if (!event.wasClean) attemptReconnect();
    };
    ws.current.onerror = (err) => {
      console.error("WS: Error:", err);
      attemptReconnect();
    };
    ws.current.onmessage = handleWebSocketMessage;
  };

  const attemptReconnect = () => {
    if (!reconnectTimer.current) {
      console.log("WS: Attempting reconnect in 5s...");
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        connectWebSocket();
      }, 5000);
    }
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const { action, student } = data;

      if (!student || typeof student.id === "undefined") {
        return;
      }

      setStudents((prev) => {
        let updatedStudents = [...prev];
        const studentIndex = updatedStudents.findIndex((s) => s.id === student.id);

        if (action === "updated" || action === "status_changed") {
          if (studentIndex !== -1) {
            updatedStudents[studentIndex] = {
              ...updatedStudents[studentIndex],
              ...student,
            };
          } else {
            updatedStudents.push(student as StudentData);
          }
        } else if (action === "created") {
          if (studentIndex === -1) {
            updatedStudents.push(student as StudentData);
          } else {
            updatedStudents[studentIndex] = {
              ...updatedStudents[studentIndex],
              ...student,
            };
          }
        } else if (action === "deleted") {
          updatedStudents = updatedStudents.filter((s) => s.id !== student.id);
        }
        
        // Filter duplicates here as well just in case
        const seenIds = new Set();
        updatedStudents = updatedStudents.filter(s => {
            if (seenIds.has(s.id)) return false;
            seenIds.add(s.id);
            return true;
        });

        updatedStudents.sort(
          (a, b) =>
            a.last_name.localeCompare(b.last_name) ||
            a.first_name.localeCompare(b.first_name)
        );
        return updatedStudents;
      });
    } catch (e) {
      console.error("WS: Error processing message:", event.data, e);
    }
  };

  useEffect(() => {
    if (hasSearched) connectWebSocket();
    else {
      if (ws.current) {
        ws.current.close(1000, "Search cleared");
        ws.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    }
    return () => {
      ws.current?.close(1000, "Component unmounted");
      ws.current = null;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [hasSearched]);

  // --- FETCHING ---
  const fetchSections = async () => {
    setLoadingSections(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No auth token");
      const response = await axios.get(SECTIONS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSections(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast({ variant: "destructive", title: "Failed to load sections." });
      setSections([]);
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No auth token");
      const response = await axios.get(TEACHERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast({ variant: "destructive", title: "Failed to load teachers list." });
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  // --- FETCH STUDENTS (With Performance Fix & Deduplication) ---
  const fetchStudents = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");

      const params = new URLSearchParams();

      // Filters
      if (schoolYearFilter !== "all")
        params.append("section_enrollments__school_year", schoolYearFilter);
      if (sectionFilter !== "all")
        params.append("section_enrollments__section__name", sectionFilter);
      if (gradeFilter !== "all")
        params.append("section_enrollments__section__grade", gradeFilter);
      if (statusFilter !== "all")
        params.append("is_active", statusFilter === "active" ? "true" : "false");

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      });

      let fetchedStudents = Array.isArray(response.data) ? response.data : [];
      
      // ⭐️ FIX 1: Deduplicate results from backend
      const seenIds = new Set();
      fetchedStudents = fetchedStudents.filter((student: StudentData) => {
        if (seenIds.has(student.id)) return false;
        seenIds.add(student.id);
        return true;
      });

      fetchedStudents.sort(
        (a: StudentData, b: StudentData) =>
          a.last_name.localeCompare(b.last_name) ||
          a.first_name.localeCompare(b.first_name)
      );

      setStudents(fetchedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error Fetching Students",
        description:
          error.response?.data?.detail || "Could not load student records.",
        variant: "destructive",
      });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleSearch = () => {
    fetchStudents();
  };

  const handleToggleStatus = async (
    studentId: number,
    currentStatus: boolean | undefined
  ) => {
    const isActive = currentStatus ?? true;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");

      const response = await axios.post(
        `${API_URL}${studentId}/toggle-status/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? response.data : s))
      );

      toast({
        title: isActive ? "Student Deactivated" : "Student Activated",
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Status Update Failed",
        description:
          error.response?.data?.detail || "Could not update status.",
        variant: "destructive",
      });
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSection(true);
    const payload = {
      ...sectionFormData,
      adviser_name:
        sectionFormData.adviser_name === NO_ADVISER_VALUE
          ? null
          : sectionFormData.adviser_name,
    };
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");
      const response = await axios.post(SECTIONS_URL, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({
        title: "Section Added",
        description: `Section ${response.data.name} (Grade ${response.data.grade}) created.`,
      });
      setSectionFormData({
        name: "A",
        school_year: sectionFormData.school_year,
        grade: "7",
        adviser_name: NO_ADVISER_VALUE,
      });
      setShowSectionDialog(false);
      fetchSections();
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        "Failed to add section.";
      toast({
        title: "Error Adding Section",
        description: msg,
        variant: "destructive",
      });
      console.error("Add section error:", error.response?.data || error);
    } finally {
      setIsSubmittingSection(false);
    }
  };

  const openViewDialog = (student: StudentData) => {
    setSelectedStudent(student);
    setShowViewDialog(true);
  };
  const openEditDialog = (student: StudentData) => {
    setSelectedStudent(student);
    setShowEditDialog(true);
  };

  const generateQRCode = async (student: StudentData | null) => {
    if (
      !student ||
      !student.lrn ||
      !student.first_name ||
      !student.last_name
    ) {
      toast({
        title: "Error",
        description: "Student data is incomplete.",
        variant: "destructive",
      });
      return;
    }

    const studentName = `${student.last_name}, ${student.first_name}`;
    const studentIdText = `LRN: ${student.lrn}`;
    const qrData = student.lrn;
    const filename = `${student.last_name}_${student.first_name}_QR.png`.replace(
      /[^a-zA-Z0-9_.-]/g,
      "_"
    );

    const qrCodeSize = 256;
    const paddingTop = 60;
    const paddingBottom = 10;
    const textLineHeight = 20;
    const canvasWidth = qrCodeSize;
    const canvasHeight = qrCodeSize + paddingTop + paddingBottom;
    const qrCodeX = 0;
    const qrCodeY = paddingTop;
    const textX = canvasWidth / 2;
    const textYName = paddingTop / 2 - textLineHeight / 2 + 5;
    const textYId = paddingTop / 2 + textLineHeight / 2 + 5;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.fillStyle = "black";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "center";
      ctx.fillText(studentName, textX, textYName);
      ctx.font = "14px Arial";
      ctx.fillText(studentIdText, textX, textYId);

      const tempCanvas = document.createElement("canvas");
      await QRCode.toCanvas(tempCanvas, qrData, {
        errorCorrectionLevel: "H",
        width: qrCodeSize,
        margin: 2,
      });
      ctx.drawImage(tempCanvas, qrCodeX, qrCodeY);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "QR Code Downloaded",
        description: `QR for ${studentName} saved.`,
      });
    } catch (err) {
      console.error("QR code generation failed:", err);
      toast({
        title: "QR Code Error",
        description: "Could not generate QR code.",
        variant: "destructive",
      });
    }
  };

  const exportStudents = () => {
    if (finalFilteredStudents.length === 0) {
      toast({ title: "No Data", description: "No students match filters." });
      return;
    }

    const headers = [
      "LRN", "Last Name", "First Name", "Middle Name", "Gender",
      "Grade", "Section", "Adviser", "Email", "Phone", "Status",
    ];

    const rows = finalFilteredStudents.map((s) => [
      s.lrn,
      s.last_name,
      s.first_name,
      s.middle_name || "",
      s.gender,
      s.grade,
      s.section ? `${s.section.name}` : "",
      s.adviser_name || "N/A",
      s.email || "",
      s.phone || "",
      (s.is_active ?? true) ? "Active" : "Inactive",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows]
        .map((row) =>
          row.map((val) => `"${(val ?? "").toString().replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");
    try {
      const link = document.createElement("a");
      link.href = encodeURI(csvContent);
      link.download = `student_list_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful" });
    } catch (error) {
      console.error("CSV Export Error:", error);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const exportStudentsPDF = async () => {
    if (finalFilteredStudents.length === 0) {
      toast({ title: "No Data", description: "No students match filters." });
      return;
    }
    setIsExportingPdf(true);
    toast({ title: "Generating PDF...", description: "Please wait." });

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");

      const params = new URLSearchParams();
      if (schoolYearFilter !== "all")
        params.append("school_year", schoolYearFilter);
      if (sectionFilter !== "all")
        params.append("section", sectionFilter);
      if (gradeFilter !== "all")
        params.append("grade", gradeFilter);
      if (statusFilter !== "all")
        params.append("is_active", statusFilter === "active" ? "true" : "false");
      if (searchTerm)
        params.append("search", searchTerm);

      const response = await axios.get(PDF_EXPORT_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
        responseType: "blob", 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const filename = `student_list_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "PDF Export Successful" });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({ title: "PDF Export Failed", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const finalFilteredStudents = useMemo(() => {
    return students;
  }, [students]);

  const maleStudents = useMemo(
    () => finalFilteredStudents.filter((s) => s.gender?.toLowerCase() === "male"),
    [finalFilteredStudents]
  );
  const femaleStudents = useMemo(
    () => finalFilteredStudents.filter((s) => s.gender?.toLowerCase() === "female"),
    [finalFilteredStudents]
  );

  const schoolYears = useMemo(() => {
    const years = new Set(sections.map((s) => s.school_year));
    years.add(defaultSchoolYear);
    return Array.from(years).sort().reverse();
  }, [sections, defaultSchoolYear]);

  const availableSectionNames = useMemo(() => {
    const names = new Set(
      sections
        .filter(
          (s) =>
            (schoolYearFilter === "all" || s.school_year === schoolYearFilter) &&
            (gradeFilter === "all" || s.grade === gradeFilter)
        )
        .map((s) => s.name)
    );
    return Array.from(names).sort();
  }, [sections, schoolYearFilter, gradeFilter]);

  // --- RENDER HELPERS ---
  const renderStudentTable = (
    studentsList: StudentData[],
    title: string,
    icon: React.ReactNode
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">{studentsList.length} students</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[1200px] hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">LRN</TableHead>
                <TableHead className="text-center">First Name</TableHead>
                <TableHead className="text-center">Last Name</TableHead>
                <TableHead className="text-center">Grade & Section</TableHead>
                <TableHead className="text-center">Adviser</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead className="text-center">Phone</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No {title.toLowerCase()} found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                studentsList.map((student) => {
                  // ⭐️ FIX 2: Smart Display Logic for Historical Data ⭐️
                  let displayGrade = student.grade;
                  let displaySection = student.section ? student.section.name : "";
                  let displayAdviser = student.adviser_name;

                  // If we are filtering by a SPECIFIC school year (not "all")
                  // Check the history to find the correct grade/section for THAT year
                  if (schoolYearFilter !== "all") {
                    const historyRecord = student.section_history.find(h => h.school_year === schoolYearFilter);
                    if (historyRecord) {
                       displayGrade = historyRecord.section.grade;
                       displaySection = historyRecord.section.name;
                       displayAdviser = historyRecord.section.adviser_name;
                    }
                  }

                  const sectionDisplay = (displayGrade && displaySection)
                    ? `Grade ${displayGrade} - ${displaySection}`
                    : `Grade ${displayGrade || "N/A"}`;
                  
                  const currentAdviser = displayAdviser || "N/A";
                  // -------------------------------------------------------

                  return (
                    <TableRow key={student.id} className="hover:bg-muted/30 dark:hover:bg-muted/20">
                      <TableCell className="text-center">{student.lrn}</TableCell>
                      <TableCell className="text-center">{student.first_name}</TableCell>
                      <TableCell className="text-center">{student.last_name}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{sectionDisplay}</Badge></TableCell>
                      <TableCell className="text-center">{currentAdviser}</TableCell>
                      <TableCell className="text-center">{student.email || "N/A"}</TableCell>
                      <TableCell className="text-center">{student.phone || "N/A"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={(student.is_active ?? true) ? "default" : "secondary"}>
                          {(student.is_active ?? true) ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewDialog(student)} title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)} title="Edit Student">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => generateQRCode(student)} className="text-blue-600 dark:text-blue-400" title="QR Code">
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(student.id, student.is_active)} className={(student.is_active ?? true) ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>
                            {(student.is_active ?? true) ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          
           {/* MOBILE CARDS */}
           <div className="md:hidden space-y-4 p-4">
             {studentsList.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 No {title.toLowerCase()} found matching filters.
               </div>
             ) : (
               studentsList.map((student) => {
                 // Apply the same Smart Display Logic here for mobile
                 let displayGrade = student.grade;
                 let displaySection = student.section ? student.section.name : "";
                 let displayAdviser = student.adviser_name;

                 if (schoolYearFilter !== "all") {
                    const historyRecord = student.section_history.find(h => h.school_year === schoolYearFilter);
                    if (historyRecord) {
                       displayGrade = historyRecord.section.grade;
                       displaySection = historyRecord.section.name;
                       displayAdviser = historyRecord.section.adviser_name;
                    }
                 }
                 const sectionDisplay = (displayGrade && displaySection)
                    ? `Grade ${displayGrade} - ${displaySection}`
                    : `Grade ${displayGrade || "N/A"}`;
                 const currentAdviser = displayAdviser || "N/A";

                 return (
                   <Card key={student.id} className="overflow-hidden">
                     <CardContent className="p-4 space-y-3">
                       <div className="flex items-start justify-between gap-2">
                         <div className="flex-1 min-w-0">
                           <h3 className="font-semibold text-lg truncate">{student.last_name}, {student.first_name}</h3>
                           <p className="text-sm text-muted-foreground truncate">{student.lrn}</p>
                         </div>
                         <Badge variant={(student.is_active ?? true) ? "default" : "secondary"}>
                           {(student.is_active ?? true) ? "Active" : "Inactive"}
                         </Badge>
                       </div>
                       <div className="space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Section:</span> <span>{sectionDisplay}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Adviser:</span> <span>{currentAdviser}</span></div>
                       </div>
                       <div className="flex gap-2 pt-3 border-t">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openViewDialog(student)}><Eye className="w-4 h-4 mr-2"/> View</Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(student)}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
                       </div>
                     </CardContent>
                   </Card>
                 )
               })
             )}
           </div>
        </div>
      </CardContent>
    </Card>
  );

  // --- MAIN RENDER ---
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground">Search and manage student records.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportStudents} disabled={finalFilteredStudents.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" onClick={exportStudentsPDF} disabled={finalFilteredStudents.length === 0 || isExportingPdf}>
              {isExportingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => setShowSectionDialog(true)}>
              <Users className="w-4 h-4 mr-2" /> Add Section
            </Button>
            <Button variant="default" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" /> Add Student
            </Button>
          </div>
        </div>
        {/* ... Rest of component (Filters, Dialogs, etc. are same as before) ... */}
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="filter-sy">School Year</Label>
                <Select value={schoolYearFilter} onValueChange={(val) => { setSchoolYearFilter(val); setSectionFilter("all"); }}>
                  <SelectTrigger id="filter-sy"><SelectValue placeholder="All Years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All School Years</SelectItem>
                    {schoolYears.map((year) => <SelectItem key={`year-${year}`} value={year}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-grade">Grade Level</Label>
                <Select value={gradeFilter} onValueChange={(val) => { setGradeFilter(val); setSectionFilter("all"); }}>
                  <SelectTrigger id="filter-grade"><SelectValue placeholder="All Grades" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {["7", "8", "9", "10"].map((g) => <SelectItem key={`grade-${g}`} value={g}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-section">Section</Label>
                <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={availableSectionNames.length === 0}>
                  <SelectTrigger id="filter-section"><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSectionNames.map((name) => <SelectItem key={`section-name-${name}`} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filter-status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="filter-status"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-term"
                  placeholder="Search by name, LRN, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-2" /> Search Students</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && (
          <Card>
            <CardContent className="py-12 text-center flex justify-center items-center">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading students...
            </CardContent>
          </Card>
        )}
        {!loading && !hasSearched && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <Users className="w-12 h-12 mx-auto text-muted" />
              <h3 className="text-xl font-semibold">Search for Students</h3>
              <p className="text-muted-foreground">Use the filters above and click "Search Students".</p>
            </CardContent>
          </Card>
        )}
        {!loading && hasSearched && (
           finalFilteredStudents.length === 0 ? (
             <Card><CardContent className="py-12 text-center"><h3 className="text-lg font-semibold">No Students Found</h3><p className="text-muted-foreground">No students match your current filters.</p></CardContent></Card>
           ) : (
             <>
               {maleStudents.length > 0 && renderStudentTable(maleStudents, "Male Students", <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />)}
               {femaleStudents.length > 0 && renderStudentTable(femaleStudents, "Female Students", <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />)}
             </>
           )
        )}

        {/* Dialogs */}
        <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Section</DialogTitle>
              <DialogDescription>Create section (A/B/C) with grade, year, adviser.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSection} className="space-y-4">
              <div>
                <Label>Section Name *</Label>
                <Select value={sectionFormData.name} onValueChange={(val) => setSectionFormData({...sectionFormData, name: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade Level *</Label>
                <Select value={sectionFormData.grade} onValueChange={(val) => setSectionFormData({...sectionFormData, grade: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["7","8","9","10"].map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>School Year *</Label>
                <Input value={sectionFormData.school_year} onChange={(e) => setSectionFormData({...sectionFormData, school_year: e.target.value})} placeholder="e.g., 2024-2025" required />
              </div>
              <div>
                <Label>Adviser Name (Optional)</Label>
                <Select value={sectionFormData.adviser_name || NO_ADVISER_VALUE} onValueChange={(val) => setSectionFormData({...sectionFormData, adviser_name: val === NO_ADVISER_VALUE ? "" : val})}>
                   <SelectTrigger className={!sectionFormData.adviser_name || sectionFormData.adviser_name === NO_ADVISER_VALUE ? "text-muted-foreground" : ""}>
                     <SelectValue placeholder="Select Adviser" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value={NO_ADVISER_VALUE}>-- None --</SelectItem>
                     {loadingTeachers ? <SelectItem value="loading" disabled>Loading...</SelectItem> : teachers.length === 0 ? <SelectItem value="no-teachers" disabled>No teachers</SelectItem> : teachers.map(t => <SelectItem key={t.id} value={`${t.last_name}, ${t.first_name}`}>{t.last_name}, {t.first_name} ({t.username})</SelectItem>)}
                   </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowSectionDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmittingSection}>{isSubmittingSection ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>} Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Import Dialog Removed */}

        <StudentForm isOpen={showAddDialog} onClose={() => setShowAddDialog(false)} mode="add" sections={sections} onSuccess={() => { if (hasSearched) fetchStudents(); }} />

        <StudentForm isOpen={showEditDialog} onClose={() => setShowEditDialog(false)} mode="edit" initialData={selectedStudent ? { ...selectedStudent, lrn: selectedStudent.lrn, section_id: selectedStudent.current_enrollment?.section?.id.toString() || "", school_year: selectedStudent.current_enrollment?.school_year || defaultSchoolYear } : undefined} studentId={selectedStudent?.id} sections={sections} onSuccess={() => { if (hasSearched) fetchStudents(); }} />

        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
           <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{selectedStudent?.last_name}, {selectedStudent?.first_name}</DialogTitle><DialogDescription>Student Details</DialogDescription></DialogHeader>
              {selectedStudent && (
                <div className="space-y-5 py-4 text-sm">
                   <section><h3 className="font-semibold text-base border-b pb-1 mb-3 text-primary">Personal Information</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                       <div><span className="text-muted-foreground block text-xs font-medium">LRN</span> {selectedStudent.lrn}</div>
                       <div><span className="text-muted-foreground block text-xs font-medium">Gender</span> {selectedStudent.gender}</div>
                       <div><span className="text-muted-foreground block text-xs font-medium">Birth Date</span> {selectedStudent.birth_date ? new Date(selectedStudent.birth_date + 'T00:00:00').toLocaleDateString() : 'N/A'}</div>
                       <div className="sm:col-span-2"><span className="text-muted-foreground block text-xs font-medium">Address</span> {selectedStudent.address || 'N/A'}</div>
                     </div>
                   </section>
                   <section><h3 className="font-semibold text-base border-b pb-1 mb-3 text-primary">Current Enrollment</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        <div><span className="text-muted-foreground block text-xs font-medium">Grade & Section</span> {selectedStudent.section ? `Grade ${selectedStudent.grade} - ${selectedStudent.section.name}` : `Grade ${selectedStudent.grade || 'N/A'}`}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">Adviser</span> {selectedStudent.adviser_name || 'N/A'}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">School Year</span> {selectedStudent.current_enrollment?.school_year || 'N/A'}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">Status</span> <Badge variant={(selectedStudent.is_active ?? true) ? 'default':'secondary'} className="text-xs font-normal">{(selectedStudent.is_active ?? true) ? 'Active' : 'Inactive'}</Badge></div>
                      </div>
                   </section>
                   <section><h3 className="font-semibold text-base border-b pb-1 mb-3 text-primary">Enrollment History</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        {selectedStudent.section_history && selectedStudent.section_history.length > 0 ? selectedStudent.section_history.map(e => (
                           <div key={e.id}><span className="text-muted-foreground block text-xs font-medium">{e.school_year}</span> Grade {e.section.grade} - {e.section.name} {e.is_active && <Badge variant="outline" className="ml-2">Current</Badge>}</div>
                        )) : <p className="text-muted-foreground">No history found.</p>}
                      </div>
                   </section>
                   <section><h3 className="font-semibold text-base border-b pb-1 mb-3 text-primary">Contact & Guardian</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        <div><span className="text-muted-foreground block text-xs font-medium">Email</span> {selectedStudent.email || 'N/A'}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">Phone</span> {selectedStudent.phone || 'N/A'}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">Guardian Name</span> {selectedStudent.guardian_name}</div>
                        <div><span className="text-muted-foreground block text-xs font-medium">Guardian Phone</span> {selectedStudent.guardian_phone}</div>
                      </div>
                   </section>
                </div>
              )}
              <DialogFooter className="mt-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
                <Button variant="secondary" onClick={() => generateQRCode(selectedStudent)}><QrCode className="w-4 h-4 mr-2"/> QR Code</Button>
                <Button onClick={() => { setShowViewDialog(false); openEditDialog(selectedStudent!); }} disabled={!selectedStudent}><Edit className="w-4 h-4 mr-2"/> Edit</Button>
              </DialogFooter>
           </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentManagement;