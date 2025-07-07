export function areWeeksContinuous(weekArray) {
    if (weekArray.length < 2) return true;

    // Convert "2025-W02" => { year: 2025, week: 2 }
    const parsedWeeks = weekArray.map(w => {
        const [year, week] = w.split('-W').map(Number);
        return { year, week };
    });

    for (let i = 1; i < parsedWeeks.length; i++) {
        const prev = parsedWeeks[i - 1];
        const curr = parsedWeeks[i];

        let expectedWeek = prev.week + 1;
        let expectedYear = prev.year;

        // If week exceeds 52 (or 53), move to next year
        if (expectedWeek > 52) {  // You can enhance this with ISO week calculation if needed
            expectedWeek = 1;
            expectedYear += 1;
        }

        if (curr.week !== expectedWeek || curr.year !== expectedYear) {
            return false;
        }
    }

    return true;
}