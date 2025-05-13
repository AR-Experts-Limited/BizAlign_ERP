const checkContinuousSchedule = (driverId, newScheduleDate, allSchedules) => {
    const newDate = new Date(newScheduleDate);
    console.log("allSchedules:", allSchedules)

    //console.log("newDate", newDate)
    // Filter schedules for this driver within ±6 days of the new schedule
    const schedules = allSchedules
        .filter(schedule => schedule.driverId === driverId)
        .map(schedule => ({
            day: new Date(schedule.day),
            service: schedule.service,
        }));

    // Add the new schedule date to the list
    schedules.push({ day: newDate });

    // Sort schedules by date
    schedules.sort((a, b) => a.day - b.day);

    console.log("schedules:", schedules)
    // Check for 7 consecutive working days
    let consecutiveDays = 1;

    for (let i = 1; i < schedules.length; i++) {
        const prevDate = schedules[i - 1].day;
        const currDate = schedules[i].day;

        // Check if current date is exactly one day after the previous
        const dayDifference = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (dayDifference === 1 && !(['unavailable', 'dayoff', 'Voluntary Day-Off'].includes(schedules[i - 1].service) || ['unavailable', 'dayoff', 'Voluntary Day-Off'].includes(schedules[i].service))) {
            consecutiveDays += 1;
        } else {
            consecutiveDays = 1;
        }

        if (consecutiveDays >= 7) {
            const newDateIndex = schedules.findIndex(schedule => schedule.day.getTime() === newDate.getTime());

            if (newDateIndex == 6 || newDateIndex == 0) {
                return "1"; // Unavailable
            } else {
                return "2"; // Day off required
            }
        }
    }

    return "3"; // No 7 consecutive days
};


export default checkContinuousSchedule;