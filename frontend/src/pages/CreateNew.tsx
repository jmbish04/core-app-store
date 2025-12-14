import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, ArrowRight, Sparkles, Package, FileCode } from 'lucide-react';

type Step = 'basic' | 'planning' | 'repo' | 'bootstrap' | 'complete';

export function CreateNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('basic');
  const [formData, setFormData] = useState({
    name: '',
    type: 'worker' as 'worker' | 'pages',
    description: '',
    org: '',
    private: true,
  });
  const [plan, setPlan] = useState<any>(null);
  const [repo, setRepo] = useState<any>(null);
  const [appId, setAppId] = useState<string>('');

  const planMutation = useMutation({
    mutationFn: () => api.generatePlan({
      name: formData.name,
      type: formData.type,
      description: formData.description,
    }),
    onSuccess: (data) => {
      setPlan(data);
      setStep('planning');
    },
  });

  const repoMutation = useMutation({
    mutationFn: () => api.createRepo({
      name: formData.name,
      org: formData.org || undefined,
      private: formData.private,
      description: formData.description,
    }),
    onSuccess: (data) => {
      setRepo(data);
      setStep('repo');
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: () => api.bootstrapRepo(repo.full_name, plan.plan),
    onSuccess: () => {
      setStep('bootstrap');
      // Create Cloudflare app
      createAppMutation.mutate();
    },
  });

  const createAppMutation = useMutation({
    mutationFn: () => api.createCloudflareApp({
      name: formData.name,
      type: formData.type,
      repo_url: repo.url,
    }),
    onSuccess: (data) => {
      setAppId(data.app_id);
      setStep('complete');
    },
  });

  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    planMutation.mutate();
  };

  const handlePlanApprove = () => {
    repoMutation.mutate();
  };

  const handleRepoCreated = () => {
    bootstrapMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Create New App</h1>
        <p className="text-muted-foreground">
          AI-assisted app creation with repository scaffolding and Cloudflare deployment
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {(['basic', 'planning', 'repo', 'bootstrap', 'complete'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center space-x-2 ${
                  step === s ? 'text-primary' :
                  (['basic', 'planning', 'repo', 'bootstrap', 'complete'].indexOf(step) > i) ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  {(['basic', 'planning', 'repo', 'bootstrap', 'complete'].indexOf(step) > i) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <div className={`h-5 w-5 rounded-full border-2 ${
                      step === s ? 'border-primary bg-primary' : 'border-current'
                    }`} />
                  )}
                  <span className="text-sm font-medium capitalize">{s}</span>
                </div>
                {i < 4 && (
                  <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Basic Info */}
      {step === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Tell us about your new app</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBasicSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">App Name *</label>
                <Input
                  placeholder="my-awesome-app"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Type *</label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={formData.type === 'worker' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'worker' })}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Worker
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'pages' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'pages' })}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Pages
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description *</label>
                <Input
                  placeholder="Describe what your app does..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">GitHub Organization (optional)</label>
                <Input
                  placeholder="Leave empty for personal account"
                  value={formData.org}
                  onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={planMutation.isPending} className="w-full">
                {planMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating AI Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Plan
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: AI Planning */}
      {step === 'planning' && plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>AI-Generated Plan</span>
            </CardTitle>
            <CardDescription>Review the proposed architecture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Modules</h3>
              <div className="space-y-2">
                {plan.plan.modules.map((module: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/50">
                    <div className="font-medium">{module.name}</div>
                    <div className="text-sm text-muted-foreground">{module.purpose}</div>
                    {module.reuse_from && (
                      <Badge variant="outline" className="mt-2">
                        Reuse from: {module.reuse_from}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {plan.plan.bindings.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Bindings</h3>
                <div className="flex flex-wrap gap-2">
                  {plan.plan.bindings.map((binding: any, i: number) => (
                    <Badge key={i} variant="secondary">
                      {binding.type}: {binding.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {plan.plan.endpoints && plan.plan.endpoints.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">API Endpoints</h3>
                <div className="space-y-1">
                  {plan.plan.endpoints.map((endpoint: any, i: number) => (
                    <div key={i} className="text-sm">
                      <Badge variant="outline" className="mr-2">{endpoint.method}</Badge>
                      {endpoint.path} - {endpoint.purpose}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2 pt-4">
              <Button onClick={handlePlanApprove} disabled={repoMutation.isPending} className="flex-1">
                {repoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Repository...
                  </>
                ) : (
                  'Approve & Create Repository'
                )}
              </Button>
              <Button variant="outline" onClick={() => setStep('basic')}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Repository Created */}
      {step === 'repo' && repo && (
        <Card>
          <CardHeader>
            <CardTitle>Repository Created!</CardTitle>
            <CardDescription>Your GitHub repository is ready</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{repo.full_name}</span>
              </div>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View on GitHub →
              </a>
            </div>

            <Button onClick={handleRepoCreated} disabled={bootstrapMutation.isPending} className="w-full">
              {bootstrapMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bootstrapping Repository...
                </>
              ) : (
                'Bootstrap Repository with Scaffolding'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Bootstrapping */}
      {step === 'bootstrap' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Creating Your App...</h3>
            <p className="text-sm text-muted-foreground">
              Setting up Cloudflare configuration and initial files
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <span>App Created Successfully!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
              <p className="text-sm mb-4">Your app has been created and is ready for development.</p>
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Repository:</strong> <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{repo.full_name}</a>
                </div>
                <div className="text-sm">
                  <strong>Type:</strong> {formData.type}
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => navigate(`/apps/${appId}`)} className="flex-1">
                View App Details
              </Button>
              <Button variant="outline" onClick={() => navigate('/apps')}>
                Back to All Apps
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
