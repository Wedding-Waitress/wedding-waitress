import React, { useState } from 'react';
import { Header } from "@/components/Layout/Header";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Lock, 
  User,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

export const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle admin login logic here
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl gradient-text">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-base">
                Secure access to Wedding Waitress administration
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Admin Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="glass"
                    placeholder="admin@weddingwaitress.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center">
                    <Lock className="w-4 h-4 mr-2" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="glass"
                    placeholder="Enter your secure password"
                    required
                  />
                </div>
                
                <Button type="submit" variant="gradient" size="lg" className="w-full btn-glow">
                  Access Admin Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="text-center pt-4">
                  <Link 
                    to="/" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ← Back to main site
                  </Link>
                </div>
                
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-6">
                  <p className="text-xs text-center text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-1" />
                    This is a secure admin area. All access attempts are logged.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};