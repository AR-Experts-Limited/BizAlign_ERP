import React, { useState, useEffect } from 'react';

const WeekRangeDropdown = ({ value, disabled, onChange }) => {
    const [startWeek, setStartWeek] = useState('');
    const [endWeek, setEndWeek] = useState('');
    const [weeks, setWeeks] = useState([]);

    // Generate weeks for the next 5 years
    useEffect(() => {
        const generateWeeks = () => {
            const weeksArray = [];
            const currentYear = new Date().getFullYear();

            for (let year = currentYear; year <= currentYear + 1; year++) {
                const weeksInYear = getWeeksInYear(year);
                for (let week = 1; week <= weeksInYear; week++) {
                    weeksArray.push({
                        year,
                        week,
                        formatted: `${year}-W${week.toString().padStart(2, '0')}`
                    });
                }
            }

            setWeeks(weeksArray);
        };

        generateWeeks();
    }, []);

    // Parse the current value if it's an array
    useEffect(() => {
        if (value && Array.isArray(value) && value.length > 0) {
            const sorted = [...value].sort();
            setStartWeek(sorted[0]);
            setEndWeek(sorted[sorted.length - 1]);
        }
    }, [value]);

    const handleStartWeekChange = (e) => {
        const newStart = e.target.value;
        setStartWeek(newStart);
        updateWeekRange(newStart, endWeek);
    };

    const handleEndWeekChange = (e) => {
        const newEnd = e.target.value;
        setEndWeek(newEnd);
        updateWeekRange(startWeek, newEnd);
    };

    const updateWeekRange = (start, end) => {
        if (start && end) {
            const startParts = start.split('-W');
            const endParts = end.split('-W');
            const startYear = parseInt(startParts[0]);
            const startWeekNum = parseInt(startParts[1]);
            const endYear = parseInt(endParts[0]);
            const endWeekNum = parseInt(endParts[1]);

            const weeksInRange = [];
            let currentYear = startYear;
            let currentWeek = startWeekNum;

            while (currentYear < endYear || (currentYear === endYear && currentWeek <= endWeekNum)) {
                weeksInRange.push(`${currentYear}-W${currentWeek.toString().padStart(2, '0')}`);

                currentWeek++;
                const weeksInCurrentYear = getWeeksInYear(currentYear);
                if (currentWeek > weeksInCurrentYear) {
                    currentWeek = 1;
                    currentYear++;
                }
            }

            onChange(weeksInRange);
        }
    };

    // Helper function to get number of weeks in a year
    const getWeeksInYear = (year) => {
        const d = new Date(year, 11, 31);
        const week = getWeekNumber(d);
        return week === 1 ? getWeekNumber(new Date(year, 11, 31 - 7)) : week;
    };

    // Helper function to get week number (ISO week)
    const getWeekNumber = (d) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    return (
        <div className="mt-3 flex justify-between items-center gap-5">
            <select
                value={startWeek}
                onChange={handleStartWeekChange}
                disabled={disabled}
                className={`text-sm w-full bg-white rounded-lg border-[1.5px] border-neutral-300 px-1 py-3 outline-none focus:border-primary-400 disabled:bg-neutral-50 disabled:event-pointers-none ${startWeek === '' && 'text-gray-400'}`}
            >
                <option value="">Start Week</option>
                {weeks.map((weekObj, index) => (
                    <option
                        key={`start-${index}`}
                        value={weekObj.formatted}
                        disabled={endWeek && compareWeeks(weekObj.formatted, endWeek) > 0}
                    >
                        {weekObj.formatted}
                    </option>
                ))}
            </select>

            <span style={{ margin: '0 0.5rem' }}>to</span>

            <select
                value={endWeek}
                onChange={handleEndWeekChange}
                disabled={disabled}
                className={`text-sm w-full bg-white rounded-lg border-[1.5px] border-neutral-300 px-1 py-3 outline-none focus:border-primary-400 disabled:bg-neutral-50 disabled:event-pointers-none ${endWeek === '' && 'text-gray-400'}`}
            >
                <option value="">End Week</option>
                {weeks.map((weekObj, index) => (
                    <option
                        key={`end-${index}`}
                        value={weekObj.formatted}
                        disabled={startWeek && compareWeeks(weekObj.formatted, startWeek) < 0}
                    >
                        {weekObj.formatted}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Helper function to compare weeks in 'YYYY-WNN' format
const compareWeeks = (weekA, weekB) => {
    const [yearA, weekNumA] = weekA.split('-W').map(Number);
    const [yearB, weekNumB] = weekB.split('-W').map(Number);

    if (yearA !== yearB) return yearA - yearB;
    return weekNumA - weekNumB;
};

export default WeekRangeDropdown;