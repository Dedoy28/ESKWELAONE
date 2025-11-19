// src/pages/Reports.tsx
// ⭐️ FINAL FIXED VERSION: Fixed Type Mismatch (Number vs String) ⭐️

import React, { useState, useEffect, useRef, useMemo } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Search, Printer, UserCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sf10HsFormLayout from "@/components/Reports/Sf10HsFormLayout";

// Interface for simplified search results (from WebSocket)
interface SearchResultStudent {
    id: number;
    student_id: string; // LRN
    name: string;
    grade: string;
    section: string;
}

// --- UPDATED Grade INTERFACE ---
export interface Grade { 
    subject_name: string;
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
    final: number | null;
}

// --- UPDATED Student INTERFACE (Fixed the Type Mismatch) ---
export interface Student { 
    id: number; 
    
    lastName: string;
    firstName: string;
    nameExtension: string | null;
    middleName: string | null;
    lrn: string;
    birth_date: string | null;
    sex: string;
    grade: string;
    section: string | null;
    adviser: string | null;
    
    // ⭐️ FIX: Changed to 'string' because Backend sends Decimals as strings ("85.00")
    // This matches the Sf10HsFormLayout requirement.
    general_average: string | null; 
    
    elementarySchool: string | null;
    elementarySchoolId: string | null;
    elementarySchoolAddress: string | null;
    elementaryGenAve: number | string | null;
    gradesByYear: Record<string, Grade[]>; 
    
    section_history?: any[]; 
}

// --- DYNAMIC URLS ---
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const WS_REPORTS_URL = `${WS_BASE_URL}/ws/reports/`;

export default function Reports() {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchResults, setSearchResults] = useState<SearchResultStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // --- WebSocket Connection Logic (For Search ONLY) ---
  useEffect(() => {
    const connectWS = () => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED && wsRef.current.readyState !== WebSocket.CLOSING) {
            return;
        }
        const token = localStorage.getItem("access_token");
        if (!token) {
           console.error("Reports WebSocket: No access token found. Cannot connect.");
           if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
           return;
        }
        
        const wsUrlWithToken = `${WS_REPORTS_URL}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrlWithToken);
        wsRef.current = ws;

        ws.onopen = () => { console.log("Reports WebSocket connected ✅"); if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
        ws.onclose = (event) => { console.warn(`Reports WebSocket disconnected (Code: ${event.code}). Reconnecting...`); wsRef.current = null; if (!event.wasClean && localStorage.getItem("access_token")) { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); reconnectTimer.current = setTimeout(connectWS, 3000 + Math.random() * 1000); } };
        ws.onerror = (error) => { console.error("Reports WebSocket error:", error); if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) { wsRef.current.close(); } wsRef.current = null; };

        ws.onmessage = (event) => {
            setIsLoading(false);
            try {
                const data = JSON.parse(event.data);
                if (data.status === "ok") {
                    if (data.results && Array.isArray(data.results)) {
                        setSearchResults(data.results);
                        setSelectedStudent(null); 
                        if (data.results.length === 0) {
                            toast({ title: "No Results", description: "No students found matching your criteria." });
                        }
                    }
                } else if (data.status === "error") { 
                    console.error("WebSocket Search Error:", data.message); 
                    toast({title: "Search Failed", description: data.message || "Could not complete search request.", variant: "destructive"}); 
                    setSearchResults([]); 
                    setSelectedStudent(null); 
                }
            } catch(e) { 
                setIsLoading(false); 
                console.error("Failed to parse WebSocket message:", e, event.data); 
            }
        };
   };
    connectWS();
    return () => { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(1000, "Component unmounting"); wsRef.current = null; } };
  }, [toast]);

  // --- Search Handler (Uses WebSocket) ---
  const handleSearch = () => {
     if (!search.trim() && gradeFilter === "all" && sectionFilter === "all") { toast({ title: "Input Needed", description: "Please enter a search term or select filters." }); return; }
     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { toast({ title: "Connection Error", description: "Not connected to report server. Please wait or try refreshing.", variant: "destructive" }); return; }
     setIsLoading(true); 
     setSearchResults([]); 
     setSelectedStudent(null); 
     wsRef.current.send(JSON.stringify({ action: "search_student", search: search.trim(), grade: gradeFilter !== "all" ? gradeFilter : undefined, section: sectionFilter !== "all" ? sectionFilter : undefined }));
  };

  // --- Select Student Handler (Uses Fetch API) ---
  const handleSelectStudent = async (studentLrn: string) => {
    setIsLoading(true);
    setSelectedStudent(null);
    setSearchResults([]);

    const token = localStorage.getItem("access_token");
    if (!token) {
        toast({ title: "Authentication Error", description: "You are not logged in.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/students/${studentLrn}/sf10/`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}`;
            if (response.status === 404) toast({ title: "Not Found", description: "No SF10 report could be generated for this student LRN.", variant: "destructive" });
            else if (response.status === 403) toast({ title: "Permission Denied", description: "You do not have permission to view this SF10 report.", variant: "destructive" });
            else toast({ title: "Server Error", description: errorMsg, variant: "destructive" });
            throw new Error(`Failed to fetch SF10: ${errorMsg}`); 
        }

        const data: Student = await response.json();
        setSelectedStudent(data);

    } catch (error) {
        console.error("Failed to fetch student SF10 data:", error);
        toast({ title: "Fetch Error", description: "Could not retrieve student SF10 report. Please try again.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  const handlePrint = () => {
     if (!selectedStudent) { toast({title: "Nothing to Print", description: "Please search and select a student first.", variant: "destructive"}); return; } window.print();
  }

  const handleDownloadPdf = () => {
     if (!selectedStudent) { toast({title: "Nothing to Download", description: "Please search and select a student first.", variant: "destructive"}); return; } toast({title: "Not Implemented", description: "PDF download functionality is not yet available."});
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 report-page-container">
        {/* Header */}
        <div className="flex items-center gap-3 print:hidden">
            <FileDown className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports</h1>
              <p className="text-muted-foreground">
                Generate Learner Permanent Records (SF10-JHS)
              </p>
            </div>
        </div>

        {/* Search/Filter Section */}
        <Card className="print:hidden">
           <CardHeader> <CardTitle>Search Student</CardTitle> <CardDescription> Enter LRN or name, and optionally filter by grade/section. </CardDescription> </CardHeader> <CardContent className="flex flex-col md:flex-row gap-3"> <div className="flex-grow relative"> <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> <Input placeholder="Enter LRN or Name..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="pl-10" /> </div> <Select value={gradeFilter} onValueChange={setGradeFilter}> <SelectTrigger className="w-full md:w-[150px]"> <SelectValue placeholder="Grade Level" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Grades</SelectItem> <SelectItem value="7">Grade 7</SelectItem> <SelectItem value="8">Grade 8</SelectItem> <SelectItem value="9">Grade 9</SelectItem> <SelectItem value="10">Grade 10</SelectItem> </SelectContent> </Select> <Select value={sectionFilter} onValueChange={setSectionFilter}> <SelectTrigger className="w-full md:w-[150px]"> <SelectValue placeholder="Section" /> </SelectTrigger> <SelectContent> <SelectItem value="all">All Sections</SelectItem> <SelectItem value="A">Section A</SelectItem> <SelectItem value="B">Section B</SelectItem> <SelectItem value="C">Section C</SelectItem> </SelectContent> </Select> <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto"> {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Search className="w-4 h-4 mr-2" />} Search </Button> </CardContent>
        </Card>

        {isLoading && ( <Card><CardContent className="p-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin inline-block"/> Loading...</CardContent></Card> )}

        {!isLoading && searchResults.length > 0 && ( 
            <Card className="print:hidden"> 
                <CardHeader> 
                    <CardTitle>Search Results</CardTitle> 
                    <CardDescription>Select a student to view their record.</CardDescription> 
                </CardHeader> 
                <CardContent> 
                    <ul className="space-y-2"> 
                        {searchResults.map((result) => ( 
                            <li key={result.id} className="border p-3 rounded hover:bg-muted/30 flex justify-between items-center"> 
                                <div> 
                                    <p className="font-semibold">{result.name}</p> 
                                    <p className="text-sm text-muted-foreground"> 
                                        LRN: {result.student_id} | Grade: {result.grade} | Section: {result.section} 
                                    </p> 
                                </div> 
                                <Button variant="outline" size="sm" onClick={() => handleSelectStudent(result.student_id)}> 
                                    <UserCheck className="w-4 h-4 mr-2"/> Select 
                                </Button> 
                            </li> 
                        ))} 
                    </ul> 
                </CardContent> 
            </Card> 
        )}

         {/* Action Buttons */}
        {!isLoading && selectedStudent && ( 
            <Card className="print:hidden"> 
                <CardContent className="p-4 flex flex-col sm:flex-row gap-3 justify-end"> 
                    <Button variant="outline" onClick={handleDownloadPdf}> 
                        <FileDown className="w-4 h-4 mr-2" /> Download PDF 
                    </Button> 
                    <Button onClick={handlePrint}> 
                        <Printer className="w-4 h-4 mr-2" /> Print Record 
                    </Button> 
                </CardContent> 
            </Card> 
        )}

        {/* SF10 Layout Display */}
        {!isLoading && selectedStudent && (
            <div className="sf10-layout-content print-content">
                {/* We pass the selectedStudent which now matches the required Interface */}
                <Sf10HsFormLayout student={selectedStudent} />
            </div>
        )}

        {!isLoading && !selectedStudent && searchResults.length === 0 && (
             <Card className="print:hidden">
                 <CardContent className="p-6 text-center text-muted-foreground">
                     Search for a student to view their SF10 report.
                 </CardContent>
             </Card>
        )}

      </div>
    </DashboardLayout>
  );
}