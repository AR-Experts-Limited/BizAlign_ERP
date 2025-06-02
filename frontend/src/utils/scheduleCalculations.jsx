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
    (drivers, schedules) => {
        const continuousStatus = {};

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

        drivers.forEach(driver => {
            const driverSchedules = schedulesByDriver[driver._id] || [];
            driverSchedules.sort((a, b) => a.day - b.day);

            const driverStatus = {};
            let consecutiveDays = 1;

            for (let i = 1; i < driverSchedules.length; i++) {
                const prevDate = driverSchedules[i - 1].day;
                const currDate = driverSchedules[i].day;
                const dayDifference = (currDate - prevDate) / (1000 * 60 * 60 * 24);

                if (dayDifference === 1) {
                    consecutiveDays += 1;
                } else {
                    consecutiveDays = 1;
                }

                const dateKey = currDate.toLocaleDateString('en-UK');

                if (consecutiveDays >= 7) {
                    // Check if current date is at start or end of streak
                    const streakStartIndex = i - consecutiveDays + 1;
                    const isStart = i - streakStartIndex === 0;
                    const isEnd = i === driverSchedules.length - 1 ||
                        (driverSchedules[i + 1].day - currDate) / (1000 * 60 * 60 * 24) > 1;

                    driverStatus[dateKey] = isStart || isEnd ? "1" : "2";
                } else {
                    driverStatus[dateKey] = "3";
                }
            }

            continuousStatus[driver._id] = driverStatus;
        });

        return continuousStatus;
    },
    (drivers, schedules) => {
        // Cache key based on driver IDs and schedule IDs/timestamps
        const driverKey = drivers.map(d => d._id).join(',');
        const scheduleKey = schedules.map(s => `${s._id}-${s.day}`).join(',');
        return `${driverKey}|${scheduleKey}`;
    }
);