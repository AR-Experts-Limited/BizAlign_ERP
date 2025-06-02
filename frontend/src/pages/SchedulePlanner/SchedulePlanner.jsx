import React, { useState, useEffect, useMemo } from 'react';
import TableStructure from '../../components/TableStructure/TableStructure';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import moment from 'moment';
import axios from 'axios';
import { FaTrashAlt } from "react-icons/fa";
import { IoIosAddCircle, IoIosAddCircleOutline } from "react-icons/io";
import { RiCheckDoubleLine } from "react-icons/ri";
const API_BASE_URL = import.meta.env.VITE_API_URL;


const SchedulePlanner = () => {
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState();

    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [standbydriversList, setStandbydriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')
    const [days, setDays] = useState([])

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList }
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList }

    const [schedules, setSchedules] = useState([])
    const [scheduleMap, setScheduleMap] = useState({});

    const [cacheRangeOption, setCacheRangeOption] = useState(null)
    const [prevRangeType, setPrevRangeType] = useState(rangeType)


    useEffect(() => {
        // console.log('rangeOption:', rangeOptions)
        // console.log('selectedRangeIndexFromLiveOps', selectedRangeIndex)
        // console.log('cacheOption', cacheRangeOption)
        if (driversList.length > 0 && rangeOptions) {
            const rangeOptionsVal = Object.values(rangeOptions)
            const fetchSchedules = async () => {
                const response = await axios.get(`${API_BASE_URL}/api/schedule/filter1`, {
                    params: {
                        driverId: driversList.map((driver) => driver._id),
                        startDay: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                        endDay: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                    },
                });
                setSchedules(response.data)
            }

            if (!cacheRangeOption) {
                fetchSchedules()
                setCacheRangeOption(rangeOptions)
            }
            else if (!(Object.keys(cacheRangeOption).find((i) => i === selectedRangeIndex)) || Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 || Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)) {
                fetchSchedules()
                setCacheRangeOption(rangeOptions)
            }

        }

    }, [rangeOptions, driversList])


    useEffect(() => {
        let map = {}
        schedules.forEach(sch => {
            const dateKey = new Date(sch.day).toLocaleDateString('en-UK'); // normalize date
            const key = `${dateKey}_${sch.driverId}`;
            map[key] = sch;
        });
        setScheduleMap(map)
    }, [schedules])

    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions)
            setPrevRangeType(rangeType)
        }
    }, [rangeOptions])


    // Pre-calculate all streaks and continuous schedule statuses
    const { streaks, continuousStatus } = useMemo(() => {
        if (driversList.length === 0 || schedules.length === 0) {
            return { streaks: {}, continuousStatus: {} };
        }

        const streaks = calculateAllWorkStreaks(driversList, schedules);
        const continuousStatus = checkAllContinuousSchedules(driversList, schedules);

        return { streaks, continuousStatus };
    }, [driversList, schedules]);

    const tableData = (driver) => {
        return days.map((day) => {
            const dateKey = new Date(day.date).toLocaleDateString('en-UK');
            const key = `${dateKey}_${driver._id}`;
            const schedule = scheduleMap[key];
            const streak = streaks[driver._id]?.[dateKey] || 0;
            const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";

            return (

                <td key={day.date} className={`${new Date(day.date).toDateString() === new Date().toDateString() ? 'bg-amber-100/30' : ''}`} >
                    {(() => {
                        if (schedule) {
                            return (
                                <div className={`relative flex justify-center h-full w-full group`}>
                                    <div className='relative max-w-40'>
                                        <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4  dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 ${streak < 3 ? ' border-l-4 border-l-green-500/60 dark:border-l-green-500/60' : streak < 5 ? 'border-l-4 border-l-yellow-500/60' : 'border-l-4 border-l-red-400'} rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
                                            <div className='overflow-auto max-h-[4rem]'>{schedule.service}</div>
                                            <div className='h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-1 '>
                                                <RiCheckDoubleLine className={`${schedule.acknowledged ? 'text-green-400' : ''}`} size={18} />
                                            </div>
                                        </div>
                                        {/* Delete button - always present but hidden until hover or mobile tap */}
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSchedule(schedule._id);
                                            }}
                                            className={`absolute z-1 right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white p-2 pl-2.5 rounded-r-md inset-shadow-md hover:bg-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 cursor-pointer`}
                                        >
                                            <FaTrashAlt size={14} />
                                        </div>
                                    </div>
                                </div>)
                        }

                        else if (continuousSchedule < 3) {
                            return (
                                <div class="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                    <div className='text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md'>{parseInt(continuousSchedule) === 1 ? 'Unavailable' : 'Day-off'}</div>
                                </div>)
                        }
                        else {
                            return (
                                <div onClick={() => setAddScheduleData({ driver, date: day.date, week: day.week, error: false })} className='cursor-pointer flex h-full w-full justify-center items-center'>
                                    <div className='h-full w-40 rounded-md max-w-40 hover:bg-stone-100'>

                                    </div>
                                    {/* <div className={`z-4 flex justify-center ${!standbydrivers.some((standbyschedule) => new Date(standbyschedule.day).getTime() == new Date(day.date).getTime() && standbyschedule.driverId === driver._id) ? 'block' : 'hidden'}`} onClick={() => setAddScheduleData({ driver, date: day.date, week: day.week, error: false })}>
                                                            <IoIosAddCircle className='text-green-500 transition-[scale] cursor-pointer duration-200 hover:scale-125' size={22} />
                                                        </div>
                                                        <div className='z-5 relative cursor-pointer' onClick={() => handleStandbyToggle(driver, day.date)}>
                                                            <input
                                                                type="checkbox"
                                                                checked={standbydrivers.some((standbyschedule) => new Date(standbyschedule.day).getTime() == new Date(day.date).getTime() && standbyschedule.driverId === driver._id)}
                                                                onChange={() => handleStandbyToggle(driver, day.date)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="h-6 w-11 peer-checked:bg-amber-600/40  transition-[colors] origin-left rounded-full bg-gray-3  dark:bg-amber" />
                                                            <div className={cn("absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-white shadow-switch-1 transition-all duration-200 peer-checked:translate-x-5 peer-checked:[&_.check-icon]:block peer-checked:[&_.uncheck-icon]:hidden  shadow-switch-2")}>
                                                                <IoMoonOutline className='uncheck-icon text-amber-600' size={11} />
                                                                <IoMoon className='check-icon hidden text-amber-600' size={11} />
                                                            </div>
                                                        </div> */}
                                </div>)
                        }

                    })()}
                </td>
            )
        })
    }

    return (

        < TableStructure title={'Schedule Planner'} state={state} setters={setters} tableData={tableData} />
    );
};

export default SchedulePlanner;