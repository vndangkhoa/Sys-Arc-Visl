
import { env, pipeline, RawImage } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export type VisionProgress = {
    status: string;
    progress?: number;
    file?: string;
};

// ViT-GPT2 is the ONLY working model for browser-based image captioning
// Other models (BLIP, Florence-2, LLaVA) are not supported by transformers.js
const MODEL_ID = 'Xenova/vit-gpt2-image-captioning';

export class VisionService {
    private captioner: any = null;
    private isLoading = false;
    private isReady = false;

    // Singleton instance
    private static instance: VisionService;

    public static getInstance(): VisionService {
        if (!VisionService.instance) {
            VisionService.instance = new VisionService();
        }
        return VisionService.instance;
    }

    getStatus() {
        return {
            isReady: this.isReady,
            isLoading: this.isLoading,
            model: MODEL_ID
        };
    }

    async initialize(onProgress?: (progress: VisionProgress) => void): Promise<void> {
        if (this.isReady || this.isLoading) return;

        this.isLoading = true;

        try {
            console.log('Loading Vision Model...');
            if (onProgress) onProgress({ status: 'Loading Vision Model...' });

            // Use the pipeline API - much simpler and faster
            this.captioner = await pipeline('image-to-text', MODEL_ID, {
                progress_callback: (progress: any) => {
                    if (onProgress && progress.status === 'progress') {
                        onProgress({
                            status: `Downloading ${progress.file}`,
                            progress: progress.progress,
                            file: progress.file
                        });
                    }
                }
            });

            this.isReady = true;
            console.log('Vision Model Ready');
        } catch (error) {
            console.error('Failed to load Vision Model:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Analyzes an image (Base64 or URL) and returns a description.
     * Uses vit-gpt2 for fast captioning.
     */
    async analyzeImage(imageBase64: string): Promise<string> {
        if (!this.isReady) {
            throw new Error('Vision model not loaded. Please initialize it first.');
        }

        try {
            // Handle data URL prefix if present
            const cleanBase64 = imageBase64.includes(',') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

            let image = await RawImage.fromURL(cleanBase64);

            // Keep higher resolution for better detail detection
            if (image.width > 512 || image.height > 512) {
                image = await image.resize(512, 512);
            }

            console.log('Starting enhanced image analysis...');
            const startTime = performance.now();

            // Run multiple passes for more comprehensive description
            const results = await Promise.all([
                // Pass 1: Detailed description
                this.captioner(image, {
                    max_new_tokens: 150,
                    num_beams: 4,  // Beam search for better quality
                }),
                // Pass 2: Alternative perspective
                this.captioner(image, {
                    max_new_tokens: 100,
                    do_sample: true,
                    temperature: 0.7,
                }),
            ]);

            const endTime = performance.now();
            console.log(`Vision analysis completed in ${((endTime - startTime) / 1000).toFixed(1)}s`);

            // Combine descriptions for richer output
            const caption1 = results[0]?.[0]?.generated_text || '';
            const caption2 = results[1]?.[0]?.generated_text || '';

            // If both are similar, use just one; otherwise combine
            if (caption1.toLowerCase().includes(caption2.toLowerCase().substring(0, 20)) ||
                caption2.toLowerCase().includes(caption1.toLowerCase().substring(0, 20))) {
                return caption1.length > caption2.length ? caption1 : caption2;
            }

            const combined = `${caption1}. Additionally: ${caption2}`;
            console.log('Enhanced description:', combined);
            return combined;

        } catch (error) {
            console.error('Vision analysis failed:', error);
            throw new Error('Failed to analyze image with local vision model');
        }
    }
}

export const visionService = VisionService.getInstance();
