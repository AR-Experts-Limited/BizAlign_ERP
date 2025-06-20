import React, { useState, useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { FaCalendarAlt } from 'react-icons/fa';
import './Calendar.css';

const VehicleTypeCal = ({
    typeOfDriver,
    typeOfDriverTrace,
    customTypeOfDriver,
    setCustomTypeOfDriver,
}) => {
    const [selection, setSelection] = useState({ start: null, end: null });
    const [taggedDates, setTaggedDates] = useState(customTypeOfDriver || {});
    const [taggedRanges, setTaggedRanges] = useState([]);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const flatpickrRef = useRef(null);

    const formatDateKey = (date) => date.toLocaleString().split(',')[0];

    const parseDate = (str) => {
        const [day, month, year] = str.split('/');
        return new Date(new Date(`${year}-${month}-${day}`).setHours(0, 0, 0, 0));
    };

    const defaultTypeOfDriverMap = () => {
        const result = [];
        if (typeOfDriverTrace.length > 0) {
            let typeOfDriverSorted = [...typeOfDriverTrace].sort(
                (a, b) => parseDate(a.timestamp) - parseDate(b.timestamp)
            );

            let endDate = parseDate(typeOfDriverSorted[0]?.timestamp);
            result.push({
                type: typeOfDriverSorted[0]?.from,
                startDate: null,
                endDate,
            });

            for (let i = 0; i < typeOfDriverSorted.length; i++) {
                const current = typeOfDriverSorted[i];
                const startDate = parseDate(current.timestamp);
                let endDate = null;
                if (i + 1 < typeOfDriverSorted.length) {
                    endDate = parseDate(typeOfDriverSorted[i + 1].timestamp);
                }
                result.push({
                    type: current.to,
                    startDate,
                    endDate,
                });
            }
        }
        setTaggedRanges(result);
    };

    useEffect(() => {
        defaultTypeOfDriverMap();
    }, [typeOfDriverTrace]);

    const getDatesInRange = (start, end) => {
        const dates = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const handleDateSelect = (selectedDates) => {
        console.log(selectedDates)
        if (selectedDates.length === 0) return;

        if (selectedDates.length === 1) {
            setSelection({ start: selectedDates[0], end: null });
        }
        else if (new Date(selectedDates[0].getTime()) === new Date(selectedDates[1].getTime())) {
            setSelection({ start: selectedDates[0], end: null });
        }
        else {
            setSelection({ start: selectedDates[0], end: selectedDates[1] });
        }
        // if (!selection.start || (selection.start && selection.end)) {
        //     setSelection({ start: selectedDates[0], end: null });
        // } else if (selectedDates.length === 1) {
        //     const start = selection.start < selectedDates[0] ? selection.start : selectedDates[0];
        //     const end = selection.start > selectedDates[0] ? selection.start : selectedDates[0];
        //     setSelection({ start, end });
        // }
    };

    const tagRange = (type) => {
        if (!selection.start) return;

        const updated = { ...taggedDates };
        if (selection.start && selection.end) {
            const datesInRange = getDatesInRange(selection.start, selection.end);
            datesInRange.forEach((date) => {
                const key = formatDateKey(date);
                if (type !== 'clear') {
                    updated[key] = type;
                } else {
                    delete updated[key];
                }
            });
        } else {
            const key = formatDateKey(selection.start);
            if (type !== 'clear') {
                updated[key] = type;
            } else {
                delete updated[key];
            }
        }
        console.log(selection)

        setTaggedDates(updated);
        console.log('inside calendar:', customTypeOfDriver)
        console.log('updated', updated)
        console.log(setCustomTypeOfDriver)
        setCustomTypeOfDriver(updated);
        setSelection({ start: null, end: null });
        setCalendarOpen(true)
    };

    const isWithinRange = (date, start, end) => {
        const d = new Date(date).setHours(0, 0, 0, 0);
        const s = new Date(start).setHours(0, 0, 0, 0);
        const e = new Date(end).setHours(0, 0, 0, 0);
        return d > s && d < e;
    };

    const getTileClassName = (date) => {
        const key = formatDateKey(date);
        const startKey = selection.start ? formatDateKey(selection.start) : null;
        const endKey = selection.end ? formatDateKey(selection.end) : null;

        if (key === startKey) return 'selected-start';
        if (key === endKey) return 'selected-end';
        if (selection.start && selection.end && isWithinRange(date, selection.start, selection.end))
            return 'selected-range';

        if (taggedDates[key] === 'Own Vehicle') return 'own-vehicle';
        if (taggedDates[key] === 'Company Vehicle') return 'company-vehicle';

        if (taggedRanges.length < 1) {
            if (typeOfDriver === 'Own Vehicle') return 'default-own-vehicle';
            if (typeOfDriver === 'Company Vehicle') return 'default-company-vehicle';
        } else if (taggedRanges.length === 1) {
            if (date < taggedRanges[0]?.startDate) {
                return taggedRanges[0]?.type === 'Own Vehicle' ? 'default-own-vehicle' : 'default-company-vehicle';
            } else {
                return taggedRanges[0]?.type === 'Own Vehicle' ? 'default-own-vehicle' : 'default-company-vehicle';
            }
        } else {
            for (const { type, startDate, endDate } of taggedRanges) {
                if (date >= startDate && (!endDate || date < endDate)) {
                    return type === 'Own Vehicle' ? 'default-own-vehicle' : 'default-company-vehicle';
                }
            }
        }
        return '';
    };

    return (
        <div className="vehicletype-cal relative space-y-4 flex justify-center mt-8.5">
            <button
                className={`relative w-full flex items-center gap-1 px-2 pl-12.5 py-3.5 h-fit rounded-lg border-[1.5px] border-neutral-300 bg-white hover:bg-gray-50 ${calendarOpen && 'border-primary-500'}`}
                onClick={() => setCalendarOpen(prev => !prev)}
            >
                <i class="absolute top-4 left-4 text-neutral-300 fi fi-rr-truck-box"></i>
                Set Custom Vehicle Type
            </button>

            {calendarOpen && (
                <div className='absolute top-10 left-1 z-2 !bg-white w-fit rounded-lg border-[1.5px] border-neutral-300'>

                    <Flatpickr
                        key={JSON.stringify(taggedDates)} // <-- add this line
                        ref={flatpickrRef}
                        options={{
                            mode: 'range',
                            dateFormat: 'Y-m-d',
                            inline: true,
                            onDayCreate: (dObj, dStr, fp, dayElem) => {
                                const date = new Date(dayElem.dateObj);
                                const className = getTileClassName(date);
                                if (className) {
                                    dayElem.className += ` ${className}`;
                                }
                            },
                        }}
                        onChange={handleDateSelect}
                    />


                    <div className="grid grid-cols-[6fr_7fr] gap-1 w-78 p-2">
                        <button
                            className="flex text-[0.7rem] items-center gap-1 px-2 py-1 rounded-md border border-gray-300 bg-white shadow"
                            type="button"
                            onClick={() => tagRange('Own Vehicle')}
                        >
                            <div className="w-3 h-3 rounded-full bg-green-300"></div>
                            Tag as Own Vehicle
                        </button>
                        <button
                            className="flex text-[0.7rem] items-center gap-1 px-2 py-1 rounded-md border border-gray-300 bg-white shadow"
                            type="button"
                            onClick={() => tagRange('Company Vehicle')}
                        >
                            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                            Tag as Company Vehicle
                        </button>
                        <button
                            className="col-span-2 text-xs px-2 py-1 rounded-md bg-red-500 text-white"
                            type="button"
                            onClick={() => tagRange('clear')}
                        >
                            Clear
                        </button>

                    </div>
                </div>)}
        </div>
    );
};

export default VehicleTypeCal;
