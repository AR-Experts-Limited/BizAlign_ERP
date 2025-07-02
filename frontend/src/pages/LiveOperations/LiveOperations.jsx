import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TableStructure from '../../components/TableStructure/TableStructure';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import moment from 'moment';
import axios from 'axios';
import Modal from '../../components/Modal/Modal'
import { ImageViewer } from './ImageViewer'
import { FcApproval } from "react-icons/fc";



const API_BASE_URL = import.meta.env.VITE_API_URL;

const LiveOperations = () => {
    const dispatch = useDispatch();
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState();
    const [selectedSite, setSelectedSite] = useState('');
    const [driversList, setDriversList] = useState([]);
    const [standbydriversList, setStandbydriversList] = useState([]);
    const [searchDriver, setSearchDriver] = useState('');
    const [days, setDays] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [scheduleMap, setScheduleMap] = useState({});
    const [cacheRangeOption, setCacheRangeOption] = useState(null);
    const [prevRangeType, setPrevRangeType] = useState(rangeType);
    const [loading, setLoading] = useState(false)

    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);


    const [currentShiftDetails, setCurrentShiftDetails] = useState(null)

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList };
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList };

    useEffect(() => {
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());

    }, [standbyDriverStatus, dispatch]);

    const { streaks, continuousStatus } = useMemo(() => {
        if (driversList.length === 0 || schedules.length === 0) {
            return { streaks: {}, continuousStatus: {} };
        }

        const streaks = calculateAllWorkStreaks(driversList, schedules);
        const continuousStatus = checkAllContinuousSchedules(driversList, schedules, days.map((day) => day.date));

        return { streaks, continuousStatus };
    }, [driversList, schedules]);

    const prevDriversList = useRef(driversList);

    useEffect(() => {
        const fetchSchedules = async () => {
            if (driversList.length === 0 || !rangeOptions) return;

            let loadingTimeout = setTimeout(() => setLoading(true), 350);

            try {
                const rangeOptionsVal = Object.values(rangeOptions);
                const response = await axios.get(`${API_BASE_URL}/api/schedule/combined`, {
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

        // Check if rangeOptions change requires a fetch
        const shouldFetchRange =
            !cacheRangeOption ||
            !Object.keys(cacheRangeOption).includes(selectedRangeIndex) ||
            Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
            Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === Object.keys(cacheRangeOption).length - 1;

        // Fetch if driversList changed or rangeOptions change requires it
        if (driversListChanged || shouldFetchRange) {
            fetchSchedules();
        }
    }, [rangeOptions, driversList]);

    useEffect(() => {
        let map = {};
        schedules.forEach(sch => {
            const dateKey = new Date(sch.day).toLocaleDateString('en-UK');
            const key = `${dateKey}_${sch.driverId}`;
            map[key] = sch;
        });
        setScheduleMap(map);
    }, [schedules]);

    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions]);

    const tableData = (driver, day, disabledDriver, standbyDriver) => {
        const dateObj = new Date(day.date);
        const dateKey = dateObj.toLocaleDateString('en-UK');
        const key = `${dateKey}_${driver._id}`;

        const appData = scheduleMap[key]?.appData;
        const schedule = scheduleMap[key]?.schedule;
        const standbySchedule = standbydrivers.find((s) => new Date(s.day).getTime() === dateObj.getTime() && s.driverId === driver._id);
        const streak = streaks[driver._id]?.[dateKey] || 0;
        const continuousSchedule = continuousStatus[driver._id]?.[dateKey] || "3";

        const scheduleBelongtoSite = schedule?.site === selectedSite;


        const getBorderColor = (streak) => {
            if (streak < 3) return 'border-l-green-500/60';
            if (streak < 5) return 'border-l-yellow-500/60';
            return 'border-l-red-400';
        };

        const renderStandbyCell = () => (
            <div className="relative flex justify-center h-full w-full">
                <div className="relative max-w-40 w-full">
                    <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-amber-100 dark:border-dark-5 rounded-md text-sm p-2 bg-[repeating-linear-gradient(-45deg,#ffb9008f_0px,#ffb9008f_2px,transparent_2px,transparent_6px)]">
                        <div className="overflow-auto max-h-[4rem] bg-amber-400/50 rounded-md px-2 py-1 text-amber-700">On Stand-By</div>
                    </div>
                </div>
            </div>
        );

        const renderScheduleBox = ({ schedule, scheduleBelongtoSite, streak }) => {
            const borderColor = getBorderColor(streak);
            return (
                <div className="relative flex justify-center h-full w-full">
                    <div className="relative max-w-40">
                        <div onClick={() => setCurrentShiftDetails(appData)} className={`cursor-pointer relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 border-l-4 ${borderColor} rounded-md text-sm p-2 transition-all duration-300 ${scheduleBelongtoSite ? 'group-hover:w-[82%]' : ''}`}>
                            <div className="overflow-auto max-h-[6rem]">
                                {schedule.service} {!scheduleBelongtoSite ? <span className='bg-amber-400/40 rounded text-amber-800 text-[0.7rem] py-0.5 px-1'>{schedule.site}</span> : ''}
                            </div>
                            {scheduleBelongtoSite && <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-1">

                                {(() => {
                                    if (appData && !appData?.endShiftChecklist?.endShiftTimestamp) {
                                        return (
                                            <svg className="w-6 h-6" viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg">
                                                <polyline
                                                    points="0,25 20,25 30,05 40,40 50,10 60,25 100,25"
                                                    className="ecg-path stroke-orange-500 stroke-[7] fill-none"
                                                />
                                            </svg>
                                        );
                                    }
                                    if (!appData) {
                                        return (<i className="flex items-center p-3 fi fi-rr-hourglass-start text-[0.9rem] text-red-500" />);
                                    }
                                    if (appData?.endShiftChecklist) {
                                        return (<FcApproval size={20} />);
                                    }
                                })()}
                            </div>}
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div key={day.date} className={`h-full w-full `}>
                {(() => {

                    if (loading) {
                        return <div className='h-full w-full rounded-md bg-gray-200 animate-pulse'></div>
                    }
                    else if (standbyDriver) {
                        if (standbySchedule && !schedule) {
                            return null;
                        }
                        if (standbySchedule && schedule) {
                            return renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
                        }
                        return null;
                    }
                    if (standbySchedule && schedule) {
                        return renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
                    }

                    if (Object.keys(scheduleMap).length > 0 && standbySchedule && !schedule) {
                        return renderStandbyCell();
                    }

                    if (schedule && schedule.service === 'Voluntary-Day-off') {
                        return (
                            <div className="relative flex justify-center h-full w-full">
                                <div className="relative max-w-40">
                                    <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 px-4 transition-all duration-300 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                        <div className="overflow-auto max-h-[4rem]">{schedule.service}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    if (schedule) {
                        return renderScheduleBox({ schedule, scheduleBelongtoSite, streak });
                    }
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
                    return null;
                })()}
            </div >
        );
    };





    return (
        <>
            < TableStructure title={'Live Operations'} state={state} setters={setters} tableData={tableData} />
            <Modal isOpen={currentShiftDetails} onHide={() => { setCurrentShiftDetails(null); }}>
                <div className="border border-neutral-300 rounded-lg w-full max-w-4xl mx-auto">
                    <div className="px-8 py-4 border-b border-neutral-300">
                        <h2 className="text-xl font-semibold">Shift Details</h2>
                    </div>

                    <div className="mx-6 p-3 space-y-4">
                        {/* Date and User ID Row */}
                        <div className="flex flex-row justify-between gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date:</label>
                                <p>{new Date(currentShiftDetails?.day).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">User ID:</label>
                                <p>{currentShiftDetails?.user_ID}</p>
                            </div>
                        </div>

                        {/* Shift Time Row */}
                        <div className="flex flex-row justify-between gap-4">
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-gray-700">Shift Start Time:</p>
                                <input
                                    value={new Date(currentShiftDetails?.startShiftChecklist?.startShiftTimestamp).toLocaleString()}
                                    disabled
                                    className="mt-1 px-3 py-2 bg-gray-100 border border-neutral-200 rounded-md text-sm"
                                />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-gray-700">Shift End Time:</p>
                                <input
                                    value={
                                        currentShiftDetails?.endShiftChecklist?.endShiftTimestamp
                                            ? new Date(currentShiftDetails.endShiftChecklist.endShiftTimestamp).toLocaleString()
                                            : '--Shift in progress--'
                                    }
                                    disabled
                                    className="mt-1 px-3 py-2 bg-gray-100 border border-neutral-200 rounded-md text-sm"
                                />
                            </div>
                        </div>


                        <ImageViewer
                            userId={currentShiftDetails?.user_ID}
                            date={new Date(currentShiftDetails?.day)}
                            checklist={currentShiftDetails?.startShiftChecklist}
                            title="Shift Start"
                        />
                        <ImageViewer
                            userId={currentShiftDetails?.user_ID}
                            date={new Date(currentShiftDetails?.day)}
                            checklist={currentShiftDetails?.endShiftChecklist}
                            title="Shift End"
                        />
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-2 border-t border-neutral-300 flex justify-end">
                        <button
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                            onClick={() => { setCurrentShiftDetails(null); }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </>

    );
};

export default LiveOperations;