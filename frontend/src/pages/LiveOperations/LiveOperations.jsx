import React, { useState, useEffect, useMemo } from 'react';
import TableStructure from '../../components/TableStructure/TableStructure';
import checkContinuousSchedule from '../SchedulePlanner/checkContinuousSchedule';
import calculateWorkStreak from '../SchedulePlanner/calculateWorkStreak';
import moment from 'moment';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL;


const LiveOperations = () => {
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState(moment().format('GGGG-[W]WW'));

    const [selectedSite, setSelectedSite] = useState('')
    const [driversList, setDriversList] = useState([])
    const [standbydriversList, setStandbydriversList] = useState([])
    const [searchDriver, setSearchDriver] = useState('')
    const [days, setDays] = useState([])

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList }
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList }

    const [schedules, setSchedules] = useState([])
    const [cacheRangeOption, setCacheRangeOption] = useState(null)
    const [prevRangeType, setPrevRangeType] = useState(rangeType)


    useEffect(() => {
        console.log('rangeOption:', rangeOptions)
        console.log('selectedRangeIndexFromLiveOps', selectedRangeIndex)
        console.log('cacheOption', cacheRangeOption)
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
            else if (Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 || Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)) {
                fetchSchedules()
                setCacheRangeOption(rangeOptions)
            }

        }

    }, [rangeOptions, driversList])

    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions)
            setPrevRangeType(rangeType)
        }
    }, [rangeOptions])

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

    const tableData = (driver) => {
        return days.map((day) => {
            const schedule = schedules.find((sch) => new Date(sch.day).toLocaleDateString('en-UK') == new Date(day.date).toLocaleDateString('en-UK') && sch.driverId === driver._id)
            const continuousSchedule = checkContinuousSchedule(driver._id, day.date, schedules)
            let streak = streaks[`${driver._id}-${day.date}`]

            return (

                <td key={day.date} className={`${new Date(day.date).toDateString() === new Date().toDateString() ? 'bg-amber-100/30' : ''}`} >
                    {schedule && <div className={`relative flex justify-center h-full w-full `}>
                        <div className='relative max-w-40'>
                            <div className={`relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4  dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 ${streak < 3 ? ' border-l-4 border-l-green-500/60 dark:border-l-green-500/60' : streak < 5 ? 'border-l-4 border-l-yellow-500/60' : 'border-l-4 border-l-red-400'} rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
                                <div className='overflow-auto max-h-[4rem]'>{schedule?.service}</div>
                            </div>
                        </div>
                    </div>}
                </td>
            )
        })
    }

    return (
        <TableStructure title={'Live Operations'} state={state} setters={setters} tableData={tableData} />
    );
};

export default LiveOperations;