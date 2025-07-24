import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import axios from 'axios';

// Components
import TableStructure from '../../components/TableStructure/TableStructure';
import Modal from '../../components/Modal/Modal';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import InputGroup from '../../components/InputGroup/InputGroup';
import SuccessTick from '../../components/UIElements/SuccessTick'
import TrashBin from '../../components/UIElements/TrashBin'
import Spinner from '../../components/UIElements/Spinner'



// Icons
import { FaChevronUp, FaLock, FaUnlock } from "react-icons/fa6";
import { FaPoundSign, FaTruck } from 'react-icons/fa';

// Utils and Redux
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import { getIncentiveDetails, getDeductionDetails, getInstallmentDetails } from './supportFunctions';
import TotalBreakdown from './TotalBreakdown';
import { debounce } from 'lodash';

// Configure moment locale
moment.updateLocale('en', {
    week: {
        dow: 0, // Sunday is day 0
    },
});

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

    const dateKey = moment(date).format('D/M/YYYY');

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

/**
 * Helper function to check if user has admin privileges
 */
const hasAdminPrivileges = (role) => ['super-admin', 'Admin'].includes(role);

/**
 * Helper function to determine approval status
 */
const getApprovalStatus = (currentStatus, isAdmin) => {
    if (isAdmin) return 'Approved';
    if (currentStatus === '' || currentStatus === 'Approved')
        return 'Request'
    else if (currentStatus === 'Request')
        return 'Requested'
    else
        return currentStatus;
};

/**
 * Main Rota component
 */
