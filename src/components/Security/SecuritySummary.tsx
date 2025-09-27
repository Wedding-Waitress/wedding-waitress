import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, Lock, Eye, Database } from 'lucide-react';

interface SecurityFeature {
  name: string;
  status: 'implemented' | 'configured' | 'needs_attention';
  description: string;
  icon: React.ReactNode;
}

export const SecuritySummary: React.FC = () => {
  const securityFeatures: SecurityFeature[] = [
    {
      name: "Enhanced Input Validation",
      status: "implemented",
      description: "Comprehensive Zod schemas with length limits, pattern matching, and XSS prevention",
      icon: <Shield className="w-4 h-4" />
    },
    {
      name: "Input Sanitization",
      status: "implemented", 
      description: "Advanced sanitization for all user inputs to prevent injection attacks",
      icon: <Lock className="w-4 h-4" />
    },
    {
      name: "Security Monitoring",
      status: "implemented",
      description: "Real-time monitoring of authentication failures and suspicious activity",
      icon: <Eye className="w-4 h-4" />
    },
    {
      name: "Rate Limiting",
      status: "implemented",
      description: "Protection against brute force attacks and spam attempts",
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      name: "Row Level Security (RLS)",
      status: "implemented",
      description: "All database tables properly secured with user-specific access policies",
      icon: <Database className="w-4 h-4" />
    },
    {
      name: "Leaked Password Protection",
      status: "needs_attention",
      description: "Enable in Supabase Dashboard → Authentication → Settings",
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      name: "PostgreSQL Version",
      status: "needs_attention", 
      description: "Upgrade to latest version in Supabase Dashboard → Settings → General",
      icon: <AlertTriangle className="w-4 h-4" />
    }
  ];

  const getStatusColor = (status: SecurityFeature['status']) => {
    switch (status) {
      case 'implemented':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'configured':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'needs_attention':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    }
  };

  const implementedCount = securityFeatures.filter(f => f.status === 'implemented').length;
  const totalCount = securityFeatures.length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <CardTitle>Security Review Summary</CardTitle>
        </div>
        <CardDescription>
          Comprehensive security analysis and implemented improvements for your Wedding Waitress project
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium">
            {implementedCount} of {totalCount} security measures implemented
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {securityFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-shrink-0 mt-0.5">
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{feature.name}</h4>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(feature.status)}
                  >
                    {feature.status === 'implemented' && 'Implemented'}
                    {feature.status === 'configured' && 'Configured'}
                    {feature.status === 'needs_attention' && 'Action Required'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200">
          <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Security Improvements Implemented
          </h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Enhanced form validation with comprehensive Zod schemas</li>
            <li>• Input sanitization to prevent XSS and injection attacks</li>
            <li>• Security monitoring and audit logging system</li>
            <li>• Rate limiting for authentication and guest creation</li>
            <li>• Improved mobile number and email validation</li>
            <li>• Field length limits and character restrictions</li>
            <li>• Malicious input detection and prevention</li>
          </ul>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
          <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Manual Actions Required
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Enable leaked password protection in Supabase Auth settings</li>
            <li>• Upgrade PostgreSQL to latest version in Supabase Dashboard</li>
            <li>• Review floor plan templates for sensitive venue information</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};