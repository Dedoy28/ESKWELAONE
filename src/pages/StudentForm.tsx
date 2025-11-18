// src/pages/StudentForm.tsx (FINAL - BATCH PROMOTION & LRN FIX APPLIED)

import React, { useState, useRef, useMemo } from "react";
// Note: PapaParse removed because we now send the file directly to the backend
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Upload, FileDown } from "lucide-react";

// ⭐️ --- API URLs --- ⭐️
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";
const API_URL = `${API_BASE}/students/`;
const IMPORT_URL = `${API_BASE}/students/import/`; // ⭐️ NEW: Direct Backend Import URL

// --- (Interfaces) ---
interface DecodedToken {
  exp: number;
}

interface Section {
  id: number;
  name: string;
  school_year: string;
  grade: string;
  adviser_name: string;
  subject?: string;
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  middle_name: string;
  lrn: string; 
  section_id: string; 
  school_year: string; 
  email: string;
  phone: string;
  address: string;
  birth_date: string;
  gender: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  emergency_contact: string;
  medical_notes: string;
  is_active: boolean;
}

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: any;
  studentId?: number;
  sections: Section[];
  onSuccess: () => void;
}

// Helper functions
function decodeJwtPayload(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    switch (payload.length % 4) {
      case 0: break;
      case 2: payload += '=='; break;
      case 3: payload += '='; break;
      default: return null;
    }
    const decodedPayload = atob(payload);
    return JSON.parse(decodedPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
}

export const StudentForm: React.FC<StudentFormProps> = ({
  isOpen,
  onClose,
  mode,
  initialData,
  studentId,
  sections,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localSections, setLocalSections] = useState<Section[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const currentYear = new Date().getFullYear();
  const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;

  const [formData, setFormData] = useState<StudentFormData>({
    first_name: '',
    last_name: '',
    middle_name: '',
    lrn: '',
    section_id: '',
    school_year: defaultSchoolYear,
    email: '',
    phone: '',
    address: '',
    birth_date: '',
    gender: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    emergency_contact: '',
    medical_notes: '',
    is_active: true
  });

  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      const currentEnrollment = initialData.current_enrollment;
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        middle_name: initialData.middle_name || '',
        lrn: initialData.lrn || '',
        section_id: currentEnrollment?.section?.id.toString() || '',
        school_year: currentEnrollment?.school_year || defaultSchoolYear,
        email: initialData.email || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        birth_date: initialData.birth_date || '',
        gender: initialData.gender || '',
        guardian_name: initialData.guardian_name || '',
        guardian_phone: initialData.guardian_phone || '',
        guardian_email: initialData.guardian_email || '',
        emergency_contact: initialData.emergency_contact || '',
        medical_notes: initialData.medical_notes || '',
        is_active: initialData.is_active ?? true
      });
    } else if (mode === 'add') {
      setFormData({
        first_name: '', last_name: '', middle_name: '', lrn: '',
        section_id: '', school_year: defaultSchoolYear, email: '',
        phone: '', address: '', birth_date: '', gender: '',
        guardian_name: '', guardian_phone: '', guardian_email: '',
        emergency_contact: '', medical_notes: '', is_active: true
      });
    }
  }, [initialData, mode, isOpen, defaultSchoolYear]);

  React.useEffect(() => {
    if (sections && sections.length > 0) {
      setLocalSections(sections);
    }
  }, [sections]);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('63') && cleaned.length >= 12) return '+' + cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 11) return '+63' + cleaned.substring(1);
    if (cleaned.length === 10 && cleaned.startsWith('9')) return '+63' + cleaned;
    return "";
  };

  // Helper for Token Refresh
  const getFreshToken = async () => {
    let accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!accessToken || !refreshToken) throw new Error("No tokens found");
    const decoded: DecodedToken | null = decodeJwtPayload(accessToken);
    const now = Math.floor(Date.now() / 1000);
    if (!decoded || decoded.exp < now) {
      const res = await fetch(`${API_BASE}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!res.ok) throw new Error("Failed to refresh token");
      const data = await res.json();
      accessToken = data.access;
      localStorage.setItem("access_token", accessToken!);
    }
    return accessToken;
  };

  // ⭐️ --- TEMPLATE DOWNLOADER --- ⭐️
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "first_name", "last_name", "middle_name",
      "lrn",
      "section_id", // IMPORTANT: Needs to be the Section ID Number
      "school_year",
      "email", "phone", "address",
      "birth_date", "gender",
      "guardian_name", "guardian_phone", "guardian_email",
      "emergency_contact", "medical_notes"
    ];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + templateHeaders.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Allow CSV or Excel
      if (file.type !== "text/csv" && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({ title: "Invalid File", description: "Please upload a .csv or .xlsx file.", variant: "destructive" });
        setCsvFile(null); e.target.value = ''; return;
      }
      setCsvFile(file);
    }
  };

  // ⭐️ --- UPDATED: PROCESS CSV VIA BACKEND (SMART PROMOTION) --- ⭐️
  // This replaces the old loop. It sends the file directly to the server.
  const handleProcessCsv = async () => {
    if (!csvFile) {
      toast({ title: "No File", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }
    setIsCsvProcessing(true);
    toast({ title: "Uploading...", description: "Sending file to server for processing..." });

    try {
      const token = await getFreshToken();
      const formData = new FormData();
      formData.append("file", csvFile);

      // ⭐️ This hits your new Backend View
      const response = await fetch(IMPORT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
          // Do NOT set Content-Type manually for FormData
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.detail || "Upload failed.");
      }

      // Handle Success Report
      toast({
        title: "Batch Process Complete",
        description: `Created: ${result.created} | Updated/Promoted: ${result.updated}`,
        duration: 5000,
      });

      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 3).join("\n");
        toast({
          title: "Some Rows Failed",
          description: (
             <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
               <code className="text-white text-xs">
                 {errorMsg}
                 {result.errors.length > 3 ? `\n...and ${result.errors.length - 3} more.` : ''}
               </code>
             </pre>
          ),
          variant: "destructive",
          duration: 8000
        });
      }

      if (result.created > 0 || result.updated > 0) {
        onSuccess();
        handleClose();
      }

    } catch (error: any) {
      console.error("Import Error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Server rejected the file.",
        variant: "destructive"
      });
    } finally {
      setIsCsvProcessing(false);
      setCsvFile(null);
    }
  };

  // ⭐️ --- FORM SUBMISSION (Manual Entry) --- ⭐️
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ⭐️ FIX: LRN Length Check
    if (formData.lrn.length !== 12) {
        toast({ title: "Invalid LRN", description: "LRN must be exactly 12 digits.", variant: "destructive" });
        return; 
    }
    
    const normalizedData: any = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      middle_name: formData.middle_name,
      lrn: formData.lrn,
      section_id: parseInt(formData.section_id, 10),
      school_year: formData.school_year,
      email: formData.email,
      phone: formData.phone ? formatPhoneNumber(formData.phone) : '',
      address: formData.address,
      birth_date: formData.birth_date,
      gender: formData.gender === "Male" ? "Male" : formData.gender === "Female" ? "Female" : "",
      guardian_name: formData.guardian_name,
      guardian_phone: formatPhoneNumber(formData.guardian_phone),
      guardian_email: formData.guardian_email,
      emergency_contact: formData.emergency_contact ? formatPhoneNumber(formData.emergency_contact) : '',
      medical_notes: formData.medical_notes,
      is_active: formData.is_active,
    };

    const requiredFields = ['first_name', 'last_name', 'lrn', 'section_id', 'school_year', 'address', 'birth_date', 'gender', 'guardian_name', 'guardian_phone'];
    
    for (const field of requiredFields) {
      if (!normalizedData[field] && normalizedData[field] !== 0) { 
        toast({ title: "Validation Error", description: `Please fill in ${field.replace(/_/g, ' ')}`, variant: "destructive" });
        return; 
      }
    }

    setIsSubmitting(true);

    try {
      const token = await getFreshToken();
      const url = mode === 'edit' && studentId ? `${API_URL}${studentId}/` : API_URL;
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(normalizedData), 
      });

      const data = await response.json();

      if (response.ok) {
        toast({ 
          title: "Success", 
          description: `${data.first_name} ${data.last_name} has been saved.` 
        });
        onSuccess();
        handleClose();
      } else {
        // Handle Errors
        let errorMessage = "Failed to save student.";
        if (data.lrn) errorMessage = `LRN Error: ${data.lrn.join(' ')}`;
        else if (data.detail) errorMessage = data.detail;
        else errorMessage = Object.values(data).flat().join(" ");
        
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };
  
  // ⭐️ --- NEW: Handle LRN Input (Numbers Only) --- ⭐️
  const handleLrnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Replace any non-digit character with empty string
      const numericValue = value.replace(/[^0-9]/g, '');
      // Limit to 12 characters
      if (numericValue.length <= 12) {
          setFormData({ ...formData, lrn: numericValue });
      }
  };

  // ⭐️ --- HELPER TO GET SECTIONS FILTERED BY SELECTED SCHOOL YEAR --- ⭐️
  const sectionsForSchoolYear = useMemo(() => {
    return localSections.filter(s => s.school_year === formData.school_year);
  }, [localSections, formData.school_year]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Student' : 'Add New Student'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update student information' : 'Enroll a new student using CSV import or manual entry'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            
            {mode === 'add' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Batch Enrollment (CSV)</CardTitle>
                  <CardDescription>Upload a CSV/Excel file to add or promote students.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button type="button" variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <div className="space-y-2">
                    <Label htmlFor="csv-upload" className="sr-only">Upload File</Label>
                    <Input id="csv-upload" type="file" accept=".csv, .xlsx" onChange={handleFileChange} disabled={isCsvProcessing} className="file:text-primary file:font-semibold file:border-0 file:bg-primary/10 hover:file:bg-primary/20" />
                  </div>
                  <Button type="button" className="w-full" onClick={handleProcessCsv} disabled={!csvFile || isCsvProcessing}>
                    {isCsvProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isCsvProcessing ? 'Processing...' : 'Upload & Process File'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} placeholder="Enter first name" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} placeholder="Enter last name" />
                </div>
                <div>
                  <Label>Middle Name</Label>
                  <Input value={formData.middle_name} onChange={(e) => setFormData({...formData, middle_name: e.target.value})} placeholder="Enter middle name" />
                </div>
                {/* ⭐️ LRN INPUT with Restriction ⭐️ */}
                <div>
                  <Label>LRN (Learner Reference Number) *</Label>
                  <Input 
                      value={formData.lrn} 
                      onChange={handleLrnChange} 
                      placeholder="Enter 12-digit LRN" 
                      maxLength={12} 
                  />
                </div>
                <div>
                  <Label>Birth Date *</Label>
                  <Input type="date" value={formData.birth_date} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                </div>
                <div>
                  <Label>Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem key="gender-male" value="Male">Male</SelectItem>
                      <SelectItem key="gender-female" value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Address *</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Enter complete address" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Academic Enrollment</CardTitle>
                <CardDescription>Select the school year and section for this enrollment.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>School Year *</Label>
                  <Input 
                    value={formData.school_year} 
                    onChange={(e) => setFormData({...formData, school_year: e.target.value, section_id: ''})}
                    placeholder="e.g., 2025-2026"
                  />
                </div>
                <div>
                  <Label>Section *</Label>
                  <Select 
                    value={formData.section_id} 
                    onValueChange={(value) => setFormData({...formData, section_id: value})}
                    disabled={sectionsForSchoolYear.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section for this school year" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsForSchoolYear.length === 0 && (
                        <SelectItem value="none" disabled>No sections found for {formData.school_year}</SelectItem>
                      )}
                      {sectionsForSchoolYear.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          Grade {section.grade} - {section.name} ({section.adviser_name || 'No Adviser'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="student@email.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+63 9XX XXX XXXX" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Guardian Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Guardian Name *</Label>
                  <Input value={formData.guardian_name} onChange={(e) => setFormData({...formData, guardian_name: e.target.value})} placeholder="Enter guardian name" />
                </div>
                <div>
                  <Label>Guardian Phone *</Label>
                  <Input value={formData.guardian_phone} onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})} placeholder="+63 9XX XXX XXXX" />
                </div>
                <div>
                  <Label>Guardian Email</Label>
                  <Input type="email" value={formData.guardian_email} onChange={(e) => setFormData({...formData, guardian_email: e.target.value})} placeholder="guardian@email.com" />
                </div>
                <div>
                  <Label>Emergency Contact</Label>
                  <Input value={formData.emergency_contact} onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})} placeholder="+63 9XX XXX XXXX" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Label>Health-related notes and conditions</Label>
                <Textarea value={formData.medical_notes} onChange={(e) => setFormData({...formData, medical_notes: e.target.value})} rows={4} placeholder="Enter any medical conditions, allergies, or special health notes..." />
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isCsvProcessing}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {mode === 'edit' ? 'Updating...' : 'Saving...'}
                </div>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> {mode === 'edit' ? 'Update Student' : 'Save Student'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};