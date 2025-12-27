import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeImage, interpretText } from '../aiService';

// Mock fetch global
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('aiService', () => {
    beforeEach(() => {
        fetchMock.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('interpretText', () => {
        it('should call online AI when provider is not local', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                mermaidCode: 'flowchart TD\nA-->B',
                                metadata: {}
                            })
                        }
                    }]
                }),
                text: async () => ''
            });

            const result = await interpretText('test prompt', '', 'gpt-4', 'online', 'openai', 'test-key');

            expect(result.success).toBe(true);
            expect(result.mermaidCode).toContain('flowchart TD');
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('api.openai.com'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-key'
                    })
                })
            );
        });

        it('should call local Ollama when provider is local', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: {
                        content: JSON.stringify({
                            mermaidCode: 'flowchart TD\nA-->B',
                            metadata: {}
                        })
                    }
                }),
                text: async () => ''
            });

            // Using 'offline' mode correctly calls local AI
            const result = await interpretText('test prompt', 'http://localhost:11434', 'llama3', 'offline', undefined, '');

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.any(Object)
            );
        });

        it('should handle API errors gracefully', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Unauthorized error text'
            });

            const result = await interpretText('test', '', '', 'online', 'openai', 'bad-key');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid API Key');
        });

        it('should fetchWithRetry on transient errors', async () => {
            // first call fails with 429
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: async () => 'Rate limit exceeded'
            });
            // second call succeeds
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: JSON.stringify({ mermaidCode: 'flowchart TD', metadata: {} })
                        }
                    }]
                }),
                text: async () => ''
            });

            // We expect it to retry, so use a short backoff or mock timers if possible. 
            // Here we rely on the mocked response sequence.
            const result = await interpretText('retry test', '', 'gpt-4', 'online', 'openai', 'key');

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it('should fallback to error message on non-retryable errors', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Unauthorized error text'
            });

            const result = await interpretText('test', '', '', 'online', 'openai', 'bad-key');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid API Key');
        });
    });

    describe('analyzeImage', () => {
        it('should successfully parse mermaid code from image analysis', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                mermaidCode: 'flowchart LR\nX-->Y',
                                metadata: {}
                            })
                        }
                    }]
                }),
                text: async () => ''
            });

            const result = await analyzeImage('base64data', '', 'gpt-4-vision', 'online', 'openai', 'key');

            expect(result.success).toBe(true);
            expect(result.mermaidCode).toContain('flowchart LR');
        });
    });
});
