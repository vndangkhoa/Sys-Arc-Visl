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
import {
    SYSTEM_PROMPT,
    SYSTEM_PROMPT_SIMPLE,
    SYSTEM_PROMPT_COMPLEX,
    SUGGEST_PROMPT,
    VISUAL_ANALYSIS_PROMPT
} from './prompts';


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

            // Transform messages to OpenAI format with image support
            const formattedMessages = messages.map(msg => {
                if (msg.images && msg.images.length > 0) {
                    // Vision message with image
                    return {
                        role: msg.role,
                        content: [
                            { type: 'text', text: msg.content },
                            ...msg.images.map((img: string) => ({
                                type: 'image_url',
                                image_url: { url: `data:image/png;base64,${img}` }
                            }))
                        ]
                    };
                }
                return { role: msg.role, content: msg.content };
            });

            body = {
                model: 'gpt-4o',
                messages: [{ role: 'system', content: activePrompt }, ...formattedMessages],
                response_format: { type: 'json_object' }
            };
        } else if (provider === 'gemini') {
            // Gemini API with vision support - using gemini-2.0-flash-exp for better compatibility
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

            // Build parts array - text first, then images
            const parts: any[] = [
                { text: `${activePrompt}\n\nTask: ${messages[messages.length - 1].content}` }
            ];

            // Add images if present
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.images && lastMsg.images.length > 0) {
                lastMsg.images.forEach((imageBase64: string) => {
                    parts.push({
                        inline_data: {
                            mime_type: 'image/png',
                            data: imageBase64
                        }
                    });
                });
            }

            body = {
                contents: [{ parts }],
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
            if (response.status === 404) errorMsg = `API endpoint not found. For ${provider}, please verify your API key is valid.`;
            if (response.status === 429) errorMsg = 'Rate limit exceeded. Please try again later.';
            if (response.status === 400) {
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error?.message || errorMsg;
                } catch { /* ignore parse error */ }
            }
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
    // Simplified prompt for browser AI - just ask for Mermaid code directly
    const BROWSER_AI_PROMPT = `You are a system design diagram generator. Generate ONLY Mermaid flowchart code.

RULES:
- Start with "graph TD" or "graph LR"  
- Use simple node IDs like A, B, C
- Use subgraph for grouping
- NO explanations, NO markdown, NO JSON - ONLY the mermaid code

Example output:
graph TD
    subgraph Frontend
        A[Web App]
        B[Mobile App]
    end
    subgraph Backend
        C[API Server]
        D[(Database)]
    end
    A --> C
    B --> C
    C --> D

Now generate mermaid code for the user's request. Output ONLY the mermaid code, nothing else.`;

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
                console.log('Vision description:', imageDescription);

                // Augment the prompt with the description
                content = `${content}\n\n[VISUAL CONTEXT FROM IMAGE]:\n${imageDescription}\n\n(Use this visual description to generate the Mermaid code.)`;
            }

            processedMessages.push({
                role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') ? msg.role : 'user',
                content: content
            });
        }

        const fullMessages = [
            { role: 'system' as const, content: BROWSER_AI_PROMPT },
            ...processedMessages
        ];

        console.log('Starting WebLLM text generation...');
        const generator = await webLlmService.chat(fullMessages);
        let fullContent = "";

        for await (const chunk of generator) {
            fullContent += chunk;
        }
        console.log('WebLLM raw output:', fullContent.substring(0, 500)); // First 500 chars

        // Clean up the output - Browser AI outputs Mermaid code directly
        let cleanContent = fullContent.trim();

        // Strip Qwen3's <think> reasoning tags if present
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        // Also remove incomplete <think> tags (if model was cut off)
        cleanContent = cleanContent.replace(/<think>[\s\S]*$/g, '').trim();

        // Remove markdown code blocks if present
        if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```(?:mermaid|json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        }

        // Try to extract mermaid code - look for "graph" pattern
        const mermaidMatch = cleanContent.match(/graph\s+(?:TB|TD|LR|RL|BT)[\s\S]*/);
        if (mermaidMatch) {
            console.log('Extracted mermaid code successfully');
            return {
                success: true,
                mermaidCode: mermaidMatch[0].trim()
            };
        }

        // Fallback: try to parse as JSON if it looks like JSON
        if (cleanContent.startsWith('{')) {
            try {
                const parsed = JSON.parse(cleanContent);
                console.log('Parsed as JSON:', Object.keys(parsed));
                return {
                    success: true,
                    mermaidCode: parsed.mermaidCode,
                    metadata: parsed.metadata,
                    analysis: parsed.analysis
                };
            } catch (e) {
                // Not valid JSON, continue
            }
        }

        // If we get here, we couldn't extract mermaid code
        console.error('Could not extract mermaid code from:', cleanContent.substring(0, 500));
        return {
            success: false,
            error: 'Could not generate valid Mermaid diagram code'
        };

    } catch (error) {
        console.error('Browser AI error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Browser model logic failed'
        };
    }
}

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

/**
 * Fix and Enhance Mermaid Diagram
 * Adds metadata, fixes syntax, and groups nodes
 */
export async function fixDiagram(code: string, apiKey: string, errorMessage?: string): Promise<string> {
    const prompt = `
You are an expert Mermaid.js Diagram Engineer.

YOUR TASK:
Fix and Enhance the following Mermaid code.

RULES:
1. Fix any syntax errors.
2. Ensure all nodes are semantically grouped into subgraphs (e.g. "subgraph Client", "subgraph Server", "subgraph Database") if possible.
3. IMPORTANT: Generates JSON metadata for each node in comments.
   Format: %% { "id": "NODE_ID", "metadata": { "role": "Specific Role", "techStack": ["Tech1", "Tech2"], "description": "Brief description" } }
4. Return ONLY the mermaid code. No markdown fences.

CODE TO FIX:
${code}

${errorMessage ? `ERROR TO FIX:\n${errorMessage}` : ''}
`;

    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        let result = data.candidates?.[0]?.content?.parts?.[0]?.text || code;

        // Clean result
        result = result.replace(/^```(?:mermaid)?/gm, '').replace(/```$/gm, '').trim();

        return result;
    } catch (error) {
        console.error('AI Fix Failed:', error);
        return code;
    }
}
