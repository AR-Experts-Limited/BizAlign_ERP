import { memoize } from 'lodash';

export const calculateAllWorkStreaks = memoize(
    (drivers, schedules) => {
        const streaks = {};

        // Group schedules by driver first
        const schedulesByDriver = {};
        schedules.forEach(schedule => {
            if (!schedulesByDriver[schedule.driverId]) {
                schedulesByDriver[schedule.driverId] = [];
            }
            schedulesByDriver[schedule.driverId].push({
                day: new Date(schedule.day),
                service: schedule.service
            });
        });

        // For each driver, calculate streaks for all their scheduled days
        drivers.forEach(driver => {
            const driverSchedules = schedulesByDriver[driver._id] || [];

            // Sort schedules by date
            driverSchedules.sort((a, b) => a.day - b.day);

            // Calculate streaks for all dates at once
            const driverStreaks = {};
            let currentStreak = 0;

            for (let i = 0; i < driverSchedules.length; i++) {
                if (i === 0) {
                    currentStreak = 1;
                } else {
                    const prevDate = driverSchedules[i - 1].day;
                    const currDate = driverSchedules[i].day;
                    const dayDifference = (currDate - prevDate) / (1000 * 60 * 60 * 24);

                    currentStreak = dayDifference === 1 ? currentStreak + 1 : 1;
                }

                const dateKey = driverSchedules[i].day.toLocaleDateString('en-UK');
                driverStreaks[dateKey] = currentStreak;
            }

            streaks[driver._id] = driverStreaks;
        });

        return streaks;
    },
    (drivers, schedules) => {
        // Cache key based on driver IDs and schedule IDs/timestamps
        const driverKey = drivers.map(d => d._id).join(',');
        const scheduleKey = schedules.map(s => `${s._id}-${s.day}`).join(',');
        return `${driverKey}|${scheduleKey}`;
    }
);

/**
 * Memoized function to check continuous schedules
 */
export const checkAllContinuousSchedules = memoize(
    (drivers, schedules, dateRange) => {
        const continuousStatus = {};

        // Group schedules by driver
        const schedulesByDriver = {};
        schedules.forEach(schedule => {
            const driverId = schedule.driverId;
            if (!schedulesByDriver[driverId]) {
                schedulesByDriver[driverId] = [];
            }
            schedulesByDriver[driverId].push(new Date(schedule.day));
        });

        // For each driver
        drivers.forEach(driver => {
            const driverId = driver._id;
            const existingDates = schedulesByDriver[driverId] || [];
            const status = {};

            // Simulate for each date in the dateRange
            dateRange.forEach(simulatedDateStr => {
                const newDate = new Date(simulatedDateStr);
                const newTime = newDate.getTime();

                // Build ±6 day window
                const windowDates = existingDates.filter(date => {
                    const diff = (date - newDate) / (1000 * 60 * 60 * 24);
                    return diff >= -6 && diff <= 6;
                });

                // Add the simulated date
                windowDates.push(newDate);

                // Remove duplicates and sort
                const uniqueSorted = Array.from(new Set(windowDates.map(d => d.getTime())))
                    .map(t => new Date(t))
                    .sort((a, b) => a - b);

                // Check for 7-day streaks
                let consecutiveDays = 1;
                let streak = [];

                for (let i = 1; i < uniqueSorted.length; i++) {
                    const prev = uniqueSorted[i - 1];
                    const curr = uniqueSorted[i];
                    const diff = (curr - prev) / (1000 * 60 * 60 * 24);

                    if (diff === 1) {
                        consecutiveDays++;
                        if (consecutiveDays === 2) {
                            streak.push(prev, curr);
                        } else {
                            streak.push(curr);
                        }
                    } else {
                        consecutiveDays = 1;
                        streak = [];
                    }

                    if (consecutiveDays >= 7) {
                        const index = streak.findIndex(d => d.getTime() === newTime);
                        const key = newDate.toLocaleDateString('en-UK');

                        if (index === 0 || index === 6) {
                            status[key] = "1"; // Start or end of 7-day streak
                        } else if (index > 0 && index < 6) {
                            status[key] = "2"; // Mid of 7-day streak
                        }

                        return; // No need to continue once marked
                    }
                }

                const key = newDate.toLocaleDateString('en-UK');
                if (!status[key]) {
                    status[key] = "3"; // No 7-day streak created
                }
            });

            continuousStatus[driverId] = status;
        });

        return continuousStatus;
    },
    (drivers, schedules, dateRange) => {
        const driverKey = drivers.map(d => d._id).join(',');
        const scheduleKey = schedules.map(s => `${s._id}-${s.day}`).join(',');
        const dateRangeKey = dateRange.join(',');
        return `${driverKey}|${scheduleKey}|${dateRangeKey}`;
    }
);


