// src/pages/Reports.tsx (FULL UPDATED FILE)

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
// SNHSLogo is imported but not used, can be removed if you like
// import SNHSLogo from "@/assets/SNHS.png"; 
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
// (Matches the Sf10GradeSerializer)
export interface Grade { 
    subject_name: string;
    q1: number | null;
    q2: number | null;
    q3: number | null;
    q4: number | null;
    final: number | null;
    // academic_year is no longer needed here, it's the key in gradesByYear
}

// --- UPDATED Student INTERFACE ---
// (This now *exactly* matches the StudentSf10Serializer output)
export interface Student { 
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
    general_average: number | null;
    elementarySchool: string | null;
    elementarySchoolId: string | null;
    elementarySchoolAddress: string | null;
    elementaryGenAve: number | string | null;
    gradesByYear: Record<string, Grade[]>; // e.g., {"2023-2024": [ ...grades... ]}
}

// --- Other interfaces (no longer used by SF10 fetch) ---
// (Omitted for brevity, no changes needed)
/* ... */
// --- End interface definitions ---


// =============================================================
// ⭐️⭐️⭐️ THIS IS THE FIX ⭐️⭐️⭐️
// =============================================================
// We read from the environment variables you already set up.
// Your .env file correctly sets these for local development.
// Render correctly sets these for production.

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

