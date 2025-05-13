import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import { fetchSchedules } from '../../features/schedules/scheduleSlice';


const SchedulePlanner = () => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus, addStatus, deleteStatus, error } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const { list: schedules, scheduleStatus } = useSelector((state) => state.schedules)

    const [rangeType, setRangeType] = useState('biweekly');
    const [rangeOptions, setRangeOptions] = useState([]);
    const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
        if (scheduleStatus === 'idle') dispatch(fetchSchedules())
    }, [driverStatus, siteStatus, scheduleStatus, dispatch]);

    useEffect(() => {

        setDriversList(drivers.filter((driver) => driver.siteSelection === selectedSite))
    }, [drivers, selectedSite])


    useEffect(() => {
        if (sites.length > 0) {
            setSelectedSite(sites[0].siteKeyword)
        }
    }, [sites])

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
                const start = now.clone().startOf('isoWeek');
                const endOfWeek = start.clone().endOf('isoWeek');
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
            days.push(day.format('YYYY-MM-DD'));
            day.add(1, 'day');
        }
        return days;
    };

    const dates = generateDatesInRange();

    return (
        <div className='h-full w-full flex items-center justify-center p-5'>
            <div className='w-full h-full bg-white rounded-xl border border-neutral-200 p-2 shadow-lg'>
                <div className='flex justify-around items-center p-2 gap-3 bg-neutral-50 border border-neutral-200 rounded-lg' >
                    <div className='flex flex-col gap-1'>
                        <label className='text-sm font-semibold'>Search Personnel Name:</label>
                        <input type="text" className='bg-white rounded-md border border-neutral-200 p-0.5 text-center' placeholder="Personnel name" />
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

                <div className='flex items-center mt-6 rounded-xl overflow-auto shadow-lg'>
                    <table className='calendar-table w-full border border-neutral-200'>
                        <thead>
                            <tr className='text-primary-500'>
                                <th className='sticky top-0 left-0 z-20 bg-primary-300/60 backdrop-blur-md border-r border-primary-500'>
                                    Personnels List
                                </th>
                                {dates.map((date) => (
                                    <th className='sticky top-0 z-10 bg-primary-300/60 border-r border-primary-500' key={date}>
                                        {date}
                                    </th>))}
                            </tr>
                        </thead>
                        <tbody>
                            {driversList.map((driver) => {
                                let streak = 0;
                                return (
                                    <tr>
                                        <td className='z-2 sticky top-0 left-0 bg-linear-to-r from-white  to-white/10 backdrop-blur-md'>{driver.firstName + ' ' + driver.lastName}</td>
                                        {dates.map((date) => {

                                            const schedule = schedules.find((sch) => new Date(sch.day).toLocaleDateString() == new Date(date).toLocaleDateString() && sch.driverId === driver._id)
                                            if (schedule) streak += 1
                                            else streak = 0
                                            return (
                                                <td key={date} >{schedule && <div className={`flex items-center justify-center text-center ${streak < 3 ? 'bg-green-300/50' : streak < 5 ? 'bg-amber-200/50' : 'bg-red-300/50'} rounded-md text-sm p-2`}>{schedule.service}</div>}</td>
                                            )
                                        })}
                                    </tr>)
                            }
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default SchedulePlanner;
