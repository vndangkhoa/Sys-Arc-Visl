import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({ startOnLoad: false });

const graphDefinition = `
flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
`;

async function testParsing() {
    try {
        // Validate syntax
        const valid = await mermaid.parse(graphDefinition);
        console.log("Parse result:", valid);

        // Attempt to get data
        // Note: mermaid.mermaidAPI.getDiagramFromText is deprecated/internal but often used.
        // In v10+, we might need to use other methods.
        const type = mermaid.detectType(graphDefinition);
        console.log("Detected type:", type);

    } catch (error) {
        console.error("Parsing failed:", error);
    }
}

testParsing();
