import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { CloudflareBindings, CloudflareClient } from '../lib/cloudflare';
import { AiClient } from '../lib/ai';

type RefreshParams = {
    force?: boolean;
};

export class RefreshInventoryWorkflow extends WorkflowEntrypoint<CloudflareBindings, RefreshParams> {
    async run(event: WorkflowEvent<RefreshParams>, step: WorkflowStep) {
        const { timestamp, payload } = event;
        const env = this.env;
        const cf = new CloudflareClient(env.CF_ACCOUNT_ID, env.CF_API_TOKEN);
        const ai = new AiClient(env.AI);

        const workers = await step.do('fetch-workers', async () => {
             return await cf.listWorkers();
        });

        const pages = await step.do('fetch-pages', async () => {
             return await cf.listPagesProjects();
        });

        // Upsert into D1
        await step.do('update-d1', async () => {
            // This would ideally be a batch operation
            for (const worker of workers) {
                // Check if exists
                const existing = await env.DB.prepare('SELECT * FROM apps WHERE cf_id = ? AND type = ?').bind(worker.id, 'worker').first();
                if (!existing) {
                    await env.DB.prepare(`
                        INSERT INTO apps (id, type, cf_id, name, display_name, health_status)
                        VALUES (?, 'worker', ?, ?, ?, 'unknown')
                    `).bind(crypto.randomUUID(), worker.id, worker.id, worker.id).run();

                    // Trigger AI categorization for new app (could be separate step)
                }
                // Update last_deployed_at etc.
            }

             for (const page of pages) {
                const existing = await env.DB.prepare('SELECT * FROM apps WHERE cf_id = ? AND type = ?').bind(page.name, 'pages').first();
                 if (!existing) {
                    await env.DB.prepare(`
                        INSERT INTO apps (id, type, cf_id, name, display_name, health_status)
                        VALUES (?, 'pages', ?, ?, ?, 'unknown')
                    `).bind(crypto.randomUUID(), page.name, page.name, page.name).run();
                 }
            }
        });

        return { status: 'success', workersCount: workers.length, pagesCount: pages.length };
    }
}
