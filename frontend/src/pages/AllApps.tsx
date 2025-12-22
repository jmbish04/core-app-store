import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/HealthBadge';
import { Search, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AppsQuery } from '@shared/schemas/api';

export function AllAppsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const query: Partial<AppsQuery> = {
    page: parseInt(searchParams.get('page') || '1'),
    per_page: 20,
    search: searchParams.get('search') || undefined,
    type: searchParams.get('type') as any || undefined,
    category: searchParams.get('category') as any || undefined,
    health: searchParams.get('health') as any || undefined,
    starred: searchParams.get('starred') === 'true' ? true : undefined,
    has_repo: searchParams.get('has_repo') === 'true' ? true : undefined,
    sort_by: searchParams.get('sort_by') as any || 'updated_at',
    sort_order: searchParams.get('sort_order') as any || 'desc',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['apps', query],
    queryFn: () => api.getApps(query),
  });

  const updateFilter = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleSearch = () => {
    updateFilter('search', searchInput || undefined);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchInput('');
  };

  const hasActiveFilters = searchParams.toString().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Apps</h1>
        <div className="text-sm text-muted-foreground">
          {data && `${data.pagination.total} apps total`}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps by name or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={query.type === 'worker' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('type', query.type === 'worker' ? undefined : 'worker')}
            >
              Workers
            </Button>
            <Button
              variant={query.type === 'pages' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('type', query.type === 'pages' ? undefined : 'pages')}
            >
              Pages
            </Button>
            <Button
              variant={query.health === 'working' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('health', query.health === 'working' ? undefined : 'working')}
            >
              Working
            </Button>
            <Button
              variant={query.health === 'broken' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('health', query.health === 'broken' ? undefined : 'broken')}
            >
              Broken
            </Button>
            <Button
              variant={query.starred ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('starred', query.starred ? undefined : 'true')}
            >
              Starred
            </Button>
            <Button
              variant={query.has_repo ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('has_repo', query.has_repo ? undefined : 'true')}
            >
              Has Repo
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            <Button
              variant={query.sort_by === 'updated_at' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('sort_by', 'updated_at')}
            >
              Updated
            </Button>
            <Button
              variant={query.sort_by === 'last_deployed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('sort_by', 'last_deployed')}
            >
              Deployed
            </Button>
            <Button
              variant={query.sort_by === 'health_score' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('sort_by', 'health_score')}
            >
              Health
            </Button>
            <Button
              variant={query.sort_by === 'name' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateFilter('sort_by', 'name')}
            >
              Name
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Apps List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.data.map((app) => (
              <Link key={app.id} to={`/apps/${app.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold">{app.display_name || app.name}</h3>
                          <Badge variant="outline">{app.type}</Badge>
                          {app.category && <Badge variant="secondary">{app.category}</Badge>}
                          <HealthBadge status={app.health_status} score={app.health_score} />
                        </div>
                        {app.ai_summary && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {app.ai_summary}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Deployed: {formatDate(app.last_deployed_at)}</span>
                          {app.last_log_at && <span>Active: {formatDate(app.last_log_at)}</span>}
                          {app.deployed_url && (
                            <a
                              href={app.deployed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Live
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.total_pages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.pagination.page === 1}
                  onClick={() => updateFilter('page', String(data.pagination.page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.pagination.page === data.pagination.total_pages}
                  onClick={() => updateFilter('page', String(data.pagination.page + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No apps found matching your filters.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
