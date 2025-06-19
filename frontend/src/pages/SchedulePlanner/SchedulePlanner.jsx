import React, { useState, useEffect, useMemo } from 'react';
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

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Helper function to find rate card
 */
const rateCardFinder = (ratecards, week, service, typeOfDriver) => {
    return ratecards.find(
        (rc) =>
            rc.serviceWeek === week &&
            rc.serviceTitle === service &&
            rc.vehicleType === typeOfDriver && rc.active
    );
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

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList }
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList }

    const [schedules, setSchedules] = useState([])
    const [scheduleMap, setScheduleMap] = useState({});

    const [cacheRangeOption, setCacheRangeOption] = useState(null)
    const [prevRangeType, setPrevRangeType] = useState(rangeType)

    const [addScheduleData, setAddScheduleData] = useState(null)
    const events = useSelector((state) => state.sse.events);
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

    useEffect(() => {
        if (addScheduleData?.service) {
            const foundRatecard = ratecards.find((ratecard) => ratecard.serviceWeek === addScheduleData?.week && ratecard.serviceTitle === addScheduleData?.service)
            if (!foundRatecard)
                setAddScheduleData(prev => ({ ...prev, error: true }))
            else
                setAddScheduleData(prev => ({ ...prev, associatedRateCard: foundRatecard._id, error: false }))
        }
    }, [addScheduleData?.service])


    const handleAddSchedule = async () => {
        const newSchedule = await dispatch(addSchedule({
            driverId: addScheduleData.driver._id,
            day: addScheduleData.date,
            service: addScheduleData.service,
            user_ID: addScheduleData.driver.user_ID,
            associatedRateCard: addScheduleData.associatedRateCard,
            week: addScheduleData.week,
            site: selectedSite,
            acknowledged: false,
        }))
        // setSchedules(prev => [...prev, newSchedule.payload])
        setAddScheduleData(null)
    }

    const handleDeleteSchedule = async (id) => {
        await axios.delete(`${API_BASE_URL}/api/schedule/${id}`);
        // setSchedules(prev => prev.filter((item) => item._id !== id))
    }

    const tableData = (driver, disabledDriver, standbyDriver) => {
        return days.map((day) => {
            const dateObj = new Date(day.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${driver._id}`;

            const schedule = scheduleMap[key];
            const streak = streaks[driver._id]?.[dateKey] || 0;
            const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";

            const isToday = dateObj.toDateString() === new Date().toDateString();
            const cellClass = isToday ? 'bg-amber-100/30 relative' : 'relative';

            return (
                <td key={day.date} className={cellClass}>
                    {(() => {
                        // Render scheduled cell
                        if (schedule) {
                            const borderColor =
                                streak < 3 ? 'border-l-green-500/60' :
                                    streak < 5 ? 'border-l-yellow-500/60' :
                                        'border-l-red-400';

                            return (
                                <div className="relative flex justify-center h-full w-full group">
                                    <div className="relative max-w-40">

                                        <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 border-l-4 ${borderColor} rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
                                            <div className="overflow-auto max-h-[4rem]">{schedule.service}</div>
                                            <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-1">
                                                <RiCheckDoubleLine className={schedule.acknowledged ? 'text-green-400' : ''} size={18} />
                                            </div>
                                        </div>

                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteSchedule(schedule._id);
                                            }}
                                            className="absolute z-1 right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white p-2 pl-2.5 rounded-r-md inset-shadow-md hover:bg-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 active:opacity-100 focus:opacity-100 cursor-pointer"
                                        >
                                            <FaTrashAlt size={14} />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Render disabled driver cell
                        if (disabledDriver) {
                            return (
                                <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <div className="w-full h-full rounded-md border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]" />
                                </div>
                            );
                        }

                        //  Render continuous schedule block (Unavailable or Day-off)
                        if (continuousSchedule < 3) {
                            const label = continuousSchedule === "1" ? 'Unavailable' : 'Day-off';
                            return (
                                <div className="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                    <div className="text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md">
                                        {label}
                                    </div>
                                </div>
                            );
                        }

                        //  Render empty schedule cell (click to add)
                        return (<>

                            <div
                                onClick={() =>
                                    setAddScheduleData({
                                        driver,
                                        date: day.date,
                                        week: day.week,
                                        error: false
                                    })
                                }
                                className="cursor-pointer flex h-full w-full justify-center items-center"
                            >
                                <div className="group flex justify-center items-center h-full w-40 rounded-md max-w-40 hover:bg-stone-100" >
                                    <div className='group-hover:block hidden text-xs bg-gray-50 px-2 py-[0.1rem] border border-neutral-200 rounded'>
                                        {driver.typeOfDriver}
                                    </div>
                                </div>
                            </div></>
                        );
                    })()}
                </td>
            );
        });
    };


    return (
        <>
            < TableStructure title={'Schedule Planner'} state={state} setters={setters} tableData={tableData} />
            <Modal isOpen={addScheduleData} >
                <div className='px-6 py-3 border-b border-neutral-300'><h1>Add Schedule</h1></div>
                <div className='p-6 md:w-[30rem] '>
                    <div className='flex-1 flex flex-col gap-3'>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Driver name:</span> {addScheduleData?.driver.firstName + ' ' + addScheduleData?.driver.lastName}</div>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Vehicle Type:</span> {addScheduleData?.driver.typeOfDriver}</div>
                        <div className='grid grid-cols-[2fr_4fr] w-full text-sm '><span className=' font-medium'>Date:</span> {addScheduleData?.date}</div>

                        <InputWrapper title={'Services with ratecard available'} >
                            <div className='flex gap-2 w-full'>
                                <InputGroup className='w-full' value={addScheduleData ? addScheduleData.service : ''}

                                    type='dropdown' onChange={(e) => setAddScheduleData(prev => ({ ...prev, service: e.target.value }))}  >
                                    <option value=''>-Select Service-</option>
                                    {services.map((service) => {
                                        if (rateCardFinder(
                                            ratecards,
                                            addScheduleData?.week,
                                            service.title,
                                            addScheduleData?.driver.typeOfDriver
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

                        {addScheduleData?.error && <div className='m-3 text-sm p-1 md:p-2 rounded-md bg-red-200 border border-red-400 text-red-400 flex justify-center items-center gap-3'><div className='text-xs font-bold p-2 flex justify-center items-center bg-red-500 h-3 w-3 text-white rounded-full'>!</div>Ratecard unavailable for selected service</div>}
                    </div>
                </div>
                <div className='border-t border-neutral-300 p-3 flex justify-evenly'>
                    <button onClick={handleAddSchedule} disabled={addScheduleData?.error || !addScheduleData?.service} className='text-sm rounded-md border border-green-600 text-white bg-green-600 px-3 py-1 hover:bg-white hover:text-green-600 disabled:bg-stone-300 disabled:text-stone-200 disabled:border-stone-200 disabled:inset-shadow-sm disabled:hover:text-white' >Add</button>
                    <button className='text-sm rounded-md border border-red-600 text-white bg-red-600 px-3 py-1 hover:bg-white hover:text-red-600' onClick={() => setAddScheduleData(null)}>Cancel</button>
                </div>
            </Modal>
        </>
    );
};

export default SchedulePlanner;