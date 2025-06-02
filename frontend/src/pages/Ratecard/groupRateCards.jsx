export const groupRateCards = (rateCards) => {
    const grouped = {};

    rateCards.forEach(card => {
        const key = `${card.active}|${card.serviceTitle}|${card.minimumRate}|${card.serviceRate}|${card.byodRate}|${card.mileage}|${card.hourlyRate}`;

        if (!grouped[key]) {
            grouped[key] = {
                ...card,
                serviceWeeks: [card.serviceWeek],
                ids: [card._id],
                cards: [card],
            };
        } else {
            grouped[key].serviceWeeks.push(card.serviceWeek);
            grouped[key].ids.push(card._id);
            grouped[key].cards.push(card);
        }
    });

    // Sort the serviceWeeks inside each group
    Object.values(grouped).forEach(group => {
        group.serviceWeeks.sort((a, b) => {
            const [yearA, weekA] = a.split('-W').map(Number);
            const [yearB, weekB] = b.split('-W').map(Number);
            return yearA !== yearB ? yearA - yearB : weekA - weekB;
        });
    });

    // Convert to array and sort groups by earliest serviceWeek
    return Object.values(grouped).sort((a, b) => {
        const [yearA, weekA] = a.serviceWeeks[0].split('-W').map(Number);
        const [yearB, weekB] = b.serviceWeeks[0].split('-W').map(Number);
        return yearA !== yearB ? yearA - yearB : weekA - weekB;
    });
};