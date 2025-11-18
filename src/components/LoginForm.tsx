import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock, GraduationCap } from "lucide-react";
import logo from "@/assets/SNHS.png";
import backgroundImage from "@/assets/SNHSbackground.png";

export const LoginForm = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login({
        email: formData.email,
        password: formData.password,
      } as any);

      if (!success) {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: `Welcome back!`,
          variant: "default",
        });
      }
    } catch {
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div
        className="hidden md:flex flex-1 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#800000]/80 to-black/70 backdrop-blur-sm"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-center px-8">
          <img
            src={logo}
            alt="SNHS Logo"
            className="w-24 h-24 mb-6 drop-shadow-lg animate-float"
          />
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-wide">
            EskwelaOne
          </h1>
          <p className="text-white/90 text-sm flex items-center justify-center gap-1">
            <GraduationCap className="w-4 h-4" /> Sindalan National High School
          </p>
          <p className="text-white/70 text-xs mt-2">
            Education Management Information System
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex justify-center items-center bg-gray-50 relative">
        <div className="absolute inset-0 bg-gradient-to-tl from-gray-100 via-white to-gray-50"></div>

        <Card className="relative z-10 w-full max-w-md shadow-2xl border-0 rounded-3xl bg-white/90 backdrop-blur-xl p-2 animate-fadeIn">
          <CardHeader className="text-center pb-3 pt-6 px-6">
            <CardTitle className="text-2xl font-semibold text-[#800000]">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm mt-1">
              Sign in to continue to your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-[#800000] focus:ring-[#800000]/30 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-[#800000] focus:ring-[#800000]/30 text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input type="checkbox" className="accent-[#800000]" />
                  Remember me
                </label>
                <button className="hover:text-[#800000] transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full mt-5 h-11 bg-gradient-to-r from-[#800000] to-[#9d1f1f] hover:from-[#9d1f1f] hover:to-[#800000] text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing In...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-center text-xs text-gray-500 mt-5">
                Need help? Contact your system administrator
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="absolute bottom-4 text-center w-full text-gray-400 text-xs">
          © 2025 EskwelaOne. All rights reserved.
        </div>
      </div>
    </div>
  );
};