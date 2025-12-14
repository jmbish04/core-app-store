import React, { useEffect, useState } from 'react';
import { HeroBlock } from '../components/Hero';
import { AppCard } from '../components/AppCard';
import { useQuery } from '@tanstack/react-query';

export default function LandingPage() {
  const { data: starredApps, isLoading, refetch } = useQuery({
    queryKey: ['starredApps'],
    queryFn: async () => {
      const res = await fetch('/api/apps/starred');
      return res.json();
    }
  });

  const { data: recentApps } = useQuery({
      queryKey: ['recentApps'],
      queryFn: async () => {
          // This would ideally be a dedicated endpoint for recent activity
          const res = await fetch('/api/apps?limit=5');
          return res.json();
      }
  });

  const toggleStar = async (id: string, current: boolean) => {
      await fetch(`/api/apps/${id}/star`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ starred: !current })
      });
      refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroBlock />

      <main className="container mx-auto px-4 pb-16">
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            Starred Apps
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {starredApps?.map((app: any) => (
                <AppCard key={app.id} app={app} onToggleStar={toggleStar} />
              ))}
              {starredApps?.length === 0 && (
                  <p className="text-muted-foreground">No starred apps yet.</p>
              )}
            </div>
          )}
        </section>

        <section>
             <h2 className="text-2xl font-bold mb-6">Recently Active</h2>
             {/* List view for recent apps could go here */}
        </section>
      </main>
    </div>
  );
}
