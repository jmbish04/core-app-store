import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/HealthBadge';
import { Loader2, Star, ExternalLink, GitBranch, Activity, AlertTriangle, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AppDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: app, isLoading } = useQuery({
    queryKey: ['app', id],
    queryFn: () => api.getApp(id!),
    enabled: !!id,
  });

  const { data: deployments } = useQuery({
    queryKey: ['deployments', id],
    queryFn: () => api.getDeployments(id!),
    enabled: !!id,
  });

  const { data: insights } = useQuery({
    queryKey: ['insights', id],
    queryFn: () => api.getLogInsights(id!),
    enabled: !!id,
  });

  const starMutation = useMutation({
    mutationFn: ({ starred }: { starred: boolean }) => api.toggleStar(id!, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app', id] });
      queryClient.invalidateQueries({ queryKey: ['starred-apps'] });
    },
  });

  // Record visit
  useEffect(() => {
    if (id) {
      api.recordVisit(id, `/apps/${id}`).catch(console.error);
    }
  }, [id]);

  if (isLoading || !app) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">{app.display_name || app.name}</h1>
            <Badge variant="outline">{app.type}</Badge>
            {app.category && <Badge variant="secondary">{app.category}</Badge>}
          </div>
          {app.ai_summary && (
            <p className="text-muted-foreground max-w-2xl">{app.ai_summary}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => starMutation.mutate({ starred: !app.starred })}
          >
            <Star className={`h-4 w-4 mr-2 ${app.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            {app.starred ? 'Starred' : 'Star'}
          </Button>
          {app.deployed_url && (
            <a href={app.deployed_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthBadge status={app.health_status} score={app.health_score} />
            <div className="mt-2 text-xs text-muted-foreground">
              Score: {app.health_score}/100
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Deployed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDate(app.last_deployed_at)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDate(app.last_log_at || app.last_run_at)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Visited</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDate(app.last_seen_at)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Reasons */}
      {app.health_reasons && app.health_reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Health Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {app.health_reasons.map((reason, i) => (
                <li key={i} className="text-sm">• {reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Log Insights */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Log Insights</span>
            </CardTitle>
            <CardDescription>
              Generated {formatDate(insights.generated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
            </div>

            {insights.top_errors && insights.top_errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Top Errors</h4>
                <div className="space-y-2">
                  {insights.top_errors.map((error: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{error.error}</div>
                          {error.likely_cause && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Likely cause: {error.likely_cause}
                            </div>
                          )}
                        </div>
                        <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {error.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.suggested_actions && insights.suggested_actions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Suggested Actions</h4>
                <ul className="space-y-1">
                  {insights.suggested_actions.map((action: string, i: number) => (
                    <li key={i} className="text-sm">• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deployments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Recent Deployments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deployments && deployments.data.length > 0 ? (
            <div className="space-y-2">
              {deployments.data.slice(0, 5).map((deployment) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="text-sm font-medium">
                      {deployment.metadata?.commit_message || 'Deployment'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(deployment.created_at)}
                      {deployment.metadata?.commit_hash && (
                        <span className="ml-2">({deployment.metadata.commit_hash.slice(0, 7)})</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={deployment.status === 'success' ? 'success' : 'secondary'}>
                    {deployment.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No deployment history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Repos */}
      {app.repo_links && app.repo_links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5" />
              <span>Linked Repositories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {app.repo_links.map((link) => (
                <a
                  key={link.repo_id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{link.full_name}</span>
                  </div>
                  <Badge variant={link.link_type === 'manual' ? 'default' : 'outline'}>
                    {link.link_type}
                  </Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {app.tags && app.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {app.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
