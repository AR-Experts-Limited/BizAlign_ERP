import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { FaTrashAlt } from "react-icons/fa";
import InputGroup from '../../components/InputGroup/InputGroup'
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import { fetchSchedules, addSchedule, deleteSchedule } from '../../features/schedules/scheduleSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { FcPlus } from "react-icons/fc";
import Modal from '../../components/Modal/Modal'
import checkContinuousSchedule from './checkContinuousSchedule';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';

const SchedulePlanner = () => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus, addStatus, deleteStatus, error } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { list: schedules, scheduleStatus } = useSelector((state) => state.schedules)

    const [rangeType, setRangeType] = useState('biweekly');
    const [rangeOptions, setRangeOptions] = useState([]);
    const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')
    const clearScheduleData = {
        driver: {},
        date: '',
        service: ''
    }
    const [addScheduleData, setAddScheduleData] = useState(null)

    useEffect(() => {
        if (sites.length > 0) {
            setSelectedSite(sites[0].siteKeyword)
        }
    }, [sites])

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (scheduleStatus === 'idle') dispatch(fetchSchedules())
        if (serviceStatus === 'idle') dispatch(fetchServices());
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());

    }, [driverStatus, siteStatus, scheduleStatus, serviceStatus, ratecardStatus, dispatch]);

    useEffect(() => {
        let driversList = drivers
        if (searchDriver !== '')
            driversList = driversList.filter((driver) => String(driver.firstName + ' ' + driver.lastName).toLowerCase().includes(searchDriver.toLowerCase()))

        driversList = driversList.filter((driver) => driver.siteSelection === selectedSite)

        setDriversList(driversList)

    }, [drivers, selectedSite, searchDriver])

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
        setSelectedRangeIndex(0);
    }, [rangeType]);

    const generateRangeOptions = () => {
        const options = [];
        let now = moment().startOf('year');
        const end = moment().endOf('year');

        if (rangeType === 'weekly') {
            while (now.isBefore(end)) {
                const start = now.clone().startOf('week');
                const endOfWeek = start.clone().endOf('week');
                options.push({
                    label: `${start.format('GGGG-[W]WW')}`, // ISO week format
                    start,
                    end: endOfWeek
                });
                now = now.add(1, 'week');
            }
        } else if (rangeType === 'biweekly') {
            while (now.isBefore(end)) {
                const start = now.clone();
                const endOfBiweek = start.clone().add(13, 'days');
                const label = `${start.format('MMM D')} - ${endOfBiweek.format('MMM D')}`;
                options.push({ label, start, end: endOfBiweek });
                now = now.add(14, 'days');
            }
        } else if (rangeType === 'monthly') {
            while (now.isBefore(end)) {
                const start = now.clone().startOf('month');
                const endOfMonth = now.clone().endOf('month');
                const label = `${start.format('MMMM YYYY')}`;
                options.push({ label, start, end: endOfMonth });
                now = now.add(1, 'month');
            }
        }

        setRangeOptions(options);
    };

    const selectedRange = rangeOptions[selectedRangeIndex] || { start: moment(), end: moment() };

    const generateDatesInRange = () => {
        const days = [];
        let day = selectedRange.start.clone();
        while (day.isSameOrBefore(selectedRange.end)) {
            days.push({ date: day.format('ddd, YYYY-MM-DD'), week: day.format('GGGG-[W]WW') });
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

    return (
        <div className='h-full w-full flex items-center justify-center p-1.5 md:p-5'>
            <div className='w-full h-full bg-white rounded-xl border border-neutral-200 p-2 shadow-lg'>
                <div className='flex justify-around items-center p-2 gap-5 bg-neutral-50 border border-neutral-200 rounded-lg overflow-auto' >
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-semibold'>Search Personnel Name:</label>
                        <input type="text" onChange={(e) => setSearchDriver(e.target.value)} className='bg-white rounded-md border border-neutral-200  px-2 py-0.5' placeholder="Personnel name" />
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-semibold'>Select Site:</label>
                        <select className="bg-white rounded-md border border-neutral-200 p-1" value={selectedSite} onChange={(e) => setSelectedSite((e.target.value))}>
                            {sites.map((site) => (
                                <option value={site.siteKeyword}>{site.siteName}</option>
                            ))}
                        </select>
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-semibold'>Select {rangeType}: </label>
                        <select className="bg-white rounded-md border border-neutral-200 p-1" value={selectedRangeIndex} onChange={(e) => setSelectedRangeIndex(parseInt(e.target.value))}>
                            {rangeOptions.map((opt, i) => (
                                <option key={i} value={i}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-semibold'>Timeframe: </label>
                        <select className="bg-white rounded-md border border-neutral-200 p-1" value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>

                <div className='flex items-center mt-6 rounded-xl overflow-auto'>
                    <table className='calendar-table text-xs md:text-base w-full border border-neutral-200'>
                        <thead>
                            <tr className='text-primary-500'>
                                <th className='sticky top-0 left-0 z-20 bg-primary-300/60 backdrop-blur-md border-r border-primary-500'>
                                    Personnels List
                                </th>
                                {days.map((day) => (
                                    <th className='sticky top-0 z-10 bg-primary-300/60 border-r border-primary-500' key={day.date}>
                                        {day.date}
                                    </th>))}
                            </tr>
                        </thead>
                        <tbody>
                            {driversList.map((driver) => {
                                let streak = 0;
                                return (
                                    <tr>
                                        <td className='z-2 sticky top-0 left-0 bg-linear-to-r from-white  to-white/10 backdrop-blur-md'>
                                            <div>{driver.firstName + ' ' + driver.lastName}
                                            </div>
                                        </td>
                                        {days.map((day) => {
                                            const continuousSchedule = checkContinuousSchedule(driver._id, day.date, schedules)
                                            const schedule = schedules.find((sch) => new Date(sch.day).toLocaleDateString('en-UK') == new Date(day.date).toLocaleDateString('en-UK') && sch.driverId === driver._id)
                                            if (schedule)
                                                streak += 1
                                            else
                                                streak = 0
                                            return (
                                                <td key={day.date} >
                                                    {schedule ?
                                                        (<div className="relative group">
                                                            <div className={`z-10 flex items-center justify-center text-center ${streak < 3 ? 'bg-green-300/60' : streak < 5 ? 'bg-amber-200/60' : 'bg-red-300/70'} rounded-md text-sm p-2 group-hover:pr-9 group-hover:text-xs transition-all duration-300`}>
                                                                {schedule.service}
                                                            </div>
                                                            <div className="absolute top-0 right-0 h-full w-0 group-hover:w-8 opacity-0 group-hover:opacity-100 z-20 overflow-hidden transition-all duration-300 origin-left">
                                                                <div onClick={() => handleDeleteSchedule(schedule._id)} className="cursor-pointer h-full flex items-center justify-center bg-red-500 text-white p-2 rounded-r-md inset-shadow-md hover:bg-red-400">
                                                                    <FaTrashAlt size={14} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        ) : continuousSchedule < 3 ? <div className='text-sm text-center text-white bg-stone-400 p-0.5 rounded-md'>{continuousSchedule == 1 ? 'Unavailable' : 'Day-off'}</div> : <div className='flex justify-center' onClick={() => setAddScheduleData({ driver, date: day.date, week: day.week, error: false })}><FcPlus className='transition-all cursor-pointer duration-200 hover:scale-125' size={18} /></div>
                                                    }
                                                </td>
                                            )
                                        })}
                                    </tr>)
                            }
                            )}
                        </tbody>
                    </table>
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
                </div>
            </div >
        </div >
    );
};

export default SchedulePlanner;
