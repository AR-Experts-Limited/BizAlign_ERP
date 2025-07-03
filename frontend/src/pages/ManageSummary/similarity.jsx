export function compareServiceStrings(str1, str2, durationTolerance = 0) {
    // Parse strings into serviceType and duration
    function parseServiceString(str) {
        const [serviceType, duration] = str.split(' - ').map(s => s.trim());
        return { serviceType, duration };
    }

    // Parse duration into minutes
    function parseDuration(duration) {
        // Handle cases where duration might be empty or malformed
        if (!duration) return 0;

        // Regex to match hours and optional minutes with flexible unit spellings
        const regex = /(\d+)\s*(?:hr|hrs|hour|hours|Hr|Hrs)\s*(?:(\d+)\s*(?:min|mins|minute|minutes|Min|Mins))?$/i;
        const match = duration.match(regex);

        if (!match) return 0; // Return 0 if no valid duration is found

        const hours = parseInt(match[1], 10) || 0;
        const minutes = parseInt(match[2], 10) || 0; // Minutes might be absent or 0
        return hours * 60 + minutes;
    }

    // Parse both strings
    const parsed1 = parseServiceString(str1);
    const parsed2 = parseServiceString(str2);

    // Compare service types (case-insensitive)
    const isServiceTypeSame = parsed1.serviceType.toLowerCase() === parsed2.serviceType.toLowerCase();

    // Parse and compare durations
    const duration1 = parseDuration(parsed1.duration);
    const duration2 = parseDuration(parsed2.duration);
    const isDurationSimilar = Math.abs(duration1 - duration2) <= durationTolerance;

    // Return comparison result
    return {
        isSimilar: isServiceTypeSame && isDurationSimilar,
        serviceTypeMatch: isServiceTypeSame,
        durationDifference: Math.abs(duration1 - duration2),
    };
}