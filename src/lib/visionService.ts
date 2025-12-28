
import { env, AutoProcessor, AutoModel, RawImage } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export type VisionProgress = {
    status: string;
    progress?: number;
    file?: string;
};

// We use Florence-2-base for a good balance of speed and accuracy (~200MB - 400MB)
// 'onnx-community/Florence-2-base-ft' is the modern standard for Transformers.js v3.
const MODEL_ID = 'onnx-community/Florence-2-base-ft';

export class VisionService {
    private model: any = null;
    private processor: any = null;
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
            if (onProgress) onProgress({ status: 'Loading Processor...' });

            this.processor = await AutoProcessor.from_pretrained(MODEL_ID);

            if (onProgress) onProgress({ status: 'Loading Model (this may take a while)...' });

            this.model = await AutoModel.from_pretrained(MODEL_ID, {
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
     * Analyzes an image (Base64 or URL) and returns a detailed description.
     * We use the '<MORE_DETAILED_CAPTION>' task for Florence-2.
     */
    async analyzeImage(imageBase64: string): Promise<string> {
        if (!this.isReady) {
            throw new Error('Vision model not loaded. Please initialize it first.');
        }

        try {
            // Handle data URL prefix if present
            const cleanBase64 = imageBase64.includes(',') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

            const image = await RawImage.fromURL(cleanBase64);

            // Task: Detailed Captioning is best for understanding diagrams
            const task = '<MORE_DETAILED_CAPTION>';

            // Construct prompts using the processor's method (required for Florence-2)
            const prompts = this.processor.construct_prompts(task);

            // Pre-process the image and text inputs
            // Processor expects batch input, so wrap single image in array
            if (!this.processor) throw new Error('Processor is undefined');
            const inputs = await this.processor([image], prompts);

            const generatedIds = await this.model.generate({
                ...inputs,
                max_new_tokens: 512, // Sufficient for a description
            });

            const generatedText = this.processor.batch_decode(generatedIds, {
                skip_special_tokens: false,
            })[0];

            // Post-process to extract the caption
            // Florence-2 output format usually includes the task token
            const parsedAnswer = this.processor.post_process_generation(
                generatedText,
                task,
                image.size
            );

            // Access the dictionary result. For CAPTION tasks, it's usually under '<MORE_DETAILED_CAPTION>' or similar key
            // Ideally post_process_generation returns { '<MORE_DETAILED_CAPTION>': "Description..." }
            return parsedAnswer['<MORE_DETAILED_CAPTION>'] || typeof parsedAnswer === 'string' ? parsedAnswer : JSON.stringify(parsedAnswer);

        } catch (error) {
            console.error('Vision analysis failed:', error);
            throw new Error('Failed to analyze image with local vision model');
        }
    }
}

export const visionService = VisionService.getInstance();
