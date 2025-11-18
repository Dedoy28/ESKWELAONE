// src/pages/TeacherAttendanceDashboard.tsx
import React, { useEffect, useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { Loader2, CalendarCheck } from 'lucide-react';

// This interface matches the data from your /api/teacher/my-classes/ endpoint
interface TeacherClass {
  id: number;
  subject: string;
  section: string;
  academic_year: string;
}

const TeacherAttendanceDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [myClasses, setMyClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This endpoint in your views.py already works perfectly for this
    api.get('/teacher/my-classes/')
      .then(res => {
        setMyClasses(res.data);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load your assigned classes.",
          variant: "destructive"
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [toast]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Take Attendance</h1>
            <p className="text-muted-foreground">
              Please select a class to begin.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Classes</CardTitle>
            <CardDescription>
              Select a class to take attendance for today.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClasses.length === 0 && (
              <p className="text-muted-foreground col-span-3 text-center py-4">
                You are not currently assigned to any classes.
              </p>
            )}
            {myClasses.map(cls => (
              <div 
                key={cls.id} 
                className="p-4 border rounded-lg shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-lg text-primary">{cls.subject}</h3>
                  <p className="text-muted-foreground">{cls.section}</p>
                  <p className="text-sm text-muted-foreground">{cls.academic_year}</p>
                </div>
                <Button 
                  className="mt-4 w-full"
                  // This navigates to the next page we will create
                  onClick={() => navigate(`/attendance/class/${cls.id}`)}
                >
                  Take Attendance
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendanceDashboard;