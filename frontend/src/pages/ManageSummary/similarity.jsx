// Function to create a frequency vector from a string
function textToVector(text) {
    const words = text.toLowerCase().match(/\w+/g) || [];
    const freqMap = {};

    words.forEach(word => {
        freqMap[word] = (freqMap[word] || 0) + 1;
    });

    return freqMap;
}

// Function to compute cosine similarity between two text vectors
export function cosineSimilarityFromText(textA, textB) {
    const vectorA = textToVector(textA);
    const vectorB = textToVector(textB);

    const allWords = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const word of allWords) {
        const valA = vectorA[word] || 0;
        const valB = vectorB[word] || 0;

        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
