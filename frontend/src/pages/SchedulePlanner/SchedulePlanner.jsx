import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { FaTrashAlt } from "react-icons/fa";
import { IoIosAddCircle, IoIosAddCircleOutline } from "react-icons/io";
import { RiCheckDoubleLine } from "react-icons/ri";
import { IoMoon, IoMoonOutline } from "react-icons/io5";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import { cn } from "../../lib/utils";
import InputGroup from '../../components/InputGroup/InputGroup'
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import { fetchSchedules, addSchedule, deleteSchedule } from '../../features/schedules/scheduleSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import Modal from '../../components/Modal/Modal'
import checkContinuousSchedule from './checkContinuousSchedule';
import calculateWorkStreak from './calculateWorkStreak';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { addStandbyDriver, deleteStandbyDriver, fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import WeekFilter from '../../components/Calendar/WeekFilter';

const SchedulePlanner = () => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus } = useSelector((state) => state.drivers);
    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { list: schedules, scheduleStatus } = useSelector((state) => state.schedules)

    const [rangeType, setRangeType] = useState('biweekly');
    const [rangeOptions, setRangeOptions] = useState([]);
    const [selectedRangeIndex, setSelectedRangeIndex] = useState();

    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [standbydriversList, setStandbydriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')

    const [addScheduleData, setAddScheduleData] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (sites.length > 0) {
            setSelectedSite(sites[0].siteKeyword)
        }
    }, [sites])

    useEffect(() => {
        const defaultIndex =
            rangeType === 'monthly'
                ? moment().format('YYYY-MM')
                : rangeType === 'daily'
                    ? moment().format('YYYY-MM-DD')
                    : moment().format('GGGG-[W]WW');
        setSelectedRangeIndex(defaultIndex);
    }, [rangeType]);

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (scheduleStatus === 'idle') dispatch(fetchSchedules())
        if (serviceStatus === 'idle') dispatch(fetchServices());
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());

    }, [driverStatus, siteStatus, scheduleStatus, serviceStatus, ratecardStatus, standbyDriverStatus, dispatch]);

    useEffect(() => {
        let driversList = drivers
        let standbydriversIds = standbydrivers.map((sdriver) => { if (sdriver.site !== selectedSite) return (sdriver.driverId) })
        let standbydriversList = drivers.filter((driver) => standbydriversIds.some((sId) => sId == driver._id))

        if (searchDriver !== '')
            driversList = driversList.filter((driver) => String(driver.firstName + ' ' + driver.lastName).toLowerCase().includes(searchDriver.toLowerCase()))

        driversList = driversList.filter((driver) => driver.siteSelection === selectedSite)

        setDriversList([...driversList, ...standbydriversList])
        setStandbydriversList(standbydriversList)

    }, [drivers, selectedSite, searchDriver, standbydrivers])

    useEffect(() => {
        if (addScheduleData) {
            const foundRatecard = ratecards.find((ratecard) => ratecard.serviceWeek === addScheduleData?.week && ratecard.serviceTitle === addScheduleData?.service)
            if (!foundRatecard)
                setAddScheduleData(prev => ({ ...prev, error: true }))
            else
                setAddScheduleData(prev => ({ ...prev, associatedRateCard: foundRatecard._id, error: false }))
        }
    }, [addScheduleData?.service])

    useEffect(() => {
        generateRangeOptions();
    }, [rangeType, selectedRangeIndex]);

    const generateRangeOptions = () => {
        const options = {};
        let now = moment().startOf('year');
        const end = moment().endOf('year');

        if (rangeType === 'daily') {
            const date = moment(selectedRangeIndex, 'YYYY-MM-DD');
            let now = date.clone().subtract(2, 'day');
            let end = date.clone().add(2, 'day');
            while (now.isBefore(end)) {
                const label = `${now.format('YYYY-MM-DD')}`
                options[label] = {
                    display: label,
                    start: now.clone(),
                    end: now.clone()
                }
                now = now.add(1, 'day');
            }
        }


        else if (rangeType === 'weekly') {
            const date = moment(selectedRangeIndex, 'GGGG-[W]WW');
            let now = date.clone().startOf('week');
            const end = date.clone().endOf('week').add(21, 'days').startOf('day');
            while (now.isBefore(end)) {
                const start = now.clone().subtract(14, 'days').startOf('week');
                const endOfWeek = start.clone().endOf('week');
                const label = `${endOfWeek.format('GGGG-[W]WW')}`
                options[label] = {
                    display: label,
                    start,
                    end: endOfWeek
                }

                now = now.add(1, 'week');
            }
        }
        else if (rangeType === 'biweekly') {
            const date = moment(selectedRangeIndex, 'GGGG-[W]WW');
            let now = date.clone().startOf('week');
            const end = date.clone().endOf('week').add(21, 'days').startOf('day');
            while (now.isBefore(end)) {
                const start = now.clone().subtract(14, 'days').startOf('week');
                const endOfWeek = start.clone().endOf('week');
                const endOfBiweek = start.clone().add(13, 'days');
                const label = `${endOfWeek.format('GGGG-[W]WW')}`
                options[label] = {
                    display: `${endOfWeek.format('GGGG-[W]WW')} to ${endOfBiweek.format('GGGG-[W]WW')}`,
                    start, start, end: endOfBiweek
                };
                now = now.add(1, 'week');
            }

        }
        else if (rangeType === 'monthly') {
            let now = moment(selectedRangeIndex, "YYYY-MM");
            const end = now.clone().add(1, 'month').endOf('month')
            now = now.subtract(1, 'month')
            while (now.isBefore(end)) {
                const start = now.clone().startOf('month');
                const endOfMonth = now.clone().endOf('month');
                const label = `${start.format('YYYY-MM')}`;
                options[label] = { start, end: endOfMonth };
                now = now.add(1, 'month');
            }
        }

        setRangeOptions(options);
    };


    const generateDatesInRange = () => {
        let defaultValue = { start: moment(), end: moment() }
        if (rangeType === 'daily') {
            defaultValue = { start: moment(), end: moment(), default: true }
        }
        else if (rangeType === 'monthly') {
            defaultValue = { start: moment().startOf('month'), end: moment().endOf('month'), default: true }
        }
        else if (rangeType === 'weekly' || rangeType === 'biweekly') {
            defaultValue = { start: moment().startOf('week'), end: moment().endOf('week'), default: true }
        }

        const selectedRange = rangeOptions[selectedRangeIndex] || defaultValue

        const days = [];
        let day = selectedRange.start.clone();
        while (day.isSameOrBefore(selectedRange.end)) {
            days.push({ date: day.format('ddd, YYYY-MM-DD'), week: moment(day).startOf('week').add(1, 'days').format('YYYY-[W]WW'), default: selectedRange.default });
            day.add(1, 'day');
        }
        return days;
    };

    const days = generateDatesInRange();

    const handleAddSchedule = async () => {
        dispatch(addSchedule({
            driverId: addScheduleData.driver._id,
            day: addScheduleData.date,
            service: addScheduleData.service,
            user_ID: addScheduleData.driver.user_ID,
            associatedRateCard: addScheduleData.associatedRateCard,
            week: addScheduleData.week,
            site: selectedSite,
            acknowledged: false,
        }))
        setAddScheduleData(null)
    }

    const handleDeleteSchedule = async (id) => {
        dispatch(deleteSchedule(id))
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

    const handleForwardOrBackward = (ops) => {
        const rangeOptionKeys = Object.keys(rangeOptions)
        const currentIndex = rangeOptionKeys.indexOf(selectedRangeIndex)
        if (ops === 'previous')
            setSelectedRangeIndex(rangeOptionKeys[currentIndex - 1])
        else
            setSelectedRangeIndex(rangeOptionKeys[currentIndex + 1])

    }


    const streaks = useMemo(() => {
        const result = {};
        driversList.forEach(driver => {
            days.forEach(day => {
                const key = `${driver._id}-${day.date}`;
                result[key] = calculateWorkStreak(driver._id, day.date, schedules);
            });
        });
        return result;
    }, [driversList, days, schedules]);

    return (
        <div className='w-full h-full flex items-center justify-center p-1.5 md:p-4 overflow-hidden '>
            <div className='relative flex flex-col w-full h-full bg-white rounded-xl p-2 md:p-4 shadow overflow-hidden'>
                <div className='flex justify-around items-center p-3 gap-4  bg-neutral-100/90 shadow border-[1.5px] border-neutral-300/80 rounded-lg overflow-auto' >
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-semibold'>Search Personnel Name:</label>
                        <input type="text" onChange={(e) => setSearchDriver(e.target.value)} className='bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1 h-10 outline-none focus:border-primary-200' placeholder="Personnel name" />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-semibold'>Select Site:</label>
                        <select className="bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1 h-10 outline-none focus:border-primary-200" value={selectedSite} onChange={(e) => setSelectedSite((e.target.value))}>
                            {sites.map((site) => (
                                <option value={site.siteKeyword}>{site.siteName}</option>
                            ))}
                        </select>
                    </div>
                    <div className='flex flex-col items-center justify-center gap-1'>
                        <label className='text-xs font-semibold'>Select {rangeType}: </label>
                        <div className='flex items-center justify-center w-full h-full gap-2'>
                            <button name="previous" onClick={() => handleForwardOrBackward('previous')} className='flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200'><FaChevronLeft size={13} /></button>
                            {rangeType === 'daily' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                            {rangeType === 'weekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                            {rangeType === 'biweekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                            {rangeType === 'monthly' && <WeekFilter value={selectedRangeIndex} type={rangeType} onChange={(e) => setSelectedRangeIndex(e)} />}
                            <button name="next" onClick={() => handleForwardOrBackward('next')} className='flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200'><FaChevronRight size={14} /></button>
                        </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-xs font-semibold'>Timeframe: </label>
                        <select className="bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1  h-10 outline-none focus:border-primary-200" value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                <div className="my-3 relative rounded-t-lg flex-1 overflow-auto">
                    <table className='calendar-table text-xs md:text-base w-full border border-neutral-200'>
                        <thead>
                            <tr className='text-white'>
                                <th className='sticky top-0 left-0 z-20 bg-primary-800 border-r-[1.5px] border-primary-700 font-medium'>
                                    Personnels List
                                </th>
                                {days.map((day) => (
                                    <th className={`sticky top-0 z-10  bg-primary-800 border-r-[1.5px] border-primary-700 font-light ${rangeType === 'daily' ? '!max-w-35' : ''}`} key={day.date}>
                                        <div className='flex flex-col gap-1 items-center '>
                                            <div>{day.date}</div>
                                            {rangeType === 'biweekly' && <div className='font-medium text-gray-600 w-fit px-1 py-0.5 text-[0.55rem] bg-white/70 rounded-sm shadow-xs'>
                                                {day.week}
                                            </div>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {driversList.map((driver) => {
                                let streak = 0;
                                const disableDriver = driver.activeStatus != 'Active' ? driver.activeStatus : null
                                const standbydriver = standbydriversList.some((sdriver) => sdriver._id === driver._id)
                                return (
                                    <tr>
                                        <td className='z-10 sticky left-0 bg-white'>
                                            <div className='flex flex-col gap-3'>
                                                <p>{driver.firstName + ' ' + driver.lastName}</p>
                                                {disableDriver && <div className='text-sm text-center text-white bg-stone-400 p-0.5 rounded-md'>{disableDriver}</div>}
                                                {standbydriver && <div className='text-left bg-amber-200 text-amber-700 rounded-md px-2 py-1 text-xs'>Stand by driver from {driver.siteSelection}</div>}
                                            </div>
                                        </td>
                                        {days.map((day) => {
                                            const continuousSchedule = checkContinuousSchedule(driver._id, day.date, schedules)
                                            const schedule = schedules.find((sch) => new Date(sch.day).toLocaleDateString('en-UK') == new Date(day.date).toLocaleDateString('en-UK') && sch.driverId === driver._id)
                                            const standbyschedule = standbydrivers.find((standbyschedule) => new Date(standbyschedule.day).getTime() == new Date(day.date).getTime() && standbyschedule.driverId === driver._id)

                                            //streak = 0
                                            streak = streaks[`${driver._id}-${day.date}`]
                                            let tabledata = ''

                                            if (standbydriver) {
                                                tabledata =
                                                    <div className='flex items-center h-full w-full justify-center '>
                                                        {schedule ? (
                                                            <div className="relative h-full w-full group">
                                                                <div className={`relative z-6 w-full h-full shadow-sm flex gap-1 items-center justify-center text-center overflow-auto ${streak < 3 ? 'bg-green-200' : streak < 5 ? 'bg-yellow-100' : 'bg-red-200'} rounded-md text-sm p-2 group-hover:w-32  group-hover:rounded-r-none group-hover:rounded-l-md transition-all duration-300`}>
                                                                    <div className='overflow-auto max-h-[4rem]'>{schedule.service}</div>
                                                                    <div className='p-1 shadow-md rounded-full h-6 w-6 flex justify-center items-center bg-white/80'><RiCheckDoubleLine className={`${schedule.acknowledged ? 'text-green-400' : ''}`} size={20} /></div>
                                                                </div>
                                                                <div className="absolute top-0 right-[1px] h-full z-5">
                                                                    <div onClick={() => handleDeleteSchedule(schedule._id)} className="cursor-pointer h-full flex items-center justify-center bg-red-500 text-white p-2 pl-2.5 rounded-r-md inset-shadow-md hover:bg-red-400">
                                                                        <FaTrashAlt size={14} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : standbyschedule ? (
                                                            <div className='flex justify-center' onClick={() => setAddScheduleData({ driver, date: day.date, week: day.week, error: false })}>
                                                                <IoIosAddCircle className='text-green-500 transition-[scale] cursor-pointer duration-200 hover:scale-125' size={22} />
                                                            </div>
                                                        ) : (
                                                            <IoIosAddCircleOutline className='text-stone-400' size={22} />
                                                        )}

                                                    </div>
                                            }
                                            else if (disableDriver) {
                                                tabledata = <div className='w-full h-full flex items-center justify-center text-stone-400'>
                                                    <div class="w-full h-full rounded-md border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                                    </div>
                                                </div>
                                            }
                                            else if (schedule) {
                                                tabledata =
                                                    <div className={`relative flex justify-center h-full w-full group`}>
                                                        <div className='relative max-w-40'>
                                                            <div className={`relative z-6 w-full h-full shadow-md flex gap-1 items-center justify-center overflow-auto bg-gray-100 border border-gray-200 ${streak < 3 ? ' border-l-4 border-l-green-500/60' : streak < 5 ? 'border-l-4 border-l-yellow-500/60' : 'border-l-4 border-l-red-400'} rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
                                                                <div className='overflow-auto max-h-[4rem]'>{schedule.service}</div>
                                                                <div className='p-1 shadow-md rounded-full h-6 w-6 flex justify-center items-center bg-white/80'>
                                                                    <RiCheckDoubleLine className={`${schedule.acknowledged ? 'text-green-400' : ''}`} size={20} />
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
                                                    </div>
                                            }

                                            else {
                                                tabledata =
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
                                                    </div>
                                            }
                                            if (continuousSchedule < 3) {
                                                tabledata =
                                                    <div class="flex justify-center items-center w-full h-full rounded-lg border-dashed border-gray-200 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                                        <div className='text-sm text-center text-white bg-stone-300 px-1 py-0.5 rounded-md'>{parseInt(continuousSchedule) === 1 ? 'Unavailable' : 'Day-off'}</div>
                                                    </div>
                                            }
                                            return (
                                                <td key={day.date} >
                                                    {!day.default && tabledata}
                                                </td>
                                            )
                                        })}
                                    </tr >)
                            }
                            )}
                        </tbody >
                    </table >

                    <Modal isOpen={addScheduleData} >
                        <div className='w-80 md:w-92'>
                            <div>
                                <div className='text-sm my-3'><span className=' font-medium'>Driver name:</span> {addScheduleData?.driver.firstName + ' ' + addScheduleData?.driver.lastName}</div>
                                <div className='text-sm my-3'><span className=' font-medium'>Vehicle Type:</span> {addScheduleData?.driver.typeOfDriver}</div>
                                <div className='text-sm my-3'><span className=' font-medium'>Date:</span> {addScheduleData?.date}</div>

                                <InputGroup value={addScheduleData ? addScheduleData.service : ''} type='dropdown' label='Select service' onChange={(e) => setAddScheduleData(prev => ({ ...prev, service: e.target.value }))}  >
                                    <option value=''>-Select Service-</option>
                                    {services.map((service) => (
                                        <option value={service.title}>{service.title}</option>
                                    ))}
                                </InputGroup>

                                {addScheduleData?.error && <div className='m-3 text-sm p-1 md:p-2 rounded-md bg-red-200 border border-red-400 text-red-400 flex justify-center items-center gap-3'><div className='text-xs font-bold p-2 flex justify-center items-center bg-red-500 h-3 w-3 text-white rounded-full'>!</div>Ratecard unavailable for selected service</div>}
                            </div>

                            <div className='m-5 flex justify-evenly'>
                                <button onClick={handleAddSchedule} disabled={addScheduleData?.error} className='text-sm rounded-md border border-green-600 text-white bg-green-600 px-3 py-1 hover:bg-white hover:text-green-600 disabled:bg-stone-300 disabled:text-stone-200 disabled:border-stone-200 disabled:inset-shadow-sm disabled:hover:text-white' >Add</button>
                                <button className='text-sm rounded-md border border-red-600 text-white bg-red-600 px-3 py-1 hover:bg-white hover:text-red-600' onClick={() => setAddScheduleData(null)}>Cancel</button>
                            </div>
                        </div>
                    </Modal>

                </div >
            </div>
        </div >
    );
};

export default SchedulePlanner;