const Rota = () => {
    // Redux state
    const dispatch = useDispatch();
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);
    const { userDetails } = useSelector((state) => state.auth);
    const { events, connected } = useSelector((state) => state.sse);

    // State management
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState(moment().startOf('week').format('YYYY-[W]w'));
    const [selectedSite, setSelectedSite] = useState('');
    const [driversList, setDriversList] = useState([]);
    const [standbydriversList, setStandbydriversList] = useState([]);
    const [searchDriver, setSearchDriver] = useState('');
    const [days, setDays] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [scheduleMap, setScheduleMap] = useState({});
    const [cacheRangeOption, setCacheRangeOption] = useState(null);
    const [prevRangeType, setPrevRangeType] = useState(rangeType);
    const [rotaDetail, setRotaDetail] = useState(null);
    const [errors, setErrors] = useState({});
    const [openTotalBreakdown, setOpenTotalBreakdown] = useState(false);
    const [loading, setLoading] = useState(false)
    const loadingTimeoutRef = useRef(null);
    const prevDriversList = useRef(driversList);
    const [toastOpen, setToastOpen] = useState(false)

    // Consolidated state objects
    const state = {
        rangeType,
        rangeOptions,
        selectedRangeIndex,
        days,
        selectedSite,
        searchDriver,
        driversList,
        standbydriversList
    };

    const setters = {
        setRangeType,
        setRangeOptions,
        setSelectedRangeIndex,
        setDays,
        setSelectedSite,
        setSearchDriver,
        setDriversList,
        setStandbydriversList
    };

    // Fetch initial data
    useEffect(() => {
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (serviceStatus === 'idle') dispatch(fetchServices());
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());
    }, [ratecardStatus, serviceStatus, standbyDriverStatus, dispatch]);

    // Calculate work streaks and continuous schedules
    const { streaks, continuousStatus } = useMemo(() => {
        if (driversList.length === 0 || schedules.length === 0) {
            return { streaks: {}, continuousStatus: {} };
        }

        const streaks = calculateAllWorkStreaks(driversList, schedules);
        const continuousStatus = checkAllContinuousSchedules(
            driversList,
            schedules,
            days.map((day) => day.date)
        );

        return { streaks, continuousStatus };
    }, [driversList, schedules, days]);

    // Build schedule maps
    useEffect(() => {
        const scheduleMap = {};
        const weeklyMap = {};
        schedules.forEach(sch => {
            const dateKey = new Date(sch.day).toLocaleDateString('en-UK');
            const key = `${dateKey}_${sch.driverId}`;
            scheduleMap[key] = sch;

            const weekKey = sch.schedule?.week;
            const driverKey = `${sch.driverId}_${weekKey}`;
            weeklyMap[driverKey] = (weeklyMap[driverKey] || 0) + 1;
        });

        setScheduleMap(scheduleMap);
    }, [schedules]);


    useEffect(() => {
        const fetchSchedules = async () => {
            if (driversList.length === 0 || !rangeOptions) return;

            // Check if driversList has changed by comparing with previous value
            const driversListChanged = JSON.stringify(driversList) !== JSON.stringify(prevDriversList.current);
            prevDriversList.current = driversList;

            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }

            const shouldLoad =
                driversListChanged ||
                !cacheRangeOption ||
                !Object.keys(cacheRangeOption).includes(selectedRangeIndex) ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === Object.keys(cacheRangeOption).length - 1;

            if (shouldLoad) {
                loadingTimeoutRef.current = setTimeout(() => {
                    setLoading(true);
                }, 350);
            }

            try {
                const rangeOptionsVal = Object.values(rangeOptions);
                const response = await axios.get(`${API_BASE_URL}/api/schedule/combined-invoice`, {
                    params: {
                        driverId: driversList.map((driver) => driver._id),
                        startDay: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                        endDay: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                    },
                });
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
                setSchedules(response.data);
                setCacheRangeOption(rangeOptions);
            } catch (error) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        const debouncedFetchSchedules = debounce(fetchSchedules, 20);

        // Check if driversList has changed by comparing with previous value
        // const driversListChanged = JSON.stringify(driversList) !== JSON.stringify(prevDriversList.current);
        // prevDriversList.current = driversList;

        // // Check if rangeOptions change requires a fetch
        // const shouldFetchRange =
        //     !cacheRangeOption ||
        //     !Object.keys(cacheRangeOption).includes(selectedRangeIndex) ||
        //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
        //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === Object.keys(cacheRangeOption).length - 1;

        // // Fetch if driversList changed or rangeOptions change requires it
        // if (driversListChanged || shouldFetchRange) {
        debouncedFetchSchedules();
        return () => debouncedFetchSchedules.cancel(); // Cleanup on unmount
    }, [rangeOptions, driversList]);

    //Track range type changes
    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions, rangeType, prevRangeType]);

    /**
     * Handlers for invoice operations
     */
    const handleShowDetails = async (schedule, driver, invoice) => {
        const { _id, user_ID, firstName, lastName, Email, typeOfDriver } = driver;
        const { day, site, week, service } = schedule;

        const rateCard = rateCardFinder(day, ratecards, week, service, driver);
        const deductions = await getDeductionDetails(_id, day);
        const incentives = await getIncentiveDetails(_id, service, site, new Date(day));

        const totalIncentiveforMain = incentives.reduce(
            (sum, inc) => sum + Number(inc.rate || 0),
            0
        );

        const totalDeductions = deductions?.reduce(
            (sum, ded) => sum + Number(ded.rate || 0),
            0
        );

        if (invoice) {
            setRotaDetail({
                dayInvoice: { driver, ...invoice },
                deductions: deductions,
                incentiveDetailforMain: invoice.incentiveDetailforMain ? invoice.incentiveDetailforMain : incentives,
                existingInvoice: true
            });
            return;
        }

        const dayInvoice = {
            driver,
            driverId: _id,
            user_ID,
            driverName: `${firstName} ${lastName}`,
            driverEmail: Email,
            driverVehicleType: getDriverTypeForDate(driver, day),
            date: new Date(day),
            site,
            serviceWeek: week,
            mainService: service,
            serviceRateforMain: rateCard?.serviceRate || 0,
            byodRate: rateCard?.byodRate || 0,
            mileage: rateCard?.mileage || 0,
            miles: service === 'Route Support' ? 0 : '',
            calculatedMileage: service === 'Route Support' ? 0 : '',
            additionalServiceApproval: '',
            deductionDetail: deductions,
            rateCardIdforMain: rateCard?._id,
            incentiveDetailforMain: incentives,
            approvalStatus: "Access Requested",
            total: service === 'Route Support' ? Number((totalIncentiveforMain - totalDeductions).toFixed(2)) : 0,
        };

        setRotaDetail({
            dayInvoice,
            deductions,
            incentives,
            existingInvoice: false
        });
    };

    const handleAdditionalService = async (additionalService) => {
        if (!rotaDetail) return;

        const { serviceWeek, driverVehicleType, date, site, driver } = rotaDetail.dayInvoice;
        const isAdmin = hasAdminPrivileges(userDetails.role);
        let rateCardIdforAdditional = null;
        const incentiveDetailforAdditional = await getIncentiveDetails(driver._id, additionalService, site, new Date(date));

        setRotaDetail((prev) => {
            const prevAdditionalServiceDetails = prev.dayInvoice.additionalServiceDetails || {};
            const prevAdditionalServiceTotal = Number(
                (Number(prevAdditionalServiceDetails.serviceRate || 0) +
                    Number(prevAdditionalServiceDetails.byodRate || 0) +
                    Number(prevAdditionalServiceDetails.calculatedMileage || 0) +
                    Number(prev.dayInvoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)
                ).toFixed(2)
            );

            let additionalServiceDetails = null;
            if (additionalService) {
                const additionalServiceRatecard = rateCardFinder(
                    date,
                    ratecards,
                    serviceWeek,
                    additionalService,
                    driver
                );
                rateCardIdforAdditional = additionalServiceRatecard?._id
                additionalServiceDetails = {
                    service: additionalService,
                    serviceRate: additionalService === 'Other' ? 0 : additionalServiceRatecard?.serviceRate || 0,
                    byodRate: additionalService === 'Other' ? 0 : additionalServiceRatecard?.byodRate || 0,
                    mileage: additionalService === 'Other' ? 0 : additionalServiceRatecard?.mileage || 0,
                    miles: 0,
                    calculatedMileage: 0,
                };
            }

            const newAdditionalServiceTotal = additionalServiceDetails
                ? Number(
                    (Number(additionalServiceDetails.serviceRate || 0) +
                        Number(additionalServiceDetails.byodRate || 0) +
                        Number(additionalServiceDetails.calculatedMileage || 0) +
                        Number(incentiveDetailforAdditional.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)).toFixed(2)

                )
                : 0;


            return {
                ...prev,
                dayInvoice: {
                    ...prev.dayInvoice,
                    rateCardIdforAdditional,
                    incentiveDetailforAdditional: incentiveDetailforAdditional,
                    additionalServiceApproval: additionalService ? 'Request' : '',
                    serviceRateforAdditional: isAdmin ? newAdditionalServiceTotal : 0,
                    total: isAdmin || prev.dayInvoice.additionalServiceApproval === 'Approved'
                        ? Number((prev.dayInvoice.total - prevAdditionalServiceTotal + newAdditionalServiceTotal).toFixed(2))
                        : prev.dayInvoice.total,
                    additionalServiceDetails,
                },
            };
        });
    };

    const handleAdditionalServiceFieldChange = (field, value) => {
        const parsedValue = Number(value) || 0;
        if (parsedValue < 0) return;

        const isAdmin = hasAdminPrivileges(userDetails.role);

        setRotaDetail((prev) => {
            const prevAdditionalServiceDetails = prev.dayInvoice.additionalServiceDetails || {};
            const prevAdditionalServiceTotal = Number(
                (Number(prevAdditionalServiceDetails.serviceRate || 0) +
                    Number(prevAdditionalServiceDetails.byodRate || 0) +
                    Number(prevAdditionalServiceDetails.calculatedMileage || 0) +
                    Number(prev.dayInvoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)).toFixed(2)
            )

            const updatedAdditionalServiceDetails = {
                ...prevAdditionalServiceDetails,
                [field]: parsedValue,
            };

            if (field === 'miles' || field === 'mileage') {
                updatedAdditionalServiceDetails.calculatedMileage = Number(
                    (updatedAdditionalServiceDetails.miles * updatedAdditionalServiceDetails.mileage).toFixed(2)
                );
            }

            const newAdditionalServiceTotal = Number(
                (Number(updatedAdditionalServiceDetails.serviceRate || 0) +
                    Number(updatedAdditionalServiceDetails.byodRate || 0) +
                    Number(updatedAdditionalServiceDetails.calculatedMileage || 0) +
                    Number(prev.dayInvoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)).toFixed(2)

            );

            return {
                ...prev,
                dayInvoice: {
                    ...prev.dayInvoice,
                    serviceRateforAdditional: isAdmin ? newAdditionalServiceTotal : 0,
                    total: isAdmin || prev.dayInvoice.additionalServiceApproval === 'Approved'
                        ? Number((prev.dayInvoice.total - prevAdditionalServiceTotal + newAdditionalServiceTotal).toFixed(2))
                        : prev.dayInvoice.total,
                    additionalServiceDetails: updatedAdditionalServiceDetails,
                },
            };
        });

        setErrors((prev) => ({ ...prev, [field]: false }));
    };

    const validateFields = () => {
        const newErrors = {};

        if (rotaDetail?.dayInvoice?.mainService !== 'Route Support' && (rotaDetail?.dayInvoice?.miles === '' || Number(rotaDetail?.dayInvoice?.miles) === 0)) {
            newErrors['milesDriven'] = true;
        }

        if (rotaDetail?.dayInvoice?.total < 0) {
            newErrors['total'] = true;
        }

        if (rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Route Support') {

            if (rotaDetail?.dayInvoice?.additionalServiceDetails && Number(rotaDetail?.dayInvoice?.additionalServiceDetails?.miles) === 0) {
                newErrors['milesDrivenAdditional'] = true;
            }

            if (rotaDetail?.dayInvoice?.additionalServiceDetails?.service === 'Other') {
                if (!rotaDetail?.dayInvoice?.additionalServiceDetails?.serviceRate) {
                    newErrors['serviceRate'] = true;
                }
                if (!rotaDetail?.dayInvoice?.additionalServiceDetails?.byodRate) {
                    newErrors['byodRate'] = true;
                }
                if (!rotaDetail?.dayInvoice?.additionalServiceDetails?.mileage) {
                    newErrors['mileage'] = true;
                }
            }
        }
        setErrors(newErrors);

        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitInvoice = async (e) => {
        if (!validateFields()) return;

        try {
            const isAdmin = hasAdminPrivileges(userDetails.role);
            let response = '';
            const userMeta = e.target.name === 'add'
                ? { addedBy: { userName: userDetails.userName, addedOn: new Date() } }
                : { modifiedBy: { userName: userDetails.userName, modifiedOn: new Date() } };

            const payload = {
                ...rotaDetail.dayInvoice,
                ...userMeta,
                additionalServiceApproval: getApprovalStatus(rotaDetail.dayInvoice.additionalServiceApproval, isAdmin)
            };

            if (e.target.name === 'add') {
                response = await axios.post(`${API_BASE_URL}/api/dayInvoice/`, payload);
            } else {
                response = await axios.put(`${API_BASE_URL}/api/dayInvoice/${rotaDetail.dayInvoice._id}`, payload);
            }

            if (payload.additionalServiceApproval === 'Requested' && !isAdmin) {
                await axios.post(`${API_BASE_URL}/api/approvals`, {
                    type: "additionalService",
                    reqData: {
                        dayInvoiceId: response.data._id,
                        // additionalServiceDetails: rotaDetail.dayInvoice.additionalServiceDetails,
                        details: `Additional Service addition requested for: \n${response.data.driverName} for ${response.data.site} on ${new Date(response.data.date).toLocaleDateString()} by ${userDetails.userName}`
                    },
                });
            }

            const dateObj = new Date(rotaDetail.dayInvoice.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${rotaDetail.dayInvoice.driverId}`;

            setScheduleMap(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    invoice: response.data
                }
            }));
            setRotaDetail(null);
            setToastOpen({
                content: <>
                    <SuccessTick width={20} height={20} />
                    <p className='text-sm font-bold text-green-500'>Rota added successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            setRotaDetail(null);
            setToastOpen({
                content: <>
                    <p className='flex gap-1 text-sm font-bold text-red-600'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.response?.data?.message}</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        }
    };

    const handleDeleteInvoice = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/api/dayInvoice/`, {
                data: {
                    _id: rotaDetail.dayInvoice._id
                }
            });

            const dateObj = new Date(rotaDetail.dayInvoice.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${rotaDetail.dayInvoice.driverId}`;

            setScheduleMap(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    invoice: null
                }
            }));
            setRotaDetail(null);
            setToastOpen({
                content: <>
                    <TrashBin width={25} height={25} />
                    <p className='text-sm font-bold text-red-500'>Rota deleted successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);

        } catch (error) {
            setRotaDetail(null);
            setToastOpen({
                content: <>
                    <p className='flex gap-1 text-sm font-bold text-red-600'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.response?.data?.message}</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        }
    };

    const makeTotal = (mileValue) => {
        const dayInvoice = { ...rotaDetail.dayInvoice };
        const miles = mileValue
        const calculatedMileage = Number((miles * dayInvoice.mileage).toFixed(2));

        const totalDeductions = dayInvoice.deductionDetail?.reduce(
            (sum, ded) => sum + Number(ded.rate || 0),
            0
        );

        const totalIncentiveforMain = dayInvoice.incentiveDetailforMain?.reduce(
            (sum, inc) => sum + Number(inc.rate || 0),
            0
        );


        const additionalServiceTotal = dayInvoice.additionalServiceDetails && dayInvoice.additionalServiceApproval === 'Approved'
            ? Number(
                (Number(dayInvoice.additionalServiceDetails.serviceRate || 0) +
                    Number(dayInvoice.additionalServiceDetails.byodRate || 0) +
                    Number(dayInvoice.additionalServiceDetails.calculatedMileage || 0) +
                    Number(dayInvoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)).toFixed(2)
            )
            : 0;

        const updatedInvoice = {
            ...dayInvoice,
            miles,
            calculatedMileage,
            total: Number(
                (dayInvoice.serviceRateforMain +
                    dayInvoice.byodRate +
                    calculatedMileage +
                    additionalServiceTotal +
                    totalIncentiveforMain -
                    totalDeductions).toFixed(2)
            ),
            approvalStatus: "Access Requested",
        };

        setRotaDetail((prev) => ({
            ...prev,
            dayInvoice: updatedInvoice,
        }));
    };

    /**
     * Generate table data for each driver
     */
    const tableData = (driver, day, disabledDriver, standbyDriver) => {
        const dateObj = new Date(day.date);
        const dateKey = dateObj.toLocaleDateString('en-UK');
        const key = `${dateKey}_${driver._id}`;

        const schedule = scheduleMap[key]?.schedule;
        const invoice = scheduleMap[key]?.invoice;
        const standbySchedule = standbydrivers.find((s) => {
            const sDate = new Date(s.day);
            const dDate = new Date(dateObj);
            return sDate.toDateString() === dDate.toDateString() && s.driverId === driver._id;
        });
        const streak = streaks[driver._id]?.[dateKey] || 0;
        const isToday = dateObj.toDateString() === new Date().toDateString();
        const cellClass = isToday ? 'bg-amber-100/30' : '';
        const notComplete = schedule?.status !== 'completed';
        const noRateCard = !rateCardFinder(schedule?.day, ratecards, schedule?.week, schedule?.service, driver);
        const isLocked = notComplete || (noRateCard && schedule?.service !== 'Route Support');
        const scheduleBelongtoSite = schedule?.site === selectedSite;

        const getBorderColor = (streak) => {
            if (streak < 3) return 'border-l-green-500/60';
            if (streak < 5) return 'border-l-yellow-500/60';
            return 'border-l-red-400';
        };

        const renderStandbyCell = ({ showSite = true }) => (
            <div className="relative flex justify-center h-full w-full">
                <div className="relative w-40 max-w-40 w-full h-full">
                    <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-amber-100 dark:border-dark-5 rounded-md text-sm p-2 bg-[repeating-linear-gradient(-45deg,#ffb9008f_0px,#ffb9008f_2px,transparent_2px,transparent_6px)]">
                        <div className="overflow-auto max-h-[4rem] bg-amber-400/50 rounded-md px-2 py-1 text-amber-700">
                            On Stand-By
                        </div>
                    </div>
                </div>
            </div>
        );

        const renderScheduleBox = ({ schedule, streak, showSite = true }) => {
            const borderColor = getBorderColor(streak);
            return (
                <div className="relative flex justify-center h-full w-full">
                    <div className="relative w-40 max-w-40 group">
                        <div
                            onClick={() => { if (!isLocked && scheduleBelongtoSite) handleShowDetails(schedule, driver, invoice) }}
                            className={`relative z-6 w-full h-full  flex gap-2 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5
                                ${!isLocked && scheduleBelongtoSite ? 'cursor-pointer' : ''}
                                border-l-4 ${borderColor} 
                                ${isLocked && 'border-[1.5px] border-dashed border-gray-400/70 [border-left-style:solid] text-gray-400/70'} 
                                rounded-md text-sm p-2 transition-all duration-300`}
                        >
                            <div className="overflow-auto max-h-[4rem]">
                                {schedule?.service} {showSite && !scheduleBelongtoSite ? <span className='bg-amber-400/40 rounded text-amber-800 text-[0.7rem] py-0.5 px-1'>{schedule.site}</span> : ''}
                            </div>
                            {scheduleBelongtoSite && <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-[7px]">
                                {invoice ? (
                                    <i className="flex items-center text-sky-500 fi fi-rr-paper-plane"></i>
                                ) : isLocked ? (
                                    <FaLock size={17} />
                                ) : (
                                    <FaUnlock className="text-orange-400" size={17} />
                                )}
                            </div>}
                        </div>
                        {scheduleBelongtoSite && <div className={`w-fit text-xs absolute z-15 bottom-1/2 left-1/2 -translate-x-1/2  translate-y-1/2 text-white bg-gray-400 rounded-md px-2 py-1 hidden ${isLocked && 'group-hover:block'}`}>
                            {notComplete ? 'Schedule not complete' : (noRateCard && schedule?.service !== 'Route Support') ? 'Ratecard unavailable' : ''}
                        </div>}
                    </div>
                </div>
            );
        };

        if (loading) {
            return <div className='h-full w-full rounded-md bg-gray-200 animate-pulse'></div>
        }
        else if (standbyDriver) {
            if (standbySchedule && !schedule) {
                return null
            }
            if (standbySchedule && schedule) {
                return (
                    <div key={day.date} className='w-full h-full'>
                        {renderScheduleBox({ schedule, streak, showSite: true })}
                    </div>
                );
            }
            return <td key={day.date} className={cellClass} />;
        }

        if (Object.keys(scheduleMap).length > 0 && standbySchedule && !schedule) {
            return (
                <div key={day.date} className='w-full h-full'>
                    {renderStandbyCell({ showSite: true })}
                </div>
            );
        }

        if (standbySchedule && schedule) {
            return (
                <div key={day.date} className='w-full h-full'>
                    {renderScheduleBox({ schedule, streak, showSite: true })}
                </div>
            );
        }

        if (!schedule) {
            return <td key={day.date} className={cellClass} />;
        }

        if (schedule && schedule.service === 'Voluntary-Day-off') {
            return (
                <div key={day.date} className='h-full w-full' >
                    <div className="relative flex justify-center h-full w-full">
                        <div className="relative max-w-40">
                            <div className="relative z-6 w-full h-full flex gap-1 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-50 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 px-4 transition-all duration-300 bg-[repeating-linear-gradient(-45deg,#e4e4e4_0px,#e4e4e4_2px,transparent_2px,transparent_6px)]">
                                <div className="overflow-auto max-h-[4rem]">{schedule.service}</div>
                            </div>
                        </div>
                    </div>
                </div >
            );
        }

        return (
            <div key={day.date} className='h-full w-full'>
                {renderScheduleBox({ schedule, streak, showSite: true })}
            </div>
        );
    };



    const getApprovalStatusMessage = (status) => {
        switch (status) {
            case 'Request':
                return 'Service will be added after successful approval';
            case 'Requested':
                return 'Waiting for additional service approval';
            case 'Approved':
                return 'Successfully Approved';
            default:
                return '';
        }
    };

    const getApprovalStatusStyles = (status) => {
        switch (status) {
            case 'Request':
                return 'bg-amber-200/40 text-amber-700 border-amber-700';
            case 'Requested':
                return 'bg-sky-200/40 text-sky-700 border-sky-700';
            case 'Approved':
                return 'bg-green-200/40 text-green-700 border-green-700';
            default:
                return '';
        }
    };

    return (
        <>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-4 justify-around items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <div className={`${loading ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 text-gray-500 justify-around items-center'>
                    <Spinner /> Processing...
                </div>
            </div>

            <TableStructure
                title="Rota"
                state={state}
                setters={setters}
                tableData={tableData}
            />

            {/* Invoice Modal */}
            <Modal isOpen={rotaDetail}>
                <div className="relative flex flex-col justify-center items-center w-300">
                    <div className="w-full px-5 py-2 border-b border-neutral-200 dark:border-dark-5">
                        <h2>Invoice Generation</h2>
                    </div>


                    <div className="px-5 py-3 flex flex-col gap-3 max-h-[40rem] overflow-auto pb-35 w-full">

                        <div className=' w-full p-4 rounded-lg border-[1.5px] border-neutral-300 grid grid-cols-1 md:grid-cols-4 gap-4'>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Personnel Name</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {rotaDetail?.dayInvoice.driverName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {new Date(rotaDetail?.dayInvoice.date).toLocaleDateString()}
                                </p>
                            </div>
                            {rotaDetail?.dayInvoice?.addedBy?.addedOn && (<div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Date Added</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {new Date(rotaDetail?.dayInvoice?.addedBy?.addedOn).toLocaleString()}
                                </p>
                            </div>)}
                            {rotaDetail?.dayInvoice?.modifiedBy?.modifiedOn && (<div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Date Modified</p>
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {new Date(rotaDetail?.dayInvoice?.modifiedBy?.modifiedOn).toLocaleString()}
                                </p>
                            </div>)}
                        </div>
                        <h1 className="text-xl font-bold border-b border-neutral-300">Main Service</h1>

                        {/* Main Service Section */}
                        <InputGroup
                            label="Service Title - Main"
                            disabled={true}
                            value={rotaDetail?.dayInvoice.mainService}
                        />

                        {rotaDetail?.dayInvoice?.mainService !== 'Route Support' &&
                            <>
                                {/* Ratecard Details */}
                                <InputWrapper title="Ratecard Details" gridCols={4} colspan={3}>
                                    <InputGroup
                                        icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                        iconPosition="left"
                                        label="Service Rate"
                                        disabled={true}
                                        value={rotaDetail?.dayInvoice.serviceRateforMain}
                                    />
                                    <InputGroup
                                        icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                        iconPosition="left"
                                        label="Byod Rate"
                                        disabled={true}
                                        value={rotaDetail?.dayInvoice.byodRate}
                                    />
                                    <InputGroup
                                        icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                        iconPosition="left"
                                        label="Mileage per mile"
                                        disabled={true}
                                        value={rotaDetail?.dayInvoice.mileage}
                                    />
                                    <InputGroup
                                        icon={<FaTruck className="text-neutral-300" size={20} />}
                                        iconPosition="left"
                                        label="Vehicle Type"
                                        disabled={true}
                                        value={rotaDetail?.dayInvoice.driverVehicleType}
                                    />
                                </InputWrapper>

                                {/* Mileage Calculation */}
                                <InputWrapper title="Calculate Mileage" gridCols={2} colspan={3}>
                                    <div>
                                        <InputGroup
                                            required={true}
                                            error={errors.milesDriven}
                                            name="milesDriven"
                                            label="Miles driven"
                                            type="number"
                                            min={0}
                                            step="any"
                                            disabled={rotaDetail?.dayInvoice.additionalServiceApproval === 'Requested'}
                                            value={rotaDetail?.dayInvoice.miles > 0 ? rotaDetail?.dayInvoice.miles : ''}
                                            onChange={(e) => {
                                                makeTotal(e.target.value);
                                                setErrors(prev => ({ ...prev, milesDriven: false, total: false }));
                                            }}
                                        />
                                        {errors.milesDriven && (
                                            <p className="text-sm mt-1 text-red-500">*Enter the miles driven</p>
                                        )}
                                    </div>
                                    <InputGroup
                                        placeholder="Enter miles driven to calculate mileage"
                                        icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                        iconPosition="left"
                                        label="Calculated Mileage"
                                        type="number"
                                        disabled={true}
                                        value={rotaDetail?.dayInvoice.calculatedMileage > 0 ? rotaDetail?.dayInvoice.calculatedMileage : ''}
                                    />
                                </InputWrapper></>}

                        {/* Incentives Section */}

                        {rotaDetail?.dayInvoice?.incentiveDetailforMain?.length > 0 ? (
                            <InputWrapper title="Incentives">
                                {rotaDetail?.dayInvoice?.incentiveDetailforMain.map((inc) => (
                                    <div className='incentive-detail'>
                                        <InputGroup
                                            type="text"
                                            icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                            iconPosition="left"
                                            label={rotaDetail?.dayInvoice?.mainService === 'Route Support' ? 'Route Support Rate' : `${inc.type} Incentive for ${rotaDetail?.dayInvoice?.mainService}`}
                                            value={inc.rate}
                                            disabled
                                        />
                                    </div>))}
                            </InputWrapper>
                        ) : (rotaDetail?.dayInvoice?.mainService === 'Route Support' &&
                            <div className='border-2 border-neutral-300 rounded-lg p-5 flex justify-center items-center'>
                                <div className='bg-rose-300/30 px-2 py-1 rounded border border-rose-700 text-rose-700 w-fit'>Awaiting Route Support assignment</div>
                            </div>)}

                        {/* Deductions Section */}
                        {rotaDetail?.deductions?.length > 0 && (
                            <InputWrapper title="Deductions">
                                {rotaDetail?.dayInvoice.miles > 0 && rotaDetail?.dayInvoice.total < 0 && <div className='flex gap-1 text-sm text-red-500 bg-red-100/60 rounded-md px-2 py-1 border border-red-500 w-fit'><i class="flex items-center text-[0.8rem] fi fi-ss-triangle-warning"></i>Total deductions cannot reduce the final amount to below zero</div>}
                                {rotaDetail?.deductions?.map((ded) => (
                                    <div key={ded._id} className="flex items-center gap-5 justify-between">
                                        <div className="flex-1 grid grid-cols-[1fr_8fr_8fr] space-x-3">
                                            <div className='flex items-center justify-center mt-6'>
                                                <input className='h-[50%] w-4 accent-primary-400 rounded focus:ring-primary-400' type="checkbox" checked={rotaDetail?.dayInvoice.deductionDetail?.find((prevded) => prevded._id === ded._id)} disabled={!['super-admin', 'Admin'].includes(userDetails?.role) || ded.serviceType === 'Route Support'} onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setRotaDetail(prev => ({ ...prev, dayInvoice: { ...prev.dayInvoice, deductionDetail: [...prev.dayInvoice.deductionDetail, ded], total: +parseFloat(prev.dayInvoice.total - ded.rate).toFixed(2) } }))
                                                    } else {
                                                        setRotaDetail(prev => ({ ...prev, dayInvoice: { ...prev.dayInvoice, deductionDetail: prev.dayInvoice.deductionDetail.filter((prevded) => prevded._id !== ded._id), total: +parseFloat(prev.dayInvoice.total + ded.rate).toFixed(2) } }))
                                                    }

                                                }} />
                                            </div>
                                            <InputGroup disabled={true} label="Deduction Type" value={ded.serviceType} />
                                            <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Deduction amount" value={ded.rate} />
                                        </div>
                                        <div className="flex items-center justify-end self-end mb-4 text-xs w-15">
                                            {ded.signed ? (
                                                <p className="bg-green-400/30 text-green-700 px-2 py-1 rounded-md">Signed</p>
                                            ) : (
                                                <p className="bg-yellow-400/30 text-yellow-700 px-2 py-1 rounded-md">Unsigned</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </InputWrapper>
                        )}

                        {/* Additional Service Section */}
                        {(rotaDetail?.dayInvoice?.miles > 0 || rotaDetail?.dayInvoice?.mainService === 'Route Support') && (
                            <div>
                                <h1 className="text-xl font-bold border-b mb-2 border-neutral-300">Additional Service</h1>
                                <div className="w-full">
                                    <InputGroup
                                        type="dropdown"
                                        label="Services with Ratecard available"
                                        disabled={rotaDetail.dayInvoice?.additionalServiceDetails?.service && (((rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request') && !hasAdminPrivileges(userDetails?.role)) || rotaDetail.dayInvoice?.additionalServiceApproval === 'Requested')}
                                        value={rotaDetail?.dayInvoice?.additionalServiceDetails?.service || ''}
                                        onChange={(e) => handleAdditionalService(e.target.value)}
                                    >
                                        <option value=''>-Select service-</option>
                                        <option value="Other">Other</option>
                                        {rotaDetail?.dayInvoice?.mainService !== 'Route Support' && <option value="Route Support">Route Support</option>}
                                        {services.map((service) => {
                                            if (rateCardFinder(
                                                rotaDetail?.dayInvoice?.date,
                                                ratecards,
                                                rotaDetail?.dayInvoice?.serviceWeek,
                                                service.title,
                                                rotaDetail?.dayInvoice?.driver
                                            ) && service.title !== rotaDetail?.dayInvoice?.mainService) {
                                                return (
                                                    <option key={service._id} value={service.title}>
                                                        {service.title}
                                                    </option>
                                                );
                                            }
                                            return null;
                                        })}
                                    </InputGroup>

                                    {(rotaDetail?.dayInvoice?.additionalServiceDetails) && (
                                        <div className='flex flex-col gap-3 mt-3'>
                                            {(!hasAdminPrivileges(userDetails.role) || rotaDetail?.dayInvoice?.additionalServiceApproval === 'Requested') && (
                                                <div className='flex justify-start gap-2 items-center'>
                                                    <div
                                                        className={`text-sm w-fit my-4 px-2 py-1 rounded border ${getApprovalStatusStyles(rotaDetail.dayInvoice.additionalServiceApproval)}`}
                                                    >
                                                        {getApprovalStatusMessage(rotaDetail.dayInvoice.additionalServiceApproval)}
                                                    </div>
                                                    {rotaDetail.dayInvoice.additionalServiceApproval === 'Approved' && (
                                                        <button
                                                            onClick={() => setRotaDetail(prev => ({
                                                                ...prev,
                                                                dayInvoice: {
                                                                    ...prev.dayInvoice,
                                                                    serviceRateforAdditional: 0,
                                                                    total: parseFloat((prev.dayInvoice.total - prev.dayInvoice.serviceRateforAdditional).toFixed(2)),
                                                                    additionalServiceApproval: 'Request'
                                                                }
                                                            }))}
                                                        >
                                                            <i className="flex items-center text-[1.6rem] hover:text-amber-600 text-amber-500 fi fi-rr-pen-square"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            )}


                                            {/* Incentives Section */}
                                            {rotaDetail?.dayInvoice?.incentiveDetailforAdditional?.length > 0 ? (
                                                <InputWrapper title="Incentives">
                                                    {rotaDetail?.dayInvoice?.incentiveDetailforAdditional.map((inc) => (
                                                        <div className='incentive-detail'>
                                                            <InputGroup
                                                                type="text"
                                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                                iconPosition="left"
                                                                label={rotaDetail?.dayInvoice?.additionalServiceDetails?.service === 'Route Support' ? 'Route Support Rate' : `${inc.type} Incentive for ${rotaDetail?.dayInvoice?.additionalServiceDetails?.service}`}
                                                                value={inc.rate}
                                                                disabled
                                                            />
                                                        </div>))}
                                                </InputWrapper>
                                            ) : (rotaDetail?.dayInvoice?.additionalServiceDetails?.service === 'Route Support' &&
                                                <div className='border-2 border-neutral-300 rounded-lg p-5 flex justify-center items-center'>
                                                    <div className='bg-rose-300/30 px-2 py-1 rounded border border-rose-700 text-rose-700 w-fit'>Awaiting Route Support assignment</div>
                                                </div>)}


                                            {rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Route Support' &&
                                                <>
                                                    <InputWrapper title="Ratecard Details" gridCols={4} colspan={3}>
                                                        <div>
                                                            <InputGroup
                                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                                iconPosition="left"
                                                                label="Service Rate"
                                                                disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || ((rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request') && !hasAdminPrivileges(userDetails?.role)) || rotaDetail.dayInvoice?.additionalServiceApproval === 'Requested'}
                                                                type="number"
                                                                min={0}
                                                                name="serviceRate"
                                                                error={errors.serviceRate}
                                                                value={rotaDetail?.dayInvoice.additionalServiceDetails?.serviceRate > 0 ? rotaDetail?.dayInvoice.additionalServiceDetails?.serviceRate : ''}
                                                                onChange={(e) => handleAdditionalServiceFieldChange('serviceRate', e.target.value)}
                                                            />
                                                            {errors.serviceRate && (
                                                                <p className="text-sm mt-1 text-red-500">*Enter the service rate</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <InputGroup
                                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                                iconPosition="left"
                                                                label="Byod Rate"
                                                                disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || ((rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request') && !hasAdminPrivileges(userDetails?.role)) || rotaDetail.dayInvoice?.additionalServiceApproval === 'Requested'}
                                                                type="number"
                                                                min={0}
                                                                name="byodRate"
                                                                error={errors.byodRate}
                                                                value={rotaDetail?.dayInvoice.additionalServiceDetails?.byodRate > 0 ? rotaDetail?.dayInvoice.additionalServiceDetails?.byodRate : ''}
                                                                onChange={(e) => handleAdditionalServiceFieldChange('byodRate', e.target.value)}
                                                            />
                                                            {errors.byodRate && (
                                                                <p className="text-sm mt-1 text-red-500">*Enter the BYOD rate</p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <InputGroup
                                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                                iconPosition="left"
                                                                label="Mileage per mile"
                                                                disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || ((rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request') && !hasAdminPrivileges(userDetails?.role)) || rotaDetail.dayInvoice?.additionalServiceApproval === 'Requested'}
                                                                type="number"
                                                                min={0}
                                                                name="mileage"
                                                                error={errors.mileage}
                                                                value={rotaDetail?.dayInvoice.additionalServiceDetails?.mileage > 0 ? rotaDetail?.dayInvoice.additionalServiceDetails?.mileage : ''}
                                                                onChange={(e) => handleAdditionalServiceFieldChange('mileage', e.target.value)}
                                                            />
                                                            {errors.mileage && (
                                                                <p className="text-sm mt-1 text-red-500">*Enter the mileage rate</p>
                                                            )}
                                                        </div>
                                                        <InputGroup
                                                            icon={<FaTruck className="text-neutral-300" size={20} />}
                                                            iconPosition="left"
                                                            label="Vehicle Type"
                                                            disabled={true}
                                                            value={rotaDetail?.dayInvoice.driverVehicleType}
                                                        />
                                                    </InputWrapper>
                                                    <InputWrapper title="Calculate Mileage" gridCols={2} colspan={3}>
                                                        <div>
                                                            <InputGroup
                                                                required={true}
                                                                error={errors.milesDrivenAdditional}
                                                                name="milesDriven-additional"
                                                                label="Miles driven"
                                                                type="number"
                                                                min={0}
                                                                disabled={((rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request') && !hasAdminPrivileges(userDetails?.role)) || rotaDetail.dayInvoice?.additionalServiceApproval === 'Requested'}
                                                                value={rotaDetail?.dayInvoice?.additionalServiceDetails?.miles > 0 ? rotaDetail?.dayInvoice?.additionalServiceDetails?.miles : ''}
                                                                onChange={(e) => {
                                                                    handleAdditionalServiceFieldChange('miles', e.target.value);
                                                                    setErrors(prev => ({ ...prev, milesDrivenAdditional: false, total: false }));
                                                                }}
                                                            />
                                                            {errors.milesDrivenAdditional && (
                                                                <p className="text-sm mt-1 text-red-500">*Enter the miles driven</p>
                                                            )}
                                                        </div>
                                                        <InputGroup
                                                            placeholder="Enter miles driven to calculate mileage"
                                                            icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                            iconPosition="left"
                                                            label="Calculated Mileage"
                                                            type="number"
                                                            disabled={true}
                                                            value={rotaDetail?.dayInvoice?.additionalServiceDetails?.calculatedMileage > 0 ? rotaDetail?.dayInvoice?.additionalServiceDetails?.calculatedMileage : ''}
                                                        />
                                                    </InputWrapper></>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className={`z-7 absolute bottom-20 left-0 w-full md:w-[25rem] ${(rotaDetail?.dayInvoice?.calculatedMileage || (rotaDetail?.dayInvoice?.mainService === 'Route Support' && rotaDetail?.dayInvoice?.total > 0)) ? '-translate-y-0 opacity-100' : 'translate-y-5 opacity-0'} transition-all duration-200`}>
                        <div className='border-t border-x border-neutral-300 bg-white/70 dark:bg-dark-4/70 backdrop-blur-lg h-6 w-full rounded-t-2xl flex justify-center items-center p-1'>
                            <button onClick={() => setOpenTotalBreakdown(prev => !prev)} className={`px-7 py-1 hover:bg-gray-200 rounded-md ${openTotalBreakdown && 'rotate-180'}`}>
                                <FaChevronUp size={12} />
                            </button>
                        </div>
                        <div className={`bg-white dark:bg-dark-4 ${openTotalBreakdown ? 'h-[23rem] border' : 'h-0'} border-neutral-200 overflow-auto transition-all duration-300`}>
                            <TotalBreakdown {...rotaDetail?.dayInvoice} />
                        </div>
                    </div>

                    {/* Footer with Total and Actions */}
                    <div className="absolute bottom-0 bg-white/80 dark:bg-dark-4/80 backdrop-blur-lg z-10 w-full flex justify-between border-t gap-20 border-neutral-200 dark:border-dark-5 px-5 py-1">
                        <div className="flex items-center gap-5 mb-3 w-[50%]">
                            <label className="mt-3">Total:</label>
                            <div className='w-full'>
                                <InputGroup
                                    name="total"
                                    // error={errors.total}
                                    icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                    iconPosition="left"
                                    type="number"
                                    className='w-full'
                                    disabled={true}
                                    placeholder="Enter miles to calculate total"
                                    value={(rotaDetail?.dayInvoice.miles > 0 || rotaDetail?.dayInvoice?.mainService === 'Route Support') ? rotaDetail?.dayInvoice?.total : ''}
                                />
                                {/* {errors.total && (
                                    <p className="text-sm mt-1 text-red-500">*The total cannot be a negative value</p>
                                )} */}
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <button
                                className="px-2 py-1 h-fit bg-gray-500 rounded-md text-white hover:bg-gray-600"
                                onClick={() => {
                                    setRotaDetail(null);
                                    setOpenTotalBreakdown(false);
                                    setErrors({});
                                }}
                            >
                                Close
                            </button>
                            {rotaDetail?.existingInvoice ? (
                                <>
                                    <button
                                        disabled={rotaDetail?.dayInvoice.additionalServiceApproval === 'Requested'}
                                        className="px-2 h-fit py-1 bg-red-500 rounded-md text-white hover:bg-red-600 disabled:bg-gray-300"
                                        onClick={handleDeleteInvoice}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        name="edit"
                                        disabled={(rotaDetail?.dayInvoice.miles > 0 && rotaDetail?.dayInvoice.total < 0) || rotaDetail?.dayInvoice.additionalServiceApproval === 'Requested' || rotaDetail?.dayInvoice.mainService === 'Route Support' && rotaDetail?.dayInvoice.incentiveDetailforMain.length === 0 || (rotaDetail?.dayInvoice.additionalServiceDetails?.service === 'Route Support' && rotaDetail?.dayInvoice.incentiveDetailforAdditional.length === 0)}
                                        onClick={handleSubmitInvoice}
                                        className="px-2 h-fit py-1 bg-amber-500 rounded-md text-white hover:bg-amber-600 disabled:bg-gray-300"
                                    >
                                        Update
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="px-2 py-1 h-fit bg-primary-500 rounded-md text-white hover:bg-primary-600 disabled:bg-gray-300"
                                    name="add"
                                    disabled={(rotaDetail?.dayInvoice.miles > 0 && rotaDetail?.dayInvoice.total < 0) || rotaDetail?.dayInvoice.mainService === 'Route Support' && rotaDetail?.dayInvoice.incentiveDetailforMain.length === 0 || rotaDetail?.dayInvoice.additionalServiceDetails?.service === 'Route Support' && rotaDetail?.dayInvoice.incentiveDetailforAdditional.length === 0}
                                    onClick={handleSubmitInvoice}
                                >
                                    Initiate Invoice Request
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default Rota;