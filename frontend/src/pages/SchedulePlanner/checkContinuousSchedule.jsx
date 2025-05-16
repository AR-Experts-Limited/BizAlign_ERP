const checkContinuousSchedule = (driverId, newScheduleDate, allSchedules) => {
    const newDate = new Date(newScheduleDate);
    // Filter schedules for this driver within ±6 days of the new schedule


    const schedules = allSchedules
        .filter(schedule => {
            if (schedule.driverId !== driverId) return false;
            //return true
            const scheduleDate = new Date(schedule.day);

            // Calculate difference in days
            const diffTime = scheduleDate.getTime() - newDate.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            // Keep if diffDays is between -6 and +6 (inclusive)
            return diffDays >= -6 && diffDays <= 6;
        })
        .map(schedule => ({
            day: new Date(schedule.day),
            service: schedule.service,
        }));


    // Add the new schedule date to the list
    schedules.push({ day: newDate });

    // Sort schedules by date
    schedules.sort((a, b) => a.day - b.day);

    // Check for 7 consecutive working days
    let consecutiveDays = 1;
    let consecutiveSchedules = []

    for (let i = 1; i < schedules.length; i++) {
        const prevDate = schedules[i - 1].day;
        const currDate = schedules[i].day;


        // Check if current date is exactly one day after the previous
        const dayDifference = (currDate - prevDate) / (1000 * 60 * 60 * 24);

        if (dayDifference === 1) {
            consecutiveDays += 1;

            if (consecutiveDays == 2) {
                consecutiveSchedules.push(prevDate)
                consecutiveSchedules.push(currDate)
            } else {
                consecutiveSchedules.push(currDate)

            }

        } else {
            consecutiveDays = 1;
            consecutiveSchedules = []
        }

        if (consecutiveDays >= 7) {
            const newDateIndex = consecutiveSchedules.findIndex(schedule => schedule.getTime() === newDate.getTime());
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