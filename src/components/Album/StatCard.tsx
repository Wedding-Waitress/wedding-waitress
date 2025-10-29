import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color?: 'default' | 'warning' | 'muted';
}

export const StatCard = ({ label, value, icon: Icon, color = 'default' }: StatCardProps) => {
  const colorClasses = {
    default: 'text-primary',
    warning: 'text-orange-500',
    muted: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
};
