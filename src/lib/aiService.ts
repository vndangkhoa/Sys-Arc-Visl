export interface NodeMetadata {
    techStack: string[];
    role: string;
    description: string;
}

export interface AIResponse {
    success: boolean;
    mermaidCode?: string;
    metadata?: Record<string, NodeMetadata>; // Keyed by node label
    analysis?: any; // For visual analysis results
    error?: string;
}

import { webLlmService } from './webLlmService';
import { visionService } from './visionService';

const SYSTEM_PROMPT = `You are an expert System Architect AI. Your task is to transform technical descriptions into precise Mermaid.js diagrams and high-fidelity metadata.

Return ONLY a strictly valid JSON object. No Markdown headers, no preamble.

EXPECTED JSON FORMAT:
{
  "mermaidCode": "flowchart TD\\n  A[Client] --> B[API Server]\\n  ...",
  "metadata": {
    "NodeLabel": { 
      "techStack": ["Technologies used"], 
      "role": "Specific role (e.g., Load Balancer, Cache, Database)", 
      "description": "Concise technical responsibility" 
    }
  }
}

ARCHITECTURAL RULES:
1. Use 'flowchart TD' or 'flowchart LR'.
2. Use descriptive but concise ID/Labels (e.g., 'API', 'DB_PROD').
3. Labels must match the keys in the 'metadata' object EXACTLY.
4. If input is already Mermaid code, wrap it in the JSON 'mermaidCode' field and infer metadata.
5. Identify semantic roles: use keywords like 'Client', 'Server', 'Worker', 'Database', 'Queue' in labels.
6. Escape double quotes inside the mermaid string correctly.

DIAGRAM QUALITY RULES:
7. NEVER use HTML tags (like <br/>, <b>, etc.) in node labels. Use short, clean text only.
8. Use DIAMOND shapes {Decision} for review, approval, or decision steps (e.g., A{Approve?}).
9. Use CYLINDER shapes [(Database)] for data stores.
10. Use ROUNDED shapes (Process) for human/manual tasks.
11. For complex workflows, add step numbers as edge labels: A -->|1| B -->|2| C.
12. Include feedback loops where logical (e.g., connect "Collect Feedback" back to analysis nodes).
13. Use subgraphs/swimlanes to group related components by team, role, or domain.
14. Ensure consistent node shapes within each swimlane/subgraph.`;


