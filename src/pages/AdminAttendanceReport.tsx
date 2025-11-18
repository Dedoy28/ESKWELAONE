// src/pages/AdminAttendanceReport.tsx (REVISIONS AND IMPORTS FIXED)

import React, { useEffect, useState, useCallback } from 'react';
// ⭐️ --- FIX: Restored original alias paths --- ⭐️
import { DashboardLayout } from '@/components/Layout/DashboardLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import api from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
// ⭐️ --- END OF FIX --- ⭐️

// Interface for the data from our new serializer
interface AdminAttendanceRecord {
  id: number;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  quarter: number;
  student_name: string;
  student_lrn: string;
  student_grade: string;
  student_section: string;
  subject: string;
  teacher: string;
  updated_at: string;
}

// Interface for our filter state
interface Filters {
  search: string;
  date_after: string; // YYYY-MM-DD
  date_before: string; // YYYY-MM-DD
  grade: string;
  section: string;
  status: string;
}

// This formats a YYYY-MM-DD string to MM/DD/YYYY
const formatLocalDateString = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  } catch (e) {
    return dateString; // fallback if format is unexpected
  }
};

const AdminAttendanceReport = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState<Filters>({
    search: '',
    date_after: today,
    date_before: today,
    grade: '',
    section: '',
    status: '',
  });

  // ⭐️ --- UPDATED DATA FETCHING FUNCTION --- ⭐️
  const fetchRecords = useCallback(() => {
    setLoading(true);

    // Build query parameters from filters
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    
    // ⭐️ FIX: Use the new, correct filter names for the backend query
    if (filters.grade) params.append('student__section_enrollments__section__grade', filters.grade);
    if (filters.section) params.append('student__section_enrollments__section__name', filters.section);
    // ⭐️ END OF FIX
    
    if (filters.status) params.append('status', filters.status);
    
    // Handle date range
    if (filters.date_after && filters.date_before) {
        if(filters.date_after === filters.date_before) {
            params.append('date', filters.date_after);
        } else {
            params.append('date__gte', filters.date_after);
            params.append('date__lte', filters.date_before);
        }
    } else if (filters.date_after) {
        params.append('date__gte', filters.date_after);
    } else if (filters.date_before) {
        params.append('date__lte', filters.date_before);
    }

    api.get('/admin/attendance-report/', { params })
      .then((res) => {
        // The endpoint returns a paginated response, data is in `results`
        setRecords(res.data.results || res.data); 
      })
      .catch((err) => {
        toast({
          title: 'Error loading report',
          description: err.response?.data?.detail || 'An unknown error occurred.',
          variant: 'destructive',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [filters, toast]);

  // Fetch data on initial load
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]); // fetchRecords is memoized, so this only runs once

  // Handle filter input changes
  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Select component changes
  const handleSelectFilterChange = (name: string, value: string) => {
    const newValue = value === 'all' ? '' : value;
    setFilters((prev) => ({ ...prev, [name]: newValue }));
  };

  // Handle the search button click
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };
  
  // Helper to get badge color based on status
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-600';
      case 'absent':
        return 'bg-red-600';
      case 'late':
        return 'bg-orange-500';
      case 'excused':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Admin Attendance Report</CardTitle>
          <CardDescription>
            View all attendance records for the entire school.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter UI */}
          <form onSubmit={handleSearch} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Name, LRN, subject..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_after">Start Date</Label>
                <Input
                  id="date_after"
                  type="date"
                  name="date_after"
                  value={filters.date_after}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_before">End Date</Label>
                <Input
                  id="date_before"
                  type="date"
                  name="date_before"
                  value={filters.date_before}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select
                  name="grade"
                  value={filters.grade || "all"} // Use "all" if filter state is empty
                  onValueChange={(value) => handleSelectFilterChange('grade', value)}
                >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="7">Grade 7</SelectItem>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  value={filters.status || "all"} // Use "all" if filter state is empty
                  onValueChange={(value) => handleSelectFilterChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                    <SelectItem value="Excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>

          {/* Data Table UI */}
          {loading ? (
            <div className="text-center p-8">
              <Loader2 className="animate-spin mx-auto w-8 h-8 text-primary" />
              <p className="text-muted-foreground mt-2">Loading report...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead>Grade & Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No records found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {formatLocalDateString(record.date)}
                        </TableCell>
                        <TableCell>{record.student_name}</TableCell>
                        <TableCell>{record.student_lrn}</TableCell>
                        <TableCell>
                          {record.student_grade} - {record.student_section}
                        </TableCell>
                        <TableCell>{record.subject}</TableCell>
                        <TableCell>{record.teacher}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminAttendanceReport;