import React, { useState, useRef, useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/plugins/monthSelect/style.css";
import 'flatpickr/dist/themes/light.css';
import './Calendar.css';
import { BiChevronDown } from "react-icons/bi";
import moment from 'moment';

function WeekFilter({ type, value, display, onChange }) {
  const containerRef = useRef(null);
  const flatpickrRef = useRef(null);

  const [selectedWeek, setSelectedWeek] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedWeekRef = useRef([]);


  useEffect(() => {
    selectedWeekRef.current = selectedWeek;
  }, [selectedWeek]);

  useEffect(() => {
    if (value && (type === 'weekly' || type === 'biweekly')) {
      const [year, weekStr] = value.split('-W');
      const week = parseInt(weekStr, 10);
      const date = new Date(year, 0, (week - 1) * 7);
      const { startOfWeek, endOfWeek } = getWeekRange(date);
      setSelectedWeek({ startOfWeek, endOfWeek });
    }
  }, [value]);

  const getWeekRange = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + (type === 'weekly' ? 6 : 13));
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
    const { startOfWeek, endOfWeek } = getWeekRange(date);
    const isoWeekString = getISOWeekString(startOfWeek);

    setSelectedWeek({ startOfWeek, endOfWeek });

    if (onChange) {
      onChange(isoWeekString);
    }

    setTimeout(() => {
      if (flatpickrRef.current?.flatpickr) {
        flatpickrRef.current.flatpickr.redraw();
      }
    }, 0);
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


  flatpickr("#monthPicker", {
    plugins: [
      new monthSelectPlugin({
        shorthand: true, // e.g. Jan, Feb
        dateFormat: "Y-m", // format like 2025-05
        altFormat: "F Y", // format like May 2025
        theme: "light"
      })
    ],
    onChange: function (selectedDates, dateStr, instance) {
      onChange(dateStr)
    }
  });

  flatpickr("#datePicker", {
    value: new Date(value),
    onChange: (selectedDates) => {
      if (selectedDates && selectedDates.length > 0) {
        onChange(moment(selectedDates[0]).format('YYYY-MM-DD'));
      }
    },
    options: {
      mode: 'single',
      inline: true,
      weekNumbers: true,
      dateFormat: "Y-m-d", // e.g., 2025-05-16
      defaultDate: new Date()
    }
  });

  if (type === 'daily') {
    return (
      <div
        className={`w-full rounded-lg border-[1.5px] px-2 py-2 h-10  flex items-center gap-1 border-neutral-300 bg-white outline-none transition ${isCalendarOpen && 'border-primary-200'} dark:border-dark-3 dark:bg-dark-2`}
        id="datePicker"
      >
        {value ? (
          <span
            className="inline-flex items-center text-sm overflow-auto"
          >
            {moment(value).format('DD/MM/YYYY')}
          </span>
        ) : (
          <span className="text-gray-400">Select a week</span>
        )}
        <div className="ml-auto">
          <BiChevronDown size={18} />
        </div>

      </div>)
  }

  else if (type === 'monthly') {
    return (
      <div
        className={`w-full rounded-lg border-[1.5px] px-2 py-2 h-10  flex items-center gap-1 border-neutral-300 bg-white outline-none transition ${isCalendarOpen && 'border-primary-200'} dark:border-dark-3 dark:bg-dark-2`}
        id="monthPicker"
      >
        {value ? (
          <span
            className="inline-flex items-center text-sm overflow-auto"
          >
            {moment(value).format('MMMM, YYYY')}
          </span>
        ) : (
          <span className="text-gray-400">Select a week</span>
        )}
        <div className="ml-auto">
          <BiChevronDown size={18} />
        </div>

      </div>)
  }

  else if (type === 'weekly' || type === 'biweekly') {
    return (
      <div className='w-full' ref={containerRef}>
        <div
          className={`cursor-pointer w-full rounded-lg border-[1.5px] p-1 md:px-2 md:py-2 h-10 flex items-center gap-1 border-neutral-300 bg-white outline-none transition ${isCalendarOpen && 'border-primary-200'} dark:border-dark-3 dark:bg-dark-2`}
          onClick={() => setIsCalendarOpen(prev => !prev)}
        >
          {selectedWeek ? (
            <span
              className=" w-full ext-xs md:text-base inline-flex items-center  text-sm overflow-auto"
            >
              {display}
            </span>
          ) : (
            <span className="text-gray-400">Select a week</span>
          )}
          <div className="ml-1 md:ml-auto">
            <BiChevronDown size={18} />
          </div>
        </div>
        {
          isCalendarOpen && (
            <div className="absolute top-9 left-0 md:right-0 z-30 mt-1 shadow-lg">
              <Flatpickr
                ref={flatpickrRef}
                options={{
                  mode: 'single',
                  inline: true,
                  weekNumbers: true,
                  showMonths: 1,
                  onChange: handleDateSelect,
                  onReady: (_, __, fp) => {
                    fp.calendarContainer.classList.add('custom-flatpickr');
                  },
                  onDayCreate: (_, __, ___, dayElem) => {
                    const date = new Date(dayElem.dateObj);
                    date.setHours(0, 0, 0, 0); // Normalize

                    if (selectedWeekRef.current) {
                      const start = new Date(selectedWeekRef.current.startOfWeek);
                      const end = new Date(selectedWeekRef.current.endOfWeek);

                      if (date >= start && date <= end) {
                        dayElem.classList.add('!bg-primary-200/30', '!max-w-full', 'shadow-lg', '!rounded-none', '!text-primary-400');

                        const day = date.getDay();
                        if (date.getTime() === start.getTime()) {
                          dayElem.classList.add('!rounded-l-sm', '!bg-primary-400', 'shadow-lg', '!text-white');
                        } else if (date.getTime() === end.getTime()) {
                          dayElem.classList.add('!rounded-r-sm', '!bg-primary-400', 'shadow-lg', '!text-white');
                        }
                      }
                    }
                  }
                }}
                className="hidden"
              />
            </div>
          )
        }
      </div >
    );
  }
}

export default WeekFilter;
