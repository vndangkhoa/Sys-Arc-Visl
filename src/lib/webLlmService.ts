import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import type { InitProgressCallback } from "@mlc-ai/web-llm";

export type WebLlmProgress = {
    progress: number;
    text: string;
    timeElapsed: number;
};

// Latest "Tiny" model with high instruction adherence
const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f32_1-MLC";

export class WebLlmService {
    private engine: MLCEngine | null = null;
    private isLoading = false;
    private isReady = false;

    // Track GPU Availability
    public static async isSystemSupported(): Promise<boolean | null> {
        // @ts-ignore
        if (!navigator.gpu) {
            console.warn('WebGPU not supported in this environment');
            return null;
        }
        try {
            // @ts-ignore
            const adapter = await navigator.gpu.requestAdapter();
            return !!adapter;
        } catch (e) {
            return false;
        }
    }

    async initialize(onProgress?: (progress: WebLlmProgress) => void): Promise<void> {
        if (this.engine || this.isLoading) return;

        this.isLoading = true;

        const initProgressCallback: InitProgressCallback = (report) => {
            if (onProgress) {
                // Parse the native report which is basically just text and percentage
                // Example: "Loading model 10% [ cached ]" or "Fetching param shard 1/4"
                const progressMatch = report.text.match(/(\d+)%/);
                const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

                onProgress({
                    progress,
                    text: report.text,
                    timeElapsed: report.timeElapsed
                });
            }
        };

        try {
            console.log('Initializing WebLLM Engine...');
            this.engine = await CreateMLCEngine(
                DEFAULT_MODEL,
                { initProgressCallback }
            );
            this.isReady = true;
            console.log('WebLLM Engine Ready');
        } catch (error) {
            console.error('Failed to initialize WebLLM:', error);
            this.engine = null;
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    async chat(messages: { role: 'system' | 'user' | 'assistant', content: string }[]): Promise<AsyncGenerator<string>> {
        if (!this.engine || !this.isReady) {
            throw new Error("WebLLM Engine not initialized. Please load the model first.");
        }

        const completion = await this.engine.chat.completions.create({
            messages,
            stream: true,
            temperature: 0.1, // Low temp for code/logic generation
            max_tokens: 4096, // Sufficient for diagrams
        });

        // Create a generator to stream chunks easily
        async function* streamGenerator() {
            for await (const chunk of completion) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    yield content;
                }
            }
        }

        return streamGenerator();
    }

    getStatus(): { isReady: boolean; isLoading: boolean; model: string } {
        return {
            isReady: this.isReady,
            isLoading: this.isLoading,
            model: DEFAULT_MODEL
        };
    }
}

// Singleton instance
export const webLlmService = new WebLlmService();
