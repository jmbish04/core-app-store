import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/HealthBadge';
import { Loader2, Star, TrendingUp, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AppListItem } from '@shared/schemas/app';

export function LandingPage() {
  const { data, isLoading, isRefetching } = useQuery({
    queryKey: ['starred-apps'],
    queryFn: () => api.getStarredApps(),
  });

  const { data: meta } = useQuery({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12 border-b">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Core App Store</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your Cloudflare Workers and Pages apps with health monitoring, AI insights, and powerful automation.
        </p>
        <div className="flex items-center justify-center space-x-4 pt-4">
          <Link to="/new">
            <Button size="lg">Create New App</Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => api.refresh()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh Inventory
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {meta && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{meta.total_apps}</div>
              <p className="text-xs text-muted-foreground">
                {meta.total_workers} Workers, {meta.total_pages} Pages
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Working</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {meta.health_distribution.working || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Broken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {meta.health_distribution.broken || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unknown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {meta.health_distribution.unknown || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Broken Apps Alert */}
      {data && data.broken_now.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Apps Need Attention</CardTitle>
            </div>
            <CardDescription>
              {data.broken_now.length} app{data.broken_now.length > 1 ? 's are' : ' is'} currently broken
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.broken_now.map((app) => (
                <Link key={app.id} to={`/apps/${app.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{app.type}</Badge>
                      <span className="font-medium">{app.display_name || app.name}</span>
                    </div>
                    <HealthBadge status={app.health_status} score={app.health_score} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Starred Apps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <h2 className="text-2xl font-bold">Starred Apps</h2>
          </div>
          <Link to="/apps?starred=true">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
        {data && data.starred.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.starred.slice(0, 6).map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No starred apps yet. Star your favorite apps to see them here!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recently Active */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Recently Active</h2>
        </div>
        {data && data.recently_active.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recently_active.slice(0, 6).map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No recent activity detected</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function AppCard({ app }: { app: AppListItem }) {
  return (
    <Link to={`/apps/${app.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{app.display_name || app.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {app.ai_summary || 'No description available'}
              </CardDescription>
            </div>
            <HealthBadge status={app.health_status} score={app.health_score} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{app.type}</Badge>
            {app.category && (
              <Badge variant="secondary">{app.category}</Badge>
            )}
          </div>
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Last deployed: {formatDate(app.last_deployed_at)}</div>
            {app.last_log_at && <div>Last activity: {formatDate(app.last_log_at)}</div>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
