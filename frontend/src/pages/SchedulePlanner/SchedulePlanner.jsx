import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { NavLink } from "react-router-dom";
import TableStructure from '../../components/TableStructure/TableStructure';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import moment from 'moment';
import axios from 'axios';
import { FaTrashAlt } from "react-icons/fa";
import { IoIosAddCircle, IoIosAddCircleOutline } from "react-icons/io";
import { RiCheckDoubleLine } from "react-icons/ri";
import Modal from '../../components/Modal/Modal'
import { fetchServices } from '../../features/services/serviceSlice';
import { addSchedule, deleteSchedule } from '../../features/schedules/scheduleSlice';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { addStandbyDriver, deleteStandbyDriver, fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import InputGroup from '../../components/InputGroup/InputGroup'
import InputWrapper from '../../components/InputGroup/InputWrapper';
import { IoMoonOutline, IoMoon } from "react-icons/io5";
import { RiZzzFill } from "react-icons/ri";
import { cn } from '../../lib/utils'
import { FixedSizeGrid } from 'react-window';

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Helper function to find rate card
 */
const rateCardFinder = (date, ratecards, week, service, driver) => {
    return ratecards.find(
        (rc) =>
            rc.serviceWeek === week &&
            rc.serviceTitle === service &&
            rc.vehicleType === getDriverTypeForDate(driver, date) && rc.active
    );
};

const getDriverTypeForDate = (driver, date) => {

    const dateKey = new Date(date).toLocaleDateString('en-UK');

    // 1. Custom override
    if (driver?.customTypeOfDriver?.[dateKey]) {
        return driver.customTypeOfDriver[dateKey];
    }

    const traces = driver?.typeOfDriverTrace || [];
    if (traces.length === 0) {
        return driver?.typeOfDriver;
    }

    const parseTraceDate = (ts) => {
        const [day, month, year] = ts.split('/');
        return new Date(`${year}-${month}-${day}`).setHours(0, 0, 0, 0);
    };

    const targetDate = new Date(date);
    let latestTrace = null;
    for (const trace of traces) {
        const changeDate = parseTraceDate(trace.timestamp);
        if (changeDate <= targetDate) {
            if (
                !latestTrace ||
                changeDate > parseTraceDate(latestTrace.timestamp)
            ) {
                latestTrace = trace;
            }
        }
    }

    if (latestTrace) {
        return latestTrace.to;
    }

    // If no change has occurred yet, return the 'from' type of the first trace
    const firstTrace = traces
        .slice()
        .sort((a, b) => parseTraceDate(a.timestamp) - parseTraceDate(b.timestamp))[0];

    if (targetDate < parseTraceDate(firstTrace.timestamp)) {
        return firstTrace.from;
    }

    // Fallback
    return driver?.typeOfDriver;
};

const SchedulePlanner = () => {
    const dispatch = useDispatch();
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState();

    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [standbydriversList, setStandbydriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')
    const [days, setDays] = useState([])
    const [isFilterOpen, setIsFilterOpen] = useState(true)
    const [loading, setLoading] = useState(false)

    const state = { isFilterOpen, rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList }
    const setters = { setIsFilterOpen, setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList }

    const [schedules, setSchedules] = useState([])
    const [scheduleMap, setScheduleMap] = useState({});

    const [cacheRangeOption, setCacheRangeOption] = useState(null)
    const [prevRangeType, setPrevRangeType] = useState(rangeType)

    const [addScheduleData, setAddScheduleData] = useState(null)
    const { events, connected } = useSelector((state) => state.sse);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);

    useEffect(() => {
        if (events && (events.type === "scheduleAdded")) {
            console.log("Schedule Updated ! Refetching...");
            const addedSchedule = events.data;

            setSchedules(prev => [...prev, addedSchedule])

        }

        if (events && (events.type === "scheduleDeleted")) {
            console.log("Schedule Deleted ! Refetching...");
            const deletedSchedule = events.data;

            setSchedules(prev => prev.filter((item) => item._id !== deletedSchedule._id))

        }
    }, [events]);

    useEffect(() => {
        if (serviceStatus === 'idle') dispatch(fetchServices());
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());

    }, [serviceStatus, standbyDriverStatus, dispatch]);

    useEffect(() => {
        const fetchSchedules = async () => {
            if (driversList.length > 0 && rangeOptions) {
                const rangeOptionsVal = Object.values(rangeOptions)
                const fetchSchedules = async () => {
                    let loadingTimeout = setTimeout(() => setLoading(true), 250);

                    try {
                        const response = await axios.get(`${API_BASE_URL}/api/schedule/filter1`, {
                            params: {
                                driverId: driversList.map((driver) => driver._id),
                                startDay: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                                endDay: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                            },
                        });

                        clearTimeout(loadingTimeout); // cancel the delayed loader
                        setSchedules(response.data);
                    } catch (error) {
                        clearTimeout(loadingTimeout);
                        console.error(error);
                    } finally {
                        setLoading(false);
                    }
                };

                if (!cacheRangeOption) {
                    fetchSchedules()
                    setCacheRangeOption(rangeOptions)
                }
                else if (!(Object.keys(cacheRangeOption).find((i) => i === selectedRangeIndex)) || Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 || Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)) {
                    fetchSchedules()
                    setCacheRangeOption(rangeOptions)
                }

            }
        }
        fetchSchedules()
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

        const sortedSchedules = [...schedules].sort((a, b) => new Date(a.day) - new Date(b.day));
        const streaks = calculateAllWorkStreaks(driversList, sortedSchedules);
        const continuousStatus = checkAllContinuousSchedules(driversList, schedules, days.map((day) => day.date));

        return { streaks, continuousStatus };
    }, [driversList, schedules, days]);


    const handleAddSchedule = async () => {
        try {
            const newSchedule = await dispatch(addSchedule({
                driverId: addScheduleData.driver._id,
                day: addScheduleData.date,
                service: addScheduleData.service,
                user_ID: addScheduleData.driver.user_ID,
                associatedRateCard: addScheduleData.associatedRateCard,
                week: addScheduleData.week,
                site: selectedSite,
                acknowledged: false,
            })).unwrap();
            if (!connected) setSchedules(prev => [...prev, newSchedule])
            setAddScheduleData(null)
        }
        catch (err) {
            alert('Schedule exist for selected driver and date')
        }
    }

    const handleDeleteSchedule = async (id) => {
        await axios.delete(`${API_BASE_URL}/api/schedule/${id}`);
        if (!connected) setSchedules(prev => prev.filter((item) => item._id !== id))
    }

    const handleStandbyToggle = async (driver, date) => {
        const existingData = standbydrivers.find((standbyschedule) => new Date(standbyschedule.day).getTime() == new Date(date).getTime() && standbyschedule.driverId === driver._id)

        if (existingData) {
            dispatch(deleteStandbyDriver({ driverId: driver._id, day: new Date(date), _id: existingData._id }))
        }
        else {
            dispatch(addStandbyDriver(
                {
                    firstName: driver.firstName,
                    lastName: driver.lastName,
                    driverId: driver._id,
                    day: date,
                    site: selectedSite,
                }))
        }
    }

    const getBorderColor = (streak) => {
        if (streak < 3) return 'border-l-green-500/60';
        if (streak < 5) return 'border-l-yellow-500/60';
        return 'border-l-red-400';
    };

    const renderDeleteButton = (onClick) => (
        <div
            onClick={onClick}
            className="absolute z-1 right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white p-2 pl-2.5 rounded-r-md inset-shadow-md hover:bg-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 cursor-pointer"
        >
            <FaTrashAlt size={14} />
        </div>
    );

    const renderScheduleBox = ({ schedule, scheduleBelongtoSite, streak, showSite = true }) => {
        const borderColor = getBorderColor(streak);
        return (
            <div className="relative flex justify-center h-full w-full group">
                <div className="relative">
                    <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 border-l-4 ${borderColor} rounded-md text-sm p-2 transition-all duration-300 ${scheduleBelongtoSite ? 'group-hover:w-[84%]' : ''}`}>
                        <div className="overflow-auto max-h-[6rem]">
                            {schedule.service} {showSite && !scheduleBelongtoSite ? <span className='bg-amber-400/40 rounded text-amber-800 text-[0.7rem] py-0.5 px-1'>{schedule.site}</span> : ''}
                        </div>
                        {scheduleBelongtoSite && <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-1">
                            <RiCheckDoubleLine className={schedule.acknowledged ? 'text-green-400' : ''} size={18} />
                        </div>}
                    </div>
                    {renderDeleteButton((e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule._id);
                    })}
                </div>
            </div>
        );
    };

    const renderStandbyCell = (driver, dateObj) => (
        <div className="relative flex justify-center h-full w-full group">
            <div className="relative max-w-40 w-full">
                <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-amber-100 dark:border-dark-5 rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%] bg-[repeating-linear-gradient(-45deg,#ffb9008f_0px,#ffb9008f_2px,transparent_2px,transparent_6px)]">
                    <div className="overflow-auto max-h-[4rem] bg-amber-400/50 rounded-md px-2 py-1 text-amber-700">On Stand-By</div>
                </div>
                {renderDeleteButton((e) => {
                    e.stopPropagation();
                    handleStandbyToggle(driver, dateObj);
                })}
            </div>
        </div>
    );

    const renderPlaceholder = () => (
        <div className="w-full h-full flex items-center justify-center text-stone-400">
            <div className="w-full h-full rounded-md border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]" />
        </div>
    );

    const renderClickableCell = (driver, day, standbyDriver) => (
        <div
            onClick={() =>
                setAddScheduleData({
                    driver,
                    date: day.date,
                    week: day.week,
                    error: false,
                    ...(standbyDriver && { standbyDriver })
                })
            }
            className="cursor-pointer flex h-full w-full justify-center items-center"
        >
            <div className="group flex justify-center items-center h-full w-40 rounded-md max-w-40 hover:bg-stone-100">
                <div className='group-hover:block hidden text-xs bg-gray-50 px-2 py-[0.1rem] border border-neutral-200 rounded'>
                    {getDriverTypeForDate(driver, day.date)}
                </div>
            </div>
        </div>
    );

    // const tableData = (driver, disabledDriver, standbyDriver) => {

    //     const getBorderColor = (streak) => {
    //         if (streak < 3) return 'border-l-green-500/60';
    //         if (streak < 5) return 'border-l-yellow-500/60';
    //         return 'border-l-red-400';
    //     };

    //     const renderDeleteButton = (onClick) => (
    //         <div
    //             onClick={onClick}
    //             className="absolute z-1 right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white p-2 pl-2.5 rounded-r-md inset-shadow-md hover:bg-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 cursor-pointer"
    //         >
    //             <FaTrashAlt size={14} />
    //         </div>
    //     );

    //     const renderScheduleBox = ({ schedule, scheduleBelongtoSite, streak, showSite = true }) => {
    //         const borderColor = getBorderColor(streak);
    //         return (
    //             <div className="relative flex justify-center h-full w-full group">
    //                 <div className="relative">
    //                     <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 border-l-4 ${borderColor} rounded-md text-sm p-2 transition-all duration-300 ${scheduleBelongtoSite ? 'group-hover:w-[82%]' : ''}`}>
    //                         <div className="overflow-auto max-h-[6rem]">
    //                             {schedule.service} {showSite && !scheduleBelongtoSite ? <span className='bg-amber-400/40 rounded text-amber-800 text-[0.7rem] py-0.5 px-1'>{schedule.site}</span> : ''}
    //                         </div>
    //                         {scheduleBelongtoSite && <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-1">
    //                             <RiCheckDoubleLine className={schedule.acknowledged ? 'text-green-400' : ''} size={18} />
    //                         </div>}
    //                     </div>
    //                     {renderDeleteButton((e) => {
    //                         e.stopPropagation();
    //                         handleDeleteSchedule(schedule._id);
    //                     })}
    //                 </div>
    //             </div>
    //         );
    //     };

    //     const renderStandbyCell = (driver, dateObj) => (
    //         <div className="relative flex justify-center h-full w-full group">
    //             <div className="relative max-w-40 w-full">
    //                 <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-amber-100 dark:border-dark-5 rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%] bg-[repeating-linear-gradient(-45deg,#ffb9008f_0px,#ffb9008f_2px,transparent_2px,transparent_6px)]">
    //                     <div className="overflow-auto max-h-[4rem] bg-amber-400/50 rounded-md px-2 py-1 text-amber-700">On Stand-By</div>
    //                 </div>
    //                 {renderDeleteButton((e) => {
    //                     e.stopPropagation();
    //                     handleStandbyToggle(driver, dateObj);
    //                 })}
    //             </div>
    //         </div>
    //     );

    //     const renderPlaceholder = () => (
    //         <div className="w-full h-full flex items-center justify-center text-stone-400">
    //             <div className="w-full h-full rounded-md border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]" />
    //         </div>
    //     );

    //     const renderClickableCell = (driver, day, standbyDriver) => (
    //         <div
    //             onClick={() =>
    //                 setAddScheduleData({
    //                     driver,
    //                     date: day.date,
    //                     week: day.week,
    //                     error: false,
    //                     ...(standbyDriver && { standbyDriver })
    //                 })
    //             }
    //             className="cursor-pointer flex h-full w-full justify-center items-center"
    //         >
    //             <div className="group flex justify-center items-center h-full w-40 rounded-md max-w-40 hover:bg-stone-100">
    //                 <div className='group-hover:block hidden text-xs bg-gray-50 px-2 py-[0.1rem] border border-neutral-200 rounded'>
    //                     {getDriverTypeForDate(driver, day.date)}
    //                 </div>
    //             </div>
    //         </div>
    //     );
    //     return days.map((day) => {
    //         const dateObj = new Date(day.date);
    //         const dateKey = dateObj.toLocaleDateString('en-UK');
    //         const key = `${dateKey}_${driver._id}`;

    //         const schedule = scheduleMap[key];
    //         const standbySchedule = standbydrivers.find((s) => new Date(s.day).getTime() === dateObj.getTime() && s.driverId === driver._id);

    //         const streak = streaks[driver._id]?.[dateKey] || 0;
    //         const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";
    //         const isToday = dateObj.toDateString() === new Date().toDateString();
    //         const cellClass = isToday ? 'bg-amber-100/30 relative' : 'relative';

    //         const scheduleBelongtoSite = schedule?.site === selectedSite;

    //         let content = null;


    //         if (standbyDriver) {
    //             if (disabledDriver) {
    //                 content = renderPlaceholder();
    //             }
    //             else if (standbySchedule && !schedule) {
    //                 if (continuousSchedule < 3) {
    //                     const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
    //                     content = (
    //                         <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
    //                             <div className="text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
    //                                 {label}
    //                             </div>
    //                         </div>
    //                     );
    //                 }
    //                 else {
    //                     content = <div className='flex  border-[1.5px] border-neutral-200 h-full w-full rounded-md max-w-40'>{renderClickableCell(driver, day, standbyDriver)}</div>
    //                 }
    //             } else if (standbySchedule && schedule) {
    //                 content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
    //             }
    //         } else if (Object.keys(scheduleMap).length > 0 && standbySchedule && !schedule) {
    //             content = renderStandbyCell(driver, dateObj);
    //         } else if (standbySchedule && schedule) {
    //             content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
    //         } else if (schedule?.service === 'Voluntary-Day-off') {
    //             content = (
    //                 <div className="relative flex justify-center h-full w-full group">
    //                     <div className="relative max-w-40">
    //                         <div className="relative z-6 w-full h-full flex items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 px-4 transition-all duration-300 group-hover:w-[82%] bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
    //                             <div className="overflow-auto max-h-[4rem]">{schedule.service}</div>
    //                         </div>
    //                         {renderDeleteButton((e) => {
    //                             e.stopPropagation();
    //                             handleDeleteSchedule(schedule._id);
    //                         })}
    //                     </div>
    //                 </div>
    //             );
    //         } else if (schedule) {
    //             content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
    //         } else if (disabledDriver) {
    //             content = renderPlaceholder();
    //         } else if (continuousSchedule < 3) {
    //             const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
    //             content = (
    //                 <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
    //                     <div className="text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
    //                         {label}
    //                     </div>
    //                 </div>
    //             );
    //         } else {
    //             content = renderClickableCell(driver, day);
    //         }

    //         return (
    //             <div>
    //                 {content}
    //             </div>
    //         );
    //     });
    // };

    const GridComponent = () => {
        const columnCount = days.length + 1;
        const rowCount = driversList.length;
        const columnWidth = rangeType === 'daily' ? 679 : 200;
        const rowHeight = 119;

        const [scrollLeft, setScrollLeft] = useState(0);
        const [scrollTop, setScrollTop] = useState(0);

        const onScroll = ({ scrollLeft, scrollTop }) => {
            setScrollLeft(scrollLeft);
            setScrollTop(scrollTop);
        };

        const containerRef = useRef(null);
        const [gridWidth, setGridWidth] = useState(0);
        const [gridHeight, setGridHeight] = useState(0);

        useEffect(() => {
            const updateDimensions = () => {
                if (containerRef.current) {
                    setGridWidth(containerRef.current.offsetWidth);
                    setGridHeight(containerRef.current.offsetHeight); // Track height too
                }
            };

            updateDimensions(); // Set initially

            window.addEventListener('resize', updateDimensions);
            return () => window.removeEventListener('resize', updateDimensions);
        }, []);

        const Cell = ({ columnIndex, rowIndex, style }) => {
            if (columnIndex === 0) {
                return (
                    <div>
                    </div>
                )
            }
            const day = days[columnIndex - 1]
            const driver = driversList[rowIndex]
            const dateObj = new Date(day.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${driver._id}`;
            const disableDriver = driver.activeStatus != 'Active' ? driver.activeStatus : null
            const standbydriver = standbydriversList.some((sdriver) => sdriver._id == driver._id)

            const schedule = scheduleMap[key];


            const standbySchedule = standbydrivers.find((s) => new Date(s.day).getTime() === dateObj.getTime() && s.driverId === driver._id);

            const streak = streaks[driver._id]?.[dateKey] || 0;
            const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";
            const isToday = dateObj.toDateString() === new Date().toDateString();
            const cellClass = isToday ? 'bg-amber-100/30 relative' : 'relative';

            const scheduleBelongtoSite = schedule?.site === selectedSite;

            let content = null;
            if (loading) {
                content = <div className="w-full h-full bg-gray-200 rounded-md animate-pulse"></div>

            }

            else if (standbydriver) {
                if (disableDriver) {
                    content = renderPlaceholder();
                }
                else if (standbySchedule && !schedule) {
                    if (continuousSchedule < 3) {
                        const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
                        content = (
                            <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                <div className="text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
                                    {label}
                                </div>
                            </div>
                        );
                    }
                    else {
                        content = <div className='flex  border-[1.5px] border-neutral-200 h-full w-full rounded-md max-w-40'>{renderClickableCell(driver, day, standbydriver)}</div>
                    }
                } else if (standbySchedule && schedule) {
                    content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
                }
            } else if (Object.keys(scheduleMap).length > 0 && standbySchedule && !schedule) {
                content = renderStandbyCell(driver, dateObj);
            } else if (standbySchedule && schedule) {
                content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
            } else if (schedule?.service === 'Voluntary-Day-off') {
                content = (
                    <div className="relative flex justify-center h-full w-full group">
                        <div className="relative max-w-40">
                            <div className="relative z-6 w-full h-full flex items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 px-4 transition-all duration-300 group-hover:w-[82%] bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                <div className="overflow-auto max-h-[4rem]">{schedule.service}</div>
                            </div>
                            {renderDeleteButton((e) => {
                                e.stopPropagation();
                                handleDeleteSchedule(schedule._id);
                            })}
                        </div>
                    </div>
                );
            } else if (schedule) {
                content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
            } else if (disableDriver) {
                content = renderPlaceholder();
            } else if (continuousSchedule < 3) {
                const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
                content = (
                    <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                        <div className="text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
                            {label}
                        </div>
                    </div>
                );
            } else {
                content = renderClickableCell(driver, day);
            }
            return (<div
                className="flex items-center justify-center border-r border-b border-gray-200 bg-white p-4"
                style={{ ...style, cellClass }}
            >
                {content}
            </div>)
        };

        const HeaderRow = () => (
            <div
                className="sticky top-0 z-20 bg-gray-100 flex"
                style={{ marginLeft: columnWidth - scrollLeft }}
            >
                {days.map((day, index) => {
                    const columnIndex = index;
                    return (
                        <div
                            key={columnIndex}
                            className="flex flex-col items-center justify-center border-r border-primary-500 bg-primary-800 text-white font-normal text-sm p-8"
                            style={{ width: columnWidth, height: '3rem', flexShrink: 0 }}
                        >
                            {day.date}
                            {
                                rangeType === 'biweekly' && <div className='font-medium text-gray-600 w-fit px-1 py-0.5 text-[0.55rem] bg-stone-100 rounded-sm'>
                                    {day.week}
                                </div>
                            }
                        </div>
                    );
                })}
            </div>
        );

        const FirstColumn = () => (
            <div
                className="sticky left-0 z-10 "
                style={{ marginTop: rowHeight - 55 - scrollTop }}
            >
                {driversList.map((driver, index) => {
                    const rowIndex = index + 1;
                    const disableDriver = driver.activeStatus != 'Active' ? driver.activeStatus : null
                    const standbydriver = standbydriversList.some((sdriver) => sdriver._id == driver._id)
                    return (
                        <div
                            key={rowIndex}
                            className="flex flex-col items-left bg-white justify-center gap-1 border-b border-r border-neutral-200 text-sm w-full p-4 "
                            style={{ width: columnWidth, height: rowHeight }}
                        >
                            <div className='w-full'><p >{driver.firstName + ' ' + driver.lastName}</p></div>
                            {disableDriver && <div className='text-xs text-center text-stone-600 bg-stone-400/40 shadow-sm border-[1.5px] border-stone-400/10 p-0.5 rounded-sm w-fit'>{disableDriver}</div>}
                            {standbydriver && <div className='text-left bg-amber-200 text-amber-700 rounded-md p-1 text-xs w-fit'>Stand by driver from {driver.siteSelection}</div>}
                        </div>
                    );
                })
                }
            </div >
        );

        const TopLeftCell = () => (
            <div
                className="sticky top-0 left-0 z-30  flex items-center justify-center bg-primary-800 border-r border-primary-500  text-white font-bold text-sm "
                style={{ width: columnWidth, height: '4rem' }}
            >
                Personnels List
            </div>
        );

        return (
            <div ref={containerRef}
                className="relative flex-1 w-full h-full border border-neutral-200 rounded-md overflow-hidden">
                {/* Top-Left Cell */}
                <TopLeftCell />

                {/* Header Row */}
                <div className="absolute top-0 left-0">
                    <HeaderRow />
                </div>

                {/* First Column */}
                <div className="absolute top-0 " style={{ maxHeight: gridHeight + (isFilterOpen ? 0 : 85), overflow: 'hidden' }}>
                    <FirstColumn />

                </div>

                {/* Grid */}
                <FixedSizeGrid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={gridHeight - (isFilterOpen ? 65 : -25)}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    width={gridWidth}
                    onScroll={onScroll}
                    className="z-0"
                >
                    {Cell}
                </FixedSizeGrid>


            </div >
        );
    };


    return (
        <>
            < TableStructure title={'Schedule Planner'} state={state} setters={setters} tableData={GridComponent} />
            <Modal isOpen={addScheduleData} >
                <div className='px-6 py-3 border-b border-neutral-300'><h1>Add Schedule</h1></div>
                <div className='p-6 md:w-[30rem] '>
                    <div className='flex-1 flex flex-col gap-3'>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Driver name:</span> {addScheduleData?.driver.firstName + ' ' + addScheduleData?.driver.lastName}</div>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Vehicle Type:</span>{getDriverTypeForDate(addScheduleData?.driver, addScheduleData?.date)}</div>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Date:</span> {addScheduleData?.date}</div>

                        <InputWrapper title={'Services with ratecard available'} >
                            <div className='flex gap-2 w-full'>
                                <InputGroup className='w-full' value={addScheduleData ? addScheduleData.service : ''}
                                    disabled={addScheduleData?.service === "Voluntary-Day-off"}
                                    type='dropdown' onChange={(e) => setAddScheduleData(prev => ({ ...prev, service: e.target.value }))}  >
                                    <option value=''>-Select Service-</option>
                                    {services.map((service) => {
                                        if (rateCardFinder(
                                            addScheduleData?.date,
                                            ratecards,
                                            addScheduleData?.week,
                                            service.title,
                                            addScheduleData?.driver
                                        )) {
                                            return (
                                                <option key={service._id} value={service.title}>
                                                    {service.title}
                                                </option>
                                            );
                                        }
                                        return null;
                                    })}
                                </InputGroup>
                                <div className="relative group self-end mb-2">
                                    <NavLink
                                        to="/rate-card"
                                        className={'w-fit bg-red-200'}
                                    >
                                        <i class="flex items-center fi fi-rr-calculator p-2 text-[1.5rem] hover:bg-gray-300 rounded w-fit text-neutral-500"></i>
                                    </NavLink>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap transition duration-300">
                                        Redirect to Ratecard
                                    </span>
                                </div>
                            </div>
                        </InputWrapper>
                        {!addScheduleData?.standbyDriver && <div className='flex rounded-lg border-2 border-neutral-300'>
                            <div className='relative flex justify-center border-r border-neutral-300 p-4 w-full'>
                                <div className='flex absolute top-0 left-0 justify-center bg-gray-300/70 w-full text-sm '>Stand-by</div>

                                <div className='z-5 relative cursor-pointer mt-4'>
                                    <label htmlFor="standby" className="cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="standby"
                                            // checked={standbydrivers.some((standbyschedule) => new Date(standbyschedule.day).getTime() == new Date(addScheduleData?.date).getTime() && standbyschedule.driverId === addScheduleData?.driver._id)}
                                            checked={addScheduleData?.service === 'standby'}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setAddScheduleData(prev => ({ ...prev, service: 'standby' }));
                                                } else {
                                                    setAddScheduleData(prev => ({ ...prev, service: '' }));
                                                }
                                            }} className="peer sr-only"
                                        />
                                        <div className="h-6 w-11 peer-checked:bg-amber-600/40  transition-[colors] origin-left rounded-full bg-gray-3  dark:bg-amber" />
                                        <div className={cn("absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-white shadow-switch-1 transition-all duration-200 peer-checked:translate-x-5 peer-checked:[&_.check-icon]:block peer-checked:[&_.uncheck-icon]:hidden  shadow-switch-2")}>
                                            <IoMoonOutline className='uncheck-icon text-amber-600' size={11} />
                                            <IoMoon className='check-icon hidden text-amber-600' size={11} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className='relative flex flex-col justify-center items-center p-4 w-full'>
                                <div className='flex absolute top-0 left-0 justify-center bg-gray-300/70 w-full text-sm'>Day-off</div>
                                <div className='z-5 relative cursor-pointer mt-4'>
                                    <label htmlFor="voluntary-day-off" className="cursor-pointer">
                                        <input
                                            type="checkbox"
                                            id="voluntary-day-off" // Add an ID
                                            checked={addScheduleData?.service === "Voluntary-Day-off"}
                                            className="peer sr-only"
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    console.log('Checkbox checked:', e.target.checked);
                                                    setAddScheduleData(prev => ({ ...prev, service: 'Voluntary-Day-off' }));
                                                } else {
                                                    setAddScheduleData(prev => ({ ...prev, service: '' }));
                                                }
                                            }}
                                        />
                                        <div className="h-6 w-11 peer-checked:bg-sky-600/40  transition-[colors] origin-left rounded-full bg-gray-3  dark:bg-sky" />
                                        <div className={cn("absolute top-1 left-1 flex size-4 items-center justify-center rounded-full bg-white shadow-switch-1 transition-all duration-200 peer-checked:translate-x-5 peer-checked:[&_.check-icon]:block peer-checked:[&_.uncheck-icon]:hidden  shadow-switch-2")}>
                                            <RiZzzFill className='uncheck-icon text-sky-600' size={11} />
                                            <RiZzzFill className='check-icon hidden text-sky-600' size={11} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>}

                        {addScheduleData?.error && <div className='m-3 text-sm p-1 md:p-2 rounded-md bg-red-200 border border-red-400 text-red-400 flex justify-center items-center gap-3'><div className='text-xs font-bold p-2 flex justify-center items-center bg-red-500 h-3 w-3 text-white rounded-full'>!</div>Ratecard unavailable for selected service</div>}
                    </div>
                </div>
                <div className='border-t border-neutral-300 p-3 flex justify-evenly'>
                    <button onClick={() => {
                        if (addScheduleData?.service === 'standby') {
                            handleStandbyToggle(addScheduleData?.driver, addScheduleData?.date)
                            setAddScheduleData(null)
                        }
                        else {
                            handleAddSchedule()
                        }

                    }} disabled={addScheduleData?.error || !addScheduleData?.service} className='text-sm rounded-md border border-green-600 text-white bg-green-600 px-3 py-1 hover:bg-white hover:text-green-600 disabled:bg-stone-300 disabled:text-stone-200 disabled:border-stone-200 disabled:inset-shadow-sm disabled:hover:text-white' >Add</button>
                    <button className='text-sm rounded-md border border-red-600 text-white bg-red-600 px-3 py-1 hover:bg-white hover:text-red-600' onClick={() => setAddScheduleData(null)}>Cancel</button>
                </div>
            </Modal>
        </>
    );
};

export default SchedulePlanner;