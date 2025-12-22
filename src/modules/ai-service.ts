/**
 * AI Service Module
 *
 * Handles Worker AI operations for categorization, tagging, log analysis, and planning.
 * All outputs are deterministic and safe with structured JSON responses.
 */

interface AICategorizationInput {
  name: string;
  description?: string;
  deployed_url?: string;
  repo_readme?: string;
}

interface AICategorizationOutput {
  category: 'prod' | 'tooling' | 'personal' | 'infra' | 'experiments' | 'other';
  tags: string[];
  summary: string;
  confidence: number;
}

interface AILogInsightInput {
  app_name: string;
  log_samples: Array<{
    ts: string;
    level: string;
    message: string;
  }>;
}

interface AILogInsightOutput {
  summary: string;
  top_errors: Array<{
    error: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    likely_cause?: string;
  }>;
  suggested_actions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AIPlanInput {
  name: string;
  type: 'worker' | 'pages';
  description: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface AIPlanOutput {
  plan: {
    name: string;
    type: 'worker' | 'pages';
    description: string;
    modules: Array<{
      name: string;
      purpose: string;
      reuse_from?: string;
    }>;
    endpoints?: Array<{
      path: string;
      method: string;
      purpose: string;
    }>;
    bindings: Array<{
      type: string;
      name: string;
      purpose: string;
    }>;
    d1_schema?: string;
    crons?: string[];
    workflows?: string[];
  };
  questions?: string[];
  confidence: number;
}

export class AIService {
  constructor(private ai: Ai) {}

  /**
   * Categorize and tag an app using AI
   */
  async categorizeApp(input: AICategorizationInput): Promise<AICategorizationOutput> {
    const prompt = this.buildCategorizationPrompt(input);

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        prompt,
        max_tokens: 512,
      }) as { response: string };

      const parsed = this.parseJSONResponse(response.response);

      return {
        category: this.validateCategory(parsed.category),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : '',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error) {
      console.error('AI categorization failed:', error);
      return this.fallbackCategorization(input);
    }
  }

  /**
   * Analyze logs and generate insights using AI
   */
  async analyzeLogInsights(input: AILogInsightInput): Promise<AILogInsightOutput> {
    const prompt = this.buildLogInsightPrompt(input);

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        prompt,
        max_tokens: 1024,
      }) as { response: string };

      const parsed = this.parseJSONResponse(response.response);

      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : 'No summary available',
        top_errors: Array.isArray(parsed.top_errors) ? parsed.top_errors.slice(0, 5) : [],
        suggested_actions: Array.isArray(parsed.suggested_actions) ? parsed.suggested_actions.slice(0, 5) : [],
        severity: this.validateSeverity(parsed.severity),
      };
    } catch (error) {
      console.error('AI log insight failed:', error);
      return this.fallbackLogInsight(input);
    }
  }

  /**
   * Generate app creation plan using AI
   */
  async generatePlan(input: AIPlanInput): Promise<AIPlanOutput> {
    const prompt = this.buildPlanPrompt(input);

    try {
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        prompt,
        max_tokens: 2048,
      }) as { response: string };

      const parsed = this.parseJSONResponse(response.response);

      return {
        plan: {
          name: input.name,
          type: input.type,
          description: input.description,
          modules: Array.isArray(parsed.modules) ? parsed.modules : [],
          endpoints: Array.isArray(parsed.endpoints) ? parsed.endpoints : [],
          bindings: Array.isArray(parsed.bindings) ? parsed.bindings : [],
          d1_schema: typeof parsed.d1_schema === 'string' ? parsed.d1_schema : undefined,
          crons: Array.isArray(parsed.crons) ? parsed.crons : undefined,
          workflows: Array.isArray(parsed.workflows) ? parsed.workflows : undefined,
        },
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 6) : undefined,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      };
    } catch (error) {
      console.error('AI plan generation failed:', error);
      return this.fallbackPlan(input);
    }
  }

  /**
   * Extract and infer GitHub repo URLs from text
   */
  async inferRepoFromText(text: string, appName: string): Promise<Array<{
    url: string;
    confidence: number;
    evidence: string;
  }>> {
    // Simple regex-based extraction
    const urls: Array<{ url: string; confidence: number; evidence: string }> = [];
    const pattern = /https?:\/\/github\.com\/[^\s<>"']+/g;
    const matches = text.match(pattern) || [];

    for (const url of [...new Set(matches)]) {
      const cleanUrl = url.replace(/\.git$/, '');
      const confidence = this.calculateRepoConfidence(cleanUrl, appName, text);
      const evidence = this.extractEvidence(cleanUrl, text);

      urls.push({ url: cleanUrl, confidence, evidence });
    }

    return urls.sort((a, b) => b.confidence - a.confidence);
  }

  // Private helper methods

  private buildCategorizationPrompt(input: AICategorizationInput): string {
    return `You are a system that categorizes Cloudflare applications. Analyze the following app and output ONLY valid JSON.

App Information:
- Name: ${input.name}
- Description: ${input.description || 'N/A'}
- URL: ${input.deployed_url || 'N/A'}
- README: ${input.repo_readme ? input.repo_readme.slice(0, 500) : 'N/A'}

Categories:
- prod: Production applications serving end users
- tooling: Development tools, CI/CD, utilities
- personal: Personal projects, experiments
- infra: Infrastructure, monitoring, logging
- experiments: Testing, prototypes, demos
- other: Uncategorized

Output format (JSON only, no markdown):
{
  "category": "one of: prod, tooling, personal, infra, experiments, other",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "A brief 1-2 sentence summary of what this app does",
  "confidence": 0.85
}`;
  }

  private buildLogInsightPrompt(input: AILogInsightInput): string {
    const logSamples = input.log_samples.slice(0, 20).map(log =>
      `[${log.ts}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');

    return `You are a system that analyzes application logs. Analyze the following logs and output ONLY valid JSON.

App: ${input.app_name}

Logs:
${logSamples}

Output format (JSON only, no markdown):
{
  "summary": "Brief summary of what's happening in the logs",
  "top_errors": [
    {
      "error": "Error message or pattern",
      "count": 5,
      "severity": "high",
      "likely_cause": "Possible cause"
    }
  ],
  "suggested_actions": ["Action 1", "Action 2"],
  "severity": "high"
}`;
  }

  private buildPlanPrompt(input: AIPlanInput): string {
    const conversationContext = input.conversation_history
      ? input.conversation_history.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    return `You are an expert Cloudflare developer assistant. Create a detailed implementation plan for a new app.

App Requirements:
- Name: ${input.name}
- Type: ${input.type}
- Description: ${input.description}

${conversationContext ? `Conversation:\n${conversationContext}\n` : ''}

Output format (JSON only, no markdown):
{
  "modules": [
    {"name": "module-name", "purpose": "what it does", "reuse_from": "optional-existing-app"}
  ],
  "endpoints": [
    {"path": "/api/endpoint", "method": "GET", "purpose": "what it does"}
  ],
  "bindings": [
    {"type": "D1", "name": "DB", "purpose": "what it stores"}
  ],
  "d1_schema": "SQL schema if needed",
  "crons": ["schedule patterns if needed"],
  "workflows": ["workflow descriptions if needed"],
  "questions": ["clarifying question 1", "clarifying question 2"],
  "confidence": 0.8
}`;
  }

  private parseJSONResponse(response: string): any {
    // Try to extract JSON from markdown code blocks or plain text
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
    return JSON.parse(response);
  }

  private validateCategory(category: any): AICategorizationOutput['category'] {
    const validCategories = ['prod', 'tooling', 'personal', 'infra', 'experiments', 'other'];
    return validCategories.includes(category) ? category : 'other';
  }

  private validateSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    return validSeverities.includes(severity) ? severity : 'medium';
  }

  private fallbackCategorization(input: AICategorizationInput): AICategorizationOutput {
    // Simple rule-based fallback
    let category: AICategorizationOutput['category'] = 'other';
    const tags: string[] = [];

    if (input.name.includes('api') || input.name.includes('gateway')) {
      category = 'prod';
      tags.push('api');
    } else if (input.name.includes('tool') || input.name.includes('dev')) {
      category = 'tooling';
      tags.push('development');
    } else if (input.name.includes('test') || input.name.includes('demo')) {
      category = 'experiments';
      tags.push('testing');
    }

    return {
      category,
      tags,
      summary: `${input.name} - Cloudflare application`,
      confidence: 0.5,
    };
  }

  private fallbackLogInsight(input: AILogInsightInput): AILogInsightOutput {
    const errorLogs = input.log_samples.filter(log =>
      log.level === 'error' || log.level === 'ERROR'
    );

    return {
      summary: `Analyzed ${input.log_samples.length} log entries, found ${errorLogs.length} errors`,
      top_errors: errorLogs.slice(0, 3).map(log => ({
        error: log.message,
        count: 1,
        severity: 'medium' as const,
      })),
      suggested_actions: errorLogs.length > 0
        ? ['Review error logs', 'Check application health']
        : ['No immediate action required'],
      severity: errorLogs.length > 5 ? 'high' : errorLogs.length > 0 ? 'medium' : 'low',
    };
  }

  private fallbackPlan(input: AIPlanInput): AIPlanOutput {
    return {
      plan: {
        name: input.name,
        type: input.type,
        description: input.description,
        modules: [
          { name: 'main', purpose: 'Main application logic' },
        ],
        endpoints: input.type === 'worker' ? [
          { path: '/api/health', method: 'GET', purpose: 'Health check' },
        ] : undefined,
        bindings: [],
      },
      questions: [
        'What is the primary purpose of this application?',
        'Does it need a database?',
        'Will it handle sensitive data?',
      ],
      confidence: 0.5,
    };
  }

  private calculateRepoConfidence(url: string, appName: string, text: string): number {
    let confidence = 0.5;

    // Boost confidence if app name appears in URL
    if (url.toLowerCase().includes(appName.toLowerCase())) {
      confidence += 0.3;
    }

    // Boost confidence if it appears multiple times
    const occurrences = (text.match(new RegExp(url, 'g')) || []).length;
    confidence += Math.min(occurrences * 0.1, 0.2);

    return Math.min(confidence, 1.0);
  }

  private extractEvidence(url: string, text: string, maxLength: number = 200): string {
    const index = text.indexOf(url);
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + url.length + 50);
    const evidence = text.slice(start, end);

    return evidence.length > maxLength ? evidence.slice(0, maxLength) + '...' : evidence;
  }
}