/**
 * Exponential backoff retry wrapper for fetch.
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = 2,
    backoff: number = 1000
): Promise<Response> {
    try {
        const response = await fetch(url, options);
        // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
        if (!response.ok && (response.status === 429 || response.status >= 500)) {
            throw new Error(`Retryable error: ${response.status} ${response.statusText}`);
        }
        return response;
    } catch (error) {
        if (retries > 0) {
            console.warn(`Fetch failed, retrying in ${backoff}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
        throw error;
    }
}

async function callOnlineAI(
    provider: 'openai' | 'gemini' | 'ollama-cloud',
    apiKey: string,
    ollamaUrl: string,
    messages: any[],
    customSystemPrompt?: string
): Promise<AIResponse> {
    const activePrompt = customSystemPrompt || SYSTEM_PROMPT;
    try {
        let url = '';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: any = {};

        if (provider === 'openai') {
            url = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: 'gpt-4o',
                messages: [{ role: 'system', content: activePrompt }, ...messages],
                response_format: { type: 'json_object' }
            };
        } else if (provider === 'gemini') {
            // Simple Gemini API call (v1beta)
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            body = {
                contents: [{
                    parts: [{
                        text: `${activePrompt}\n\nTask: ${messages[messages.length - 1].content}`
                    }]
                }],
                generationConfig: { responseMimeType: 'application/json' }
            };
        } else if (provider === 'ollama-cloud') {
            url = `${ollamaUrl}/api/chat`;
            body = {
                model: 'llava', // Default for vision
                messages: [{ role: 'system', content: activePrompt }, ...messages],
                format: 'json',
                stream: false
            };
        }

        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            let errorMsg = `${provider} error: ${response.status} ${response.statusText}`;
            if (response.status === 401) errorMsg = 'Invalid API Key. Please check your settings.';
            if (response.status === 429) errorMsg = 'Rate limit exceeded. Please try again later.';
            throw new Error(errorMsg);
        }

        const data = await response.json();
        let content = '{}';

        if (provider === 'openai') {
            content = data.choices[0].message.content;
        } else if (provider === 'gemini') {
            content = data.candidates[0].content.parts[0].text;
        } else {
            content = data.message?.content || '{}';
        }

        const parsed = JSON.parse(content);
        return {
            success: true,
            mermaidCode: parsed.mermaidCode,
            metadata: parsed.metadata
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Online model failure'
        };
    }
}

async function callLocalAI(
    ollamaUrl: string,
    model: string,
    messages: any[],
    customSystemPrompt?: string
): Promise<AIResponse> {
    const activePrompt = customSystemPrompt || SYSTEM_PROMPT;
    try {
        const response = await fetchWithRetry(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: activePrompt },
                    ...messages
                ],
                format: 'json',
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: 2000,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Local model error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const content = data.message?.content || '{}';

        try {
            // Strip markdown code blocks if present (```json ... ```)
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const parsed = JSON.parse(cleanContent);
            return {
                success: true,
                mermaidCode: parsed.mermaidCode,
                metadata: parsed.metadata,
            };
        } catch (e) {
            console.error('Failed to parse model response:', content);
            return {
                success: false,
                error: 'Model returned invalid JSON format',
            };
        }
    } catch (error) {
        let msg = error instanceof Error ? error.message : 'Unknown local AI error';
        if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
            msg = 'Could not connect to Ollama. Is it running locally on the specified URL?';
        }
        return {
            success: false,
            error: msg,
        };
    }
}


async function callBrowserAI(
    messages: any[],
    customSystemPrompt?: string
): Promise<AIResponse> {
    const activePrompt = customSystemPrompt || SYSTEM_PROMPT;
    try {
        if (!webLlmService.getStatus().isReady) {
            throw new Error('Browser model is not loaded. Please initialize it in Settings.');
        }

        // --- Vision Processing Pipeline ---
        let processedMessages = [];

        for (const msg of messages) {
            let content = msg.content;

            if (msg.images && msg.images.length > 0) {
                if (!visionService.getStatus().isReady) {
                    throw new Error('Vision model is not loaded. Please initialize it in Settings (Browser Tab).');
                }

                // Analyze the first image
                // Assuming msg.images[0] is base64 string
                const imageDescription = await visionService.analyzeImage(msg.images[0]);

                // Augment the prompt with the description
                content = `${content}\n\n[VISUAL CONTEXT FROM IMAGE]:\n${imageDescription}\n\n(Use this visual description to generate the Mermaid code.)`;
            }

            processedMessages.push({
                role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') ? msg.role : 'user',
                content: content
            });
        }

        const fullMessages = [
            { role: 'system' as const, content: activePrompt },
            ...processedMessages
        ];

        const generator = await webLlmService.chat(fullMessages);
        let fullContent = "";

        for await (const chunk of generator) {
            fullContent += chunk;
        }

        // Parse JSON
        let cleanContent = fullContent.trim();
        if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        const parsed = JSON.parse(cleanContent);
        return {
            success: true,
            mermaidCode: parsed.mermaidCode,
            metadata: parsed.metadata,
            analysis: parsed.analysis // Forward analysis field if present
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Browser model logic failed'
        };
    }
}

const SYSTEM_PROMPT_SIMPLE = `You are a System Architect. Create a SIMPLE, high-level Mermaid diagram.
- Focus on the main data flow (max 5-7 nodes).
- Use simple labels (e.g., "User", "API", "DB"). NEVER use HTML tags like <br/>.
- Use diamond {Decision?} for approval/review steps.
- Minimal metadata (role only).`;

const SYSTEM_PROMPT_COMPLEX = `You are an Expert Solution Architect. Create a DETAILED, comprehensive Mermaid diagram.
- Include all subsystems, queues, workers, and external services.
- Use swimlanes (subgraphs) to group components by role/domain.
- NEVER use HTML tags like <br/> in labels. Keep labels clean and concise.
- Use diamond {Decision?} for approval/review steps.
- Use cylinder [(DB)] for databases, rounded (Task) for human tasks.
- Add step numbers as edge labels for complex flows: A -->|1| B -->|2| C.
- Include feedback loops connecting outputs back to inputs where logical.
- Detailed metadata (techStack, role, description).`;

function getSystemPrompt(complexity: 'simple' | 'complex') {
    return complexity === 'simple' ? SYSTEM_PROMPT_SIMPLE : SYSTEM_PROMPT_COMPLEX;
}

export async function analyzeImage(
    imageBase64: string,
    ollamaUrl: string,
    model: string,
    aiMode: 'online' | 'offline' | 'browser' = 'offline',
    onlineProvider?: 'openai' | 'gemini' | 'ollama-cloud' | 'browser',
    apiKey?: string,
    complexity: 'simple' | 'complex' = 'simple'
): Promise<AIResponse> {
    const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const prompt = getSystemPrompt(complexity) + "\n" + SYSTEM_PROMPT.split('\n').slice(16).join('\n'); // Append JSON rules

    const messages = [{
        role: 'user',
        content: 'Analyze this system design diagram. Return MermaidJS and technical metadata.',
        images: [rawBase64]
    }];

    if (aiMode === 'online' && onlineProvider) {
        return callOnlineAI(onlineProvider as any, apiKey || '', ollamaUrl, messages, prompt);
    }
    if (aiMode === 'browser') {
        return callBrowserAI(messages, prompt);
    }
    return callLocalAI(ollamaUrl, model, messages, prompt);
}

export async function interpretText(
    text: string,
    ollamaUrl: string,
    model: string,
    aiMode: 'online' | 'offline' | 'browser' = 'offline',
    onlineProvider?: 'openai' | 'gemini' | 'ollama-cloud' | 'browser',
    apiKey?: string,
    complexity: 'simple' | 'complex' = 'simple'
): Promise<AIResponse> {
    const prompt = getSystemPrompt(complexity) + "\n" + SYSTEM_PROMPT.split('\n').slice(16).join('\n'); // Append JSON rules

    const messages = [{
        role: 'user',
        content: `Create a system design based on this description: ${text}`,
    }];

    if (aiMode === 'online' && onlineProvider) {
        return callOnlineAI(onlineProvider as any, apiKey || '', ollamaUrl, messages, prompt);
    }
    if (aiMode === 'browser') {
        return callBrowserAI(messages, prompt);
    }
    return callLocalAI(ollamaUrl, model, messages, prompt);
}

export async function analyzeSVG(
    svgContent: string,
    ollamaUrl: string,
    model: string,
    aiMode: 'online' | 'offline' | 'browser' = 'offline',
    onlineProvider?: 'openai' | 'gemini' | 'ollama-cloud' | 'browser',
    apiKey?: string
): Promise<AIResponse> {
    const messages = [{
        role: 'user',
        content: `Analyze this SVG architecture: ${svgContent}`,
    }];

    if (aiMode === 'online' && onlineProvider) {
        return callOnlineAI(onlineProvider as any, apiKey || '', ollamaUrl, messages);
    }
    if (aiMode === 'browser') {
        return callBrowserAI(messages);
    }
    return callLocalAI(ollamaUrl, model, messages);
}

const SUGGEST_PROMPT = `You are a Mermaid.js syntax and logic expert. 
Your task is to analyze the provided Mermaid flowchart code and either:
1. Fix any syntax errors that prevent it from rendering.
2. Improve the logical flow or visual clarity if the syntax is already correct.

Return ONLY a strictly valid JSON object. No Markdown headers, no preamble.

EXPECTED JSON FORMAT:
{
  "mermaidCode": "flowchart TD\\n  A[Fixed/Improved] --> B[Nodes]",
  "explanation": "Briefly explain what was fixed or improved."
}

RULES:
- Maintain the original intent of the diagram.
- Use best practices for Mermaid layout and labeling.
- If the code is already perfect, return it as is but provide a positive explanation.`;

const VISUAL_ANALYSIS_PROMPT = `You are a Visualization and UX Expert specialized in node-graph diagrams.
Your task is to analyze the provided graph structure and metrics to suggest specific improvements for layout, grouping, and visual clarity.

Return ONLY a strictly valid JSON object. Do not include markdown formatting like \`\`\`json.

EXPECTED JSON FORMAT:
{
  "analysis": {
    "suggestions": [
      {
        "id": "unique-id",
        "title": "Short title",
        "description": "Detailed explanation",
        "type": "spacing" | "grouping" | "routing" | "hierarchy" | "style",
        "impact": "high" | "medium" | "low",
        "fix_strategy": "algorithmic_spacing" | "algorithmic_routing" | "group_nodes" | "unknown"
      }
    ],
    "summary": {
       "critique": "Overall analysis",
       "score": 0-100
    }
  }
}

EXAMPLE RESPONSE:
{
  "analysis": {
    "suggestions": [
      {
        "id": "sug-1",
        "title": "Group Database Nodes",
        "description": "Several database nodes are scattered. Group them for better logical separation.",
        "type": "grouping",
        "impact": "high",
        "fix_strategy": "group_nodes"
      }
    ],
    "summary": {
      "critique": "The flow is generally good but lacks logical grouping for backend services.",
      "score": 75
    }
  }
}

RULES:
- Focus on readability, flow, and logical grouping.
- Identify if nodes are too cluttered or if the flow is confusing.
- Suggest grouping for nodes that appear related based on their labels.`;

export async function suggestFix(
    code: string,
    ollamaUrl: string,
    modelName: string,
    aiMode: 'online' | 'offline' | 'browser',
    onlineProvider: 'openai' | 'gemini' | 'ollama-cloud' | 'browser',
    apiKey: string
): Promise<{ success: boolean; mermaidCode?: string; explanation?: string; error?: string }> {
    const messages = [{
        role: 'user',
        content: `CURRENT MERMAID CODE:\n${code}\n\nPlease analyze and provide a fix or improvement.`,
    }];

    try {
        let response: AIResponse;
        if (aiMode === 'online' && onlineProvider) {
            response = await callOnlineAI(onlineProvider as any, apiKey || '', ollamaUrl, messages, SUGGEST_PROMPT);
        } else if (aiMode === 'browser') {
            response = await callBrowserAI(messages, SUGGEST_PROMPT);
        } else {
            response = await callLocalAI(ollamaUrl, modelName, messages, SUGGEST_PROMPT);
        }

        if (!response.success) throw new Error(response.error);

        return {
            success: true,
            mermaidCode: response.mermaidCode,
            explanation: (response as any).explanation || 'Code improved.'
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Fix suggestion failed'
        };
    }
}

export async function analyzeVisualLayout(
    nodes: any[],
    edges: any[],
    metrics: any,
    ollamaUrl: string,
    modelName: string,
    aiMode: 'online' | 'offline' | 'browser',
    onlineProvider: 'openai' | 'gemini' | 'ollama-cloud' | 'browser',
    apiKey: string
): Promise<{ success: boolean; analysis?: any; error?: string }> {
    const context = {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodeLabels: nodes.map(n => n.data?.label || n.id),
        metrics: metrics
    };

    const messages = [{
        role: 'user',
        content: `ANALYZE THIS DIAGRAM LAYOUT:\n${JSON.stringify(context, null, 2)}\n\nProvide visual improvement suggestions.`,
    }];

    try {
        let response: AIResponse;
        if (aiMode === 'online' && onlineProvider) {
            response = await callOnlineAI(onlineProvider as any, apiKey || '', ollamaUrl, messages, VISUAL_ANALYSIS_PROMPT);
        } else if (aiMode === 'browser') {
            response = await callBrowserAI(messages, VISUAL_ANALYSIS_PROMPT);
        } else {
            response = await callLocalAI(ollamaUrl, modelName, messages, VISUAL_ANALYSIS_PROMPT);
        }

        if (!response.success) throw new Error(response.error);

        // The AI response parsing logic in callLocalAI/callOnlineAI assigns unknown JSON fields to the object
        // We expect 'analysis' field in the JSON
        const analysis = (response as any).analysis || (response as any).visualAnalysis;

        return {
            success: true,
            analysis: analysis
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Visual analysis failed'
        };
    }
}
