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
import { MultiGrid, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css";
import { debounce } from 'lodash'; // or import from './utils/debounce';

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
    const [loading, setLoading] = useState(false)

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList }
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList }

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

    const prevDriversList = useRef(driversList);

    useEffect(() => {
        const fetchSchedules = async () => {
            if (driversList.length === 0 || !rangeOptions) return;

            // let loadingTimeout = setTimeout(() => setLoading(true), 350);
            let loadingTimeout;
            const shouldLoad =
                !cacheRangeOption ||
                !Object.keys(cacheRangeOption).includes(selectedRangeIndex) ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === Object.keys(cacheRangeOption).length - 1;

            if (shouldLoad) {
                loadingTimeout = setTimeout(() => setLoading(true), 350);
            }

            try {
                const rangeOptionsVal = Object.values(rangeOptions);
                const response = await axios.get(`${API_BASE_URL}/api/schedule/filter1`, {
                    params: {
                        driverId: driversList.map((driver) => driver._id),
                        startDay: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                        endDay: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                    },
                });

                clearTimeout(loadingTimeout);
                setSchedules(response.data);
                setCacheRangeOption(rangeOptions);
            } catch (error) {
                clearTimeout(loadingTimeout);
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        // Check if driversList has changed by comparing with previous value
        const driversListChanged = JSON.stringify(driversList) !== JSON.stringify(prevDriversList.current);
        prevDriversList.current = driversList;

        const debouncedFetchSchedules = debounce(fetchSchedules, 20);
        // Check if rangeOptions change requires a fetch
        // const shouldFetchRange =
        //     !cacheRangeOption ||
        //     !Object.keys(cacheRangeOption).includes(selectedRangeIndex) ||
        //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
        //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === Object.keys(cacheRangeOption).length - 1;

        // Fetch if driversList changed or rangeOptions change requires it

        debouncedFetchSchedules();
        return () => debouncedFetchSchedules.cancel(); // Cleanup on unmount
    }, [rangeOptions, driversList]);

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
                day: new Date(addScheduleData.date).toUTCString(),
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

    const tableData = (driver, day, disabledDriver, standbyDriver) => {

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
                    <div className="relative max-w-40">
                        <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 border-l-4 ${borderColor} rounded-md text-sm p-2 transition-all duration-300 ${scheduleBelongtoSite ? 'group-hover:w-[82%]' : ''}`}>
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

        const dateObj = new Date(day.date);
        const dateKey = dateObj.toLocaleDateString('en-UK');
        const key = `${dateKey}_${driver._id}`;

        const schedule = scheduleMap[key];
        const standbySchedule = standbydrivers.find((s) => new Date(s.day).getTime() === dateObj.getTime() && s.driverId === driver._id);

        const streak = streaks[driver._id]?.[dateKey] || 0;
        const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";

        const scheduleBelongtoSite = schedule?.site === selectedSite;

        let content = null;

        if (loading) {
            content = <div className='h-full w-full rounded-md bg-gray-200 animate-pulse'></div>
        }
        else if (standbyDriver) {
            if (standbySchedule && schedule) {
                content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
            }
            if (standbySchedule && !schedule) {
                if (continuousSchedule < 3) {
                    const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
                    content = (
                        <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                            <div className="w-full text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
                                {label}
                            </div>
                        </div>
                    );
                }
                else {
                    content = <div className='flex  border-[1.5px] border-neutral-200 h-full w-full rounded-md max-w-40'>{renderClickableCell(driver, day, standbyDriver)}</div>
                }
            }
            else if (disabledDriver) {
                content = renderPlaceholder();
            }
        } else if (standbySchedule && schedule) {
            content = renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
        } else if (Object.keys(scheduleMap).length > 0 && standbySchedule && !schedule) {
            content = renderStandbyCell(driver, dateObj);
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
        } else if (disabledDriver) {
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


        return (
            <div className={`h-full w-full `} >
                {content}
            </div>
        );
    };


    return (
        <>
            < TableStructure title={'Schedule Planner'} state={state} setters={setters} tableData={tableData} />
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