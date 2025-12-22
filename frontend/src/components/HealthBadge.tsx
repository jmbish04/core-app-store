import { Badge } from '@/components/ui/badge';
import type { HealthStatus } from '@shared/types';

interface HealthBadgeProps {
  status: HealthStatus;
  score?: number;
}

export function HealthBadge({ status, score }: HealthBadgeProps) {
  const variants: Record<HealthStatus, { variant: any; label: string }> = {
    working: { variant: 'success', label: 'Working' },
    broken: { variant: 'destructive', label: 'Broken' },
    unknown: { variant: 'secondary', label: 'Unknown' },
  };

  const { variant, label } = variants[status];

  return (
    <Badge variant={variant} title={score ? `Health score: ${score}/100` : undefined}>
      {label}
    </Badge>
  );
}