const WS_REPORTS_URL = `${WS_BASE_URL}/ws/reports/`;
// We will use the API_BASE variable directly in the fetch call
// =============================================================
// ⭐️⭐️⭐️ END OF FIX ⭐️⭐️⭐️
// =============================================================


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
            console.log("WebSocket already open or connecting.");
            return;
        }
        const token = localStorage.getItem("access_token");
        if (!token) {
           console.error("Reports WebSocket: No access token found. Cannot connect.");
           toast({ title: "Authentication Error", description: "Cannot connect to report server. Please log in again.", variant: "destructive" });
           if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
           return;
        }
        // This line is now fixed because WS_REPORTS_URL is dynamic
        const wsUrlWithToken = `${WS_REPORTS_URL}?token=${encodeURIComponent(token)}`;
        console.log("Attempting WebSocket connection to:", wsUrlWithToken);
        const ws = new WebSocket(wsUrlWithToken);
        wsRef.current = ws;

        ws.onopen = () => { console.log("Reports WebSocket connected ✅"); if (reconnectTimer.current) clearTimeout(reconnectTimer.current); };
        ws.onclose = (event) => { console.warn(`Reports WebSocket disconnected (Code: ${event.code}). Reconnecting...`); wsRef.current = null; if (!event.wasClean && localStorage.getItem("access_token")) { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); reconnectTimer.current = setTimeout(connectWS, 3000 + Math.random() * 1000); } else { console.log("WebSocket closed cleanly or no token, not reconnecting."); } };
        ws.onerror = (error) => { console.error("Reports WebSocket error:", error); if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) { wsRef.current.close(); } wsRef.current = null; };

        ws.onmessage = (event) => {
            setIsLoading(false);
            try {
                const data = JSON.parse(event.data);
                console.log("WS Message Received:", data);
                if (data.status === "ok") {
                    // --- WebSocket is ONLY used for search results ---
                    if (data.results && Array.isArray(data.results)) {
                        setSearchResults(data.results);
                        setSelectedStudent(null); // Clear student detail when new search happens
                        if (data.results.length === 0) {
                            toast({ title: "No Results", description: "No students found matching your criteria." });
                        }
                    } else {
                        // Handle cases where WS might send other 'ok' messages if needed
                        console.warn("Received OK status from WS but no valid results data:", data);
                    }
                } else if (data.status === "error") { 
                    console.error("WebSocket Search Error:", data.message); 
                    toast({title: "Search Failed", description: data.message || "Could not complete search request.", variant: "destructive"}); 
                    setSearchResults([]); 
                    setSelectedStudent(null); 
                } else { 
                    console.warn("Received unknown WebSocket message structure:", data); 
                }
            } catch(e) { 
                setIsLoading(false); 
                console.error("Failed to parse WebSocket message:", e, event.data); 
                toast({title: "Communication Error", description: "Received invalid data from server via WebSocket.", variant: "destructive"}); 
            }
        };
   };
    connectWS();
    return () => { console.log("Reports component unmounting. Closing WebSocket."); if (reconnectTimer.current) clearTimeout(reconnectTimer.current); if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(1000, "Component unmounting"); wsRef.current = null; } };
  }, [toast]);

  // --- Search Handler (Uses WebSocket) ---
  const handleSearch = () => {
     if (!search.trim() && gradeFilter === "all" && sectionFilter === "all") { toast({ title: "Input Needed", description: "Please enter a search term or select filters." }); return; }
     if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { toast({ title: "Connection Error", description: "Not connected to report server. Please wait or try refreshing.", variant: "destructive" }); return; }
     console.log(`Sending search request: term='${search.trim()}', grade='${gradeFilter}', section='${sectionFilter}'`);
     setIsLoading(true); 
     setSearchResults([]); // Clear previous results
     setSelectedStudent(null); // Clear previous student detail
     wsRef.current.send(JSON.stringify({ action: "search_student", search: search.trim(), grade: gradeFilter !== "all" ? gradeFilter : undefined, section: sectionFilter !== "all" ? sectionFilter : undefined }));
  };

  // --- Select Student Handler (Uses Fetch API) ---
  const handleSelectStudent = async (studentLrn: string) => {
    console.log(`Fetching full SF10 data for student LRN: ${studentLrn}`);
    setIsLoading(true);
    setSelectedStudent(null); // Clear previous student detail
    setSearchResults([]); // Clear search results

    const token = localStorage.getItem("access_token");
    if (!token) {
        toast({ title: "Authentication Error", description: "You are not logged in.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
        // =============================================================
        // ⭐️⭐️⭐️ THIS IS THE FIX (Part 2) ⭐️⭐️⭐️
        // =============================================================
        // Fetch from the new HTTP API endpoint using the dynamic API_BASE
        const response = await fetch(`${API_BASE}/students/${studentLrn}/sf10/`, {
        // =============================================================
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Send the auth token
            }
        });

        if (!response.ok) {
            let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
            try {
                // Try to get more specific error detail from the response body
                const errorData = await response.json();
                errorMsg = errorData.detail || JSON.stringify(errorData); 
            } catch (e) { /* Ignore parsing error if response is not JSON */ }
            
            // Provide specific user feedback based on status code
            if (response.status === 404) {
                 toast({ title: "Not Found", description: "No SF10 report could be generated for this student LRN.", variant: "destructive" });
            } else if (response.status === 403) {
                 toast({ title: "Permission Denied", description: "You do not have permission to view this SF10 report.", variant: "destructive" });
            } else {
                 toast({ title: "Server Error", description: errorMsg, variant: "destructive" });
            }
            // Throw error to be caught by the catch block
            throw new Error(`Failed to fetch SF10: ${errorMsg}`); 
        }

        // Parse the JSON data from the response
        const data: Student = await response.json();
        
        // --- THIS IS THE FIX ---
        // Set the state with the correctly formatted data from the API
        setSelectedStudent(data);

    } catch (error) {
        // Log the error and show a generic fetch error toast
        console.error("Failed to fetch student SF10 data:", error);
        // Avoid showing overly technical details to the user unless necessary
        toast({ title: "Fetch Error", description: "Could not retrieve student SF10 report. Please try again.", variant: "destructive" });
    } finally {
        // Ensure loading indicator is turned off
        setIsLoading(false);
    }
  }

  // --- Print Handler (Unchanged) ---
  const handlePrint = () => {
     if (!selectedStudent) { toast({title: "Nothing to Print", description: "Please search and select a student first.", variant: "destructive"}); return; } window.print();
  }

  // --- Download PDF Handler (Unchanged) ---
  const handleDownloadPdf = () => {
     if (!selectedStudent) { toast({title: "Nothing to Download", description: "Please search and select a student first.", variant: "destructive"}); return; } toast({title: "Not Implemented", description: "PDF download functionality is not yet available."}); console.log("PDF Download Triggered for:", selectedStudent);
  }

  // --- General Average Display (Unchanged) ---
  // Uses data directly from selectedStudent if available
  const displayGeneralAverage = selectedStudent?.general_average?.toFixed(2) ?? "N/A";

  // --- calculateAge (Unchanged) ---
  const calculateAge = (birthDateString?: string): number | string => {
       if (!birthDateString) return "N/A";
       try {
           const birthDate = new Date(birthDateString);
           // Check if the date is valid
           if (isNaN(birthDate.getTime())) {
               console.error("Invalid date string provided to calculateAge:", birthDateString);
               return "Invalid Date";
           }
           const today = new Date();
           let age = today.getFullYear() - birthDate.getFullYear();
           const m = today.getMonth() - birthDate.getMonth();
           // Adjust age if the birthday hasn't occurred yet this year
           if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
               age--;
           }
           // Ensure age is not negative (e.g., future birth date)
           return age >= 0 ? age : "Invalid Date";
       } catch (e) {
           console.error("Error calculating age:", e);
           return "Error"; 
       }
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

        {/* Loading Indicator */}
        {isLoading && ( <Card><CardContent className="p-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 mr-2 animate-spin inline-block"/> Loading...</CardContent></Card> )}

        {/* Search Results List (Uses WebSocket results) */}
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
                                {/* Button now calls handleSelectStudent with the LRN */}
                                <Button variant="outline" size="sm" onClick={() => handleSelectStudent(result.student_id)}> 
                                    <UserCheck className="w-4 h-4 mr-2"/> Select 
                                </Button> 
                            </li> 
                        ))} 
                    </ul> 
                </CardContent> 
            </Card> 
        )}

         {/* Action Buttons (Show when student detail is loaded) */}
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

        {/* SF10 Layout Display (Shows when student detail is loaded) */}
        {!isLoading && selectedStudent && (
            <div className="sf10-layout-content print-content">
                {/* Pass the loaded student data to the layout component */}
                <Sf10HsFormLayout student={selectedStudent} />
            </div>
        )}

        {/* Placeholder when no student is selected and not loading/searching */}
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