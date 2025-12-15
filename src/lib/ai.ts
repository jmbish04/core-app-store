import { Ai } from '@cloudflare/ai';

export class AiClient {
    private ai: any; // using any because @cloudflare/ai types might be tricky in this setup without full install

    constructor(aiBinding: any) {
        this.ai = new Ai(aiBinding);
    }

    async categorizeApp(app: any) {
        const prompt = `
        You are a Cloudflare App Categorizer.
        Analyze this app and categorize it.

        App Name: ${app.name}
        App Type: ${app.type}

        Output JSON with keys: category (one of: prod, tooling, personal, infra, experiments), tags (array of strings), summary (short string), confidence (0.0-1.0).
        Only output valid JSON.
        `;

        try {
            const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
                    { role: 'user', content: prompt }
                ]
            });

            // Basic parsing attempt - Llama response usually in response.response
            let text = response.response || '';
            // Try to extract JSON if wrapped in code blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];

            return JSON.parse(text);
        } catch (e) {
            console.error("AI Categorization failed", e);
            return { category: 'unknown', tags: [], summary: '', confidence: 0 };
        }
    }

    async planNewApp(description: string) {
        const prompt = `
        You are an expert Cloudflare Architect.
        The user wants to build: "${description}".

        Create a technical plan.
        Output JSON with keys:
        - plan_steps: array of strings
        - recommended_modules: array of strings (e.g. "D1", "KV", "Queues", "Vectorize")
        - file_structure: object representing file tree
        - generated_at: string
        `;

         try {
            const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
                 messages: [
                    { role: 'system', content: 'You are a helpful technical architect that outputs JSON.' },
                    { role: 'user', content: prompt }
                ]
            });
            let text = response.response || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];
            return JSON.parse(text);
        } catch (e) {
            console.error("AI Planning failed", e);
            return { plan_steps: ["Error generating plan"], recommended_modules: [], file_structure: {} };
        }
    }
}
