import React, { useState, useRef, useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import './Calendar.css'
import { BiChevronDown } from "react-icons/bi";

function RateCardWeek({ value, onChange, disabled, mode }) {
    const containerRef = useRef(null);
    const flatpickrRef = useRef(null);

    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const selectedWeeksRef = useRef([]);

    useEffect(() => {
        selectedWeeksRef.current = selectedWeeks;
    }, [selectedWeeks]);

    useEffect(() => {
        if (disabled && mode !== 'edit') {
            setSelectedWeeks([]);
        }
    }, [disabled])

    useEffect(() => {
        setSelectedWeeks(value)
    }, [value])

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const getWeekRange = (date) => {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(0, 0, 0, 0);

        return { startOfWeek, endOfWeek };
    };

    const getISOWeekString = (date) => {
        const tempDate = new Date(date);
        const yearStart = new Date(tempDate.getFullYear(), 0, 1);
        const sundayOfYearStart = new Date(yearStart);
        sundayOfYearStart.setDate(yearStart.getDate() - yearStart.getDay());
        const diffDays = Math.floor((tempDate - sundayOfYearStart) / (1000 * 60 * 60 * 24));

        let weekNo = Math.ceil(diffDays / 7) + 1;
        let year = tempDate.getFullYear();

        if (weekNo > 52) {
            year += 1;
            weekNo = 1;
        }
        return `${year}-W${weekNo.toString().padStart(2, '0')}`;
    };

    const handleDateSelect = (selectedDates) => {
        if (selectedDates.length === 0) return;

        const date = selectedDates[0];
        const { startOfWeek } = getWeekRange(date);
        const isoWeekString = getISOWeekString(startOfWeek);

        setSelectedWeeks((prevWeeks) => {
            const alreadySelected = prevWeeks.includes(isoWeekString);

            let updatedWeeks;
            if (alreadySelected) {
                updatedWeeks = prevWeeks.filter(week => week !== isoWeekString);
            } else {
                updatedWeeks = [...prevWeeks, isoWeekString];
            }

            updatedWeeks.sort((a, b) => {
                const [yearA, weekA] = a.split('-W').map(Number);
                const [yearB, weekB] = b.split('-W').map(Number);
                return yearA !== yearB ? yearA - yearB : weekA - weekB;
            });

            if (onChange) {
                onChange(updatedWeeks);
            }
            setTimeout(() => {
                if (flatpickrRef.current?.flatpickr) {
                    flatpickrRef.current.flatpickr.redraw();
                }
            }, 0);
            return updatedWeeks;
        });
    };

    const handleWeekRemove = (weekToRemove) => {
        const updatedWeeks = selectedWeeks.filter(week => week !== weekToRemove);

        setSelectedWeeks(updatedWeeks);
        setTimeout(() => {
            if (flatpickrRef.current?.flatpickr) {
                flatpickrRef.current.flatpickr.redraw();
            }
        }, 0);
        if (onChange) {
            onChange(updatedWeeks);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isDateInSelectedWeek = (date) => {
        return selectedWeeks.some(weekString => {
            const [year, week] = weekString.split('-W').map(Number);
            const weekStart = new Date(year, 0, 1);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (week - 1) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return date >= weekStart && date <= weekEnd;
        });
    };

    return (
        <div ref={containerRef} className={`relative`}>
            <div
                className={`w-full rounded-lg border-[1.5px] px-5.5 py-3.5 flex items-center gap-1 border-neutral-300 overflow-auto bg-transparent outline-none transition ${disabled && '!bg-neutral-50 pointer-events-none'} ${isCalendarOpen && 'border-primary-500'} dark:border-dark-3 dark:bg-dark-2`}
                onClick={() => { if (mode !== 'edit') setIsCalendarOpen(true) }}
            >
                {selectedWeeks.length > 0 ? (
                    selectedWeeks.map((week, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center shrink-0 bg-gray-100 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors"
                        >
                            {week}
                            {mode !== 'edit' && <span onClick={(e) => {
                                e.stopPropagation();
                                handleWeekRemove(week);
                            }} className="cursor-pointer shrink-0 flex items-center justify-center ml-1 h-5 w-5 text-gray-500 hover:bg-red-300 rounded-full">×</span>}
                        </span>
                    ))
                ) : (
                    <span className={`text-gray-400`}>Select weeks</span>
                )}
                <div className="ml-auto">
                    <BiChevronDown size={18} />
                </div>
            </div>

            {isCalendarOpen && (
                <div className="absolute z-10 mt-1 shadow-lg">
                    <Flatpickr
                        ref={flatpickrRef}
                        options={{
                            mode: 'single',
                            inline: true,
                            weekNumbers: true,
                            showMonths: 1,
                            onChange: (selectedDates) => handleDateSelect(selectedDates),
                            onReady: (_, __, fp) => {
                                fp.calendarContainer.classList.add('custom-flatpickr');
                            },
                            onDayCreate: (_, __, ___, dayElem) => {
                                const date = new Date(dayElem.dateObj);
                                date.setHours(0, 0, 0, 0);

                                for (const weekString of selectedWeeksRef.current) {
                                    const [year, week] = weekString.split('-W').map(Number);
                                    const startOfWeek = new Date(year, 0, 1);
                                    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (week - 1) * 7);
                                    const endOfWeek = new Date(startOfWeek);
                                    endOfWeek.setDate(startOfWeek.getDate() + 6);

                                    if (date >= startOfWeek && date <= endOfWeek) {
                                        dayElem.classList.add('!bg-primary-200/30', '!max-w-full', 'shadow-lg', '!rounded-none', '!text-primary-400');

                                        const day = date.getDay();
                                        if (day === 0) {
                                            dayElem.classList.add('!rounded-l-sm', '!bg-primary-400', 'shadow-lg', '!text-white');
                                        } else if (day === 6) {
                                            dayElem.classList.add('!rounded-r-sm', '!bg-primary-400', 'shadow-lg', '!text-white');
                                        }
                                    }
                                }
                            }
                        }}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}

export default RateCardWeek;