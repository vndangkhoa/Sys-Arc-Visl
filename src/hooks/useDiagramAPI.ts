import { useEffect, useRef } from 'react';
import { useFlowStore } from '../store';
import { useSearchParams } from 'react-router-dom';

/**
 * useDiagramAPI
 * 
 * Enables programmatic control of the diagram editor via:
 * 1. URL Parameters: ?code=<base64_mermaid>
 * 2. Window Messages: PostMessage for embedding scenarios
 */
export function useDiagramAPI() {
    const [searchParams] = useSearchParams();
    const { setSourceCode, sourceCode } = useFlowStore();

    // Create a ref for sourceCode to access current value in event listener without re-binding
    const sourceCodeRef = useRef(sourceCode);
    useEffect(() => {
        sourceCodeRef.current = sourceCode;
    }, [sourceCode]);

    // 1. Handle URL Parameters
    useEffect(() => {
        const codeParam = searchParams.get('code');
        if (codeParam) {
            try {
                // Decode Base64
                const decodedCode = atob(codeParam);
                setSourceCode(decodedCode);

                // Clear param after consumption to avoid re-triggering or cluttering URL
                // causing a reload? No, using router API.
                // But better to keep it if user wants to share URL. 
                // Let's decided to keep it for "stateful URL" behavior for now.
                // If we want to support "cleaning", we can uncomment below:
                // setSearchParams(prev => {
                //     const next = new URLSearchParams(prev);
                //     next.delete('code');
                //     return next;
                // });
            } catch (e) {
                console.error('Failed to decode diagram code from URL:', e);
            }
        }
    }, [searchParams, setSourceCode]);

    // 2. Handle Window Messages (for generic iframe control)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Security check: You might want to check event.origin here in production

            const { type, payload } = event.data;

            if (type === 'KVGRAPH_LOAD' && payload?.code) {
                setSourceCode(payload.code);
            }

            if (type === 'KVGRAPH_GET_CODE') {
                // Reply with current code
                event.source?.postMessage({
                    type: 'KVGRAPH_CODE_RESPONSE',
                    payload: { code: sourceCodeRef.current }
                }, { targetOrigin: event.origin });
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setSourceCode]);
}
