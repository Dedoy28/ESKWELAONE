import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch"; // Assuming you have a Switch component
import api from "@/lib/axios"; // Assuming api is configured for local server
import { useNavigate } from "react-router-dom";


// ASSUMPTION: This is the endpoint defined in the backend for GradeSettings
// The backend logic ensures the PK is 1, but we use the list view and grab the first item.
const LOCKS_API_URL = "/settings/grade-locks/";

// Interface for global lock settings (matching the backend model: qX_open)
interface QuarterLocks {
    id: number; // Primary key, required for updating the single record (usually 1)
    q1_open: boolean;
    q2_open: boolean;
    q3_open: boolean;
    q4_open: boolean;
}

const ManageGradesLocks = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [locks, setLocks] = useState<QuarterLocks | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- 1. Fetch Current Lock Status ---
    useEffect(() => {
        const fetchLocks = async () => {
            try {
                // Fetch the list of settings (should only contain one object at index [0])
                const res = await api.get(LOCKS_API_URL);
                const data = res.data[0] || null;

                if (data && data.id) {
                    setLocks(data);
                } else {
                    // Handle case where settings might not exist initially, prompting manual creation if needed
                    toast({
                        title: "Setup Required",
                        description: "Global settings object not found. Please log in as Admin to create one.",
                        variant: "default",
                    });
                    // Set default state with no ID to disable saving
                    setLocks({ id: 0, q1_open: true, q2_open: false, q3_open: false, q4_open: false });
                }
            } catch (err: any) {
                console.error("Error fetching grade locks:", err);
                toast({
                    title: "Error Loading Locks",
                    description: err.response?.data?.detail || "Failed to fetch quarter lock settings.",
                    variant: "destructive",
                });
                navigate('/dashboard'); // Fallback if API fails completely
            } finally {
                setLoading(false);
            }
        };
        fetchLocks();
    }, [toast, navigate]);


    // --- 2. Handle Toggle Change ---
    const handleToggle = (key: keyof Omit<QuarterLocks, 'id'>, value: boolean) => {
        setLocks(prev => (prev ? { ...prev, [key]: value } : null));
    };

    // --- 3. Save Changes ---
    const handleSave = async () => {
        if (!locks || !locks.id) {
            toast({ title: "Error", description: "Settings record ID is missing. Cannot save.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // Use PATCH to update the single settings object using its ID
            await api.patch(`${LOCKS_API_URL}${locks.id}/`, locks);

            toast({
                title: "Settings Saved",
                description: "Quarter lock status updated successfully.",
            });
        } catch (err: any) {
            console.error("Error saving grade locks:", err);
            // This is where a 403 Forbidden error (if a non-admin tries to save) is handled.
            const errMsg = err.response?.status === 403 
                         ? "Permission Denied. Only Admin can modify these settings." 
                         : err.response?.data?.detail || "Could not save settings.";

            toast({
                title: "Save Failed",
                description: errMsg,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading Admin Grade Controls...
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    // Array for easy rendering
    const quarters = [
        { key: 'q1_open', name: 'Quarter 1' },
        { key: 'q2_open', name: 'Quarter 2' },
        { key: 'q3_open', name: 'Quarter 3' },
        { key: 'q4_open', name: 'Quarter 4' },
    ] as const;


    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Lock className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Grade Quarter Control</h1>
                        <p className="text-muted-foreground">
                            Globally lock and unlock quarters for teacher grade entry.
                        </p>
                    </div>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Global Quarter Access</CardTitle>
                        <CardDescription>
                            Toggle the switch to **OPEN** or **LOCKED**. Only OPEN quarters allow grade submission by teachers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {quarters.map(({ key, name }) => (
                                <div key={key} className="flex items-center justify-between border-b last:border-b-0 py-3">
                                    <div className="font-medium flex items-center gap-2">
                                        {locks?.[key] ? (
                                            <Unlock className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-red-600" />
                                        )}
                                        {name} Access
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-sm font-medium ${locks?.[key] ? 'text-green-600' : 'text-muted-foreground'}`}>
                                            OPEN
                                        </span>
                                        <Switch
                                            id={`switch-${key}`}
                                            checked={locks?.[key] || false}
                                            onCheckedChange={(value) => handleToggle(key, value)}
                                            disabled={isSaving || locks?.id === 0}
                                        />
                                        <span className={`text-sm font-medium ${!locks?.[key] ? 'text-red-600' : 'text-muted-foreground'}`}>
                                            LOCKED
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="pt-6 flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving || locks?.id === 0}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Global Settings
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default ManageGradesLocks;