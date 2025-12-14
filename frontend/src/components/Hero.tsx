import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, RefreshCw, Star, Zap } from 'lucide-react';

export function HeroBlock() {
  return (
    <div className="w-full bg-background border-b mb-8">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1 text-yellow-500" />
          Cloudflare Core App Store
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
          Manage your Workers & Pages
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          A centralized inventory with health insights, AI-powered categorization, and rapid app creation.
        </p>
        <div className="flex gap-4">
          <Button size="lg" className="gap-2">
            Create new app <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh inventory
          </Button>
        </div>
      </div>
    </div>
  );
}
