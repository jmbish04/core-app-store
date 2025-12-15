import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Star, GitBranch, Activity } from 'lucide-react';

interface AppCardProps {
  app: any;
  onToggleStar: (id: string, current: boolean) => void;
}

export function AppCard({ app, onToggleStar }: AppCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit mb-1">{app.type}</Badge>
          <CardTitle className="text-lg font-bold">{app.display_name || app.name}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleStar(app.id, app.starred)}
          className={app.starred ? "text-yellow-400 hover:text-yellow-500" : "text-muted-foreground"}
        >
          <Star className="w-5 h-5 fill-current" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {app.ai_summary || "No summary available."}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {app.health_status === 'working' && <Badge variant="success">Working</Badge>}
          {app.health_status === 'broken' && <Badge variant="destructive">Broken</Badge>}
          {app.health_status === 'unknown' && <Badge variant="neutral">Unknown</Badge>}

          {JSON.parse(app.tags_json || '[]').slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground border-t pt-4 flex justify-between">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          {app.last_deployed_at ? new Date(app.last_deployed_at).toLocaleDateString() : 'Never'}
        </div>
        {app.repo_links_json && (
            <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                Linked
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
