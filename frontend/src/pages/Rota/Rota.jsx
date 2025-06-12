import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import axios from 'axios';

// Components
import TableStructure from '../../components/TableStructure/TableStructure';
import Modal from '../../components/Modal/Modal';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import InputGroup from '../../components/InputGroup/InputGroup';

// Icons
import { FaChevronUp, FaLock, FaUnlock } from "react-icons/fa6";
import { FaPoundSign, FaTruck } from 'react-icons/fa';

// Utils and Redux
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { getIncentiveDetails, getDeductionDetails, getInstallmentDetails } from './supportFunctions';
import TotalBreakdown from './TotalBreakdown';

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
const rateCardFinder = (ratecards, week, service, typeOfDriver) => {
    return ratecards.find(
        (rc) =>
            rc.serviceWeek === week &&
            rc.serviceTitle === service &&
            rc.vehicleType === typeOfDriver
    );
};

/**
 * Main Rota component
 */
const Rota = () => {
    // Redux state
    const dispatch = useDispatch();
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);

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
    const [weeklyMap, setWeeklyMap] = useState({});
    const [cacheRangeOption, setCacheRangeOption] = useState(null);
    const [prevRangeType, setPrevRangeType] = useState(rangeType);
    const [rotaDetail, setRotaDetail] = useState(null);
    const [errors, setErrors] = useState({});
    const [openTotalBreakdown, setOpenTotalBreakdown] = useState(false)

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
    }, [ratecardStatus, serviceStatus, dispatch]);

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
            // Build scheduleMap
            const dateKey = new Date(sch.day).toLocaleDateString('en-UK');
            const key = `${dateKey}_${sch.driverId}`;
            scheduleMap[key] = sch;

            // Build weeklyMap
            const weekKey = sch.schedule?.week;
            const driverKey = `${sch.driverId}_${weekKey}`;
            weeklyMap[driverKey] = (weeklyMap[driverKey] || 0) + 1;
        });

        setScheduleMap(scheduleMap);
        setWeeklyMap(weeklyMap);
    }, [schedules]);

    // Fetch schedules when range or drivers change
    useEffect(() => {
        const fetchSchedules = async () => {
            const rangeOptionsVal = Object.values(rangeOptions);
            const response = await axios.get(`${API_BASE_URL}/api/schedule/combined-invoice`, {
                params: {
                    driverId: driversList.map((driver) => driver._id),
                    startDay: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                    endDay: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                },
            });
            setSchedules(response.data);
        };

        if (driversList.length > 0 && rangeOptions) {
            const rangeOptionsVal = Object.values(rangeOptions);

            if (!cacheRangeOption) {
                fetchSchedules();
                setCacheRangeOption(rangeOptions);
            }
            else if (
                !Object.keys(cacheRangeOption).find((i) => i === selectedRangeIndex) ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)
            ) {
                fetchSchedules();
                setCacheRangeOption(rangeOptions);
            }
        }
    }, [rangeOptions, driversList, selectedRangeIndex, cacheRangeOption]);

    // Track range type changes
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

        const rateCard = rateCardFinder(ratecards, week, service, typeOfDriver);
        const deductions = await getDeductionDetails(_id, day);
        const incentives = await getIncentiveDetails(service, site, new Date(day))


        if (invoice) {
            setRotaDetail({
                dayInvoice: invoice,
                deductions: invoice.deductionDetail ? invoice.deductionDetail : deductions,
                incentiveDetailforMain: invoice.incentiveDetail ? invoice.incentiveDetail : incentives,
                existingInvoice: true
            });
            return;
        }

        const dayInvoice = {
            driverId: _id,
            user_ID,
            driverName: `${firstName} ${lastName}`,
            driverEmail: Email,
            driverVehicleType: typeOfDriver,
            date: day,
            site,
            serviceWeek: week,
            mainService: service,
            serviceRateforMain: rateCard?.serviceRate || 0,
            byodRate: rateCard?.byodRate || 0,
            mileage: rateCard?.mileage || 0,
            miles: '',
            calculatedMileage: '',
            additionalServiceApproval: '',
            deductionDetail: deductions,
            incentiveDetailforMain: incentives[0],
            total: 0,
        };

        setRotaDetail({
            dayInvoice,
            deductions,
            existingInvoice: false
        });
    };

    const handleAdditionalService = (additionalService) => {
        if (!rotaDetail) return;

        const { serviceWeek, driverVehicleType } = rotaDetail.dayInvoice;

        setRotaDetail((prev) => {
            const prevAdditionalServiceDetails = prev.dayInvoice.additionalServiceDetails || {};
            const prevAdditionalServiceTotal =
                Number((Number(prevAdditionalServiceDetails.serviceRate || 0) +
                    Number(prevAdditionalServiceDetails.byodRate || 0) +
                    Number(prevAdditionalServiceDetails.calculatedMileage || 0)).toFixed(2));

            let additionalServiceDetails = null;
            if (additionalService) {
                const additionalServiceRatecard = rateCardFinder(
                    ratecards,
                    serviceWeek,
                    additionalService,
                    driverVehicleType
                );
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
                ? Number((Number(additionalServiceDetails.serviceRate || 0) +
                    Number(additionalServiceDetails.byodRate || 0) +
                    Number(additionalServiceDetails.calculatedMileage || 0)).toFixed(2))
                : 0;

            return {
                ...prev,
                dayInvoice: {
                    ...prev.dayInvoice,
                    additionalServiceApproval: additionalService ? 'Request' : '',
                    serviceRateforAdditional: newAdditionalServiceTotal,
                    total: prev.dayInvoice.additionalServiceApproval === 'Approved' ? Number((prev.dayInvoice.total - prevAdditionalServiceTotal + newAdditionalServiceTotal).toFixed(2)) : prev.dayInvoice.total,
                    additionalServiceDetails,
                },
            };
        });
    };

    const handleAdditionalServiceFieldChange = (field, value) => {
        const parsedValue = Number(value) || 0; // Ensure valid number
        if (parsedValue < 0) return; // Prevent negative values

        setRotaDetail((prev) => {
            const prevAdditionalServiceDetails = prev.dayInvoice.additionalServiceDetails || {};
            const prevAdditionalServiceTotal =
                Number((Number(prevAdditionalServiceDetails.serviceRate || 0) +
                    Number(prevAdditionalServiceDetails.byodRate || 0) +
                    Number(prevAdditionalServiceDetails.calculatedMileage || 0)).toFixed(2));

            const updatedAdditionalServiceDetails = {
                ...prevAdditionalServiceDetails,
                [field]: parsedValue,
            };

            // Calculate mileage for additional service if miles or mileage changes
            if (field === 'miles' || field === 'mileage') {
                updatedAdditionalServiceDetails.calculatedMileage = Number(
                    (updatedAdditionalServiceDetails.miles * updatedAdditionalServiceDetails.mileage).toFixed(2)
                );
            }

            const newAdditionalServiceTotal =
                Number((Number(updatedAdditionalServiceDetails.serviceRate || 0) +
                    Number(updatedAdditionalServiceDetails.byodRate || 0) +
                    Number(updatedAdditionalServiceDetails.calculatedMileage || 0)).toFixed(2));

            return {
                ...prev,
                dayInvoice: {
                    ...prev.dayInvoice,
                    total: prev.dayInvoice.additionalServiceApproval === 'Approved' ? Number((prev.dayInvoice.total - prevAdditionalServiceTotal + newAdditionalServiceTotal).toFixed(2)) : prev.dayInvoice.total,
                    additionalServiceDetails: updatedAdditionalServiceDetails,
                },
            };
        });

        setErrors((prev) => ({ ...prev, [field]: false }));
    };

    const validateFields = () => {
        const newErrors = {};
        if (rotaDetail?.dayInvoice?.miles === '' || Number(rotaDetail?.dayInvoice?.miles) === 0) {
            newErrors['milesDriven'] = true;
        }

        if (rotaDetail?.dayInvoice?.total < 0) {
            newErrors['total'] = true;
        }

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
            let response = ''
            if (e.target.name === 'add') {
                response = await axios.post(
                    `${API_BASE_URL}/api/dayInvoice/`,
                    {
                        ...rotaDetail.dayInvoice,
                        additionalServiceApproval: rotaDetail.dayInvoice.additionalServiceApproval === 'Request' ? 'Requested' : rotaDetail.dayInvoice.additionalServiceApproval
                    }
                );
            }
            else {
                response = await axios.put(
                    `${API_BASE_URL}/api/dayInvoice/${rotaDetail.dayInvoice._id}`,
                    {
                        ...rotaDetail.dayInvoice,
                        additionalServiceApproval: rotaDetail.dayInvoice.additionalServiceApproval === 'Request' ? 'Requested' : rotaDetail.dayInvoice.additionalServiceApproval
                    }
                );
            }
            if (rotaDetail.dayInvoice.additionalServiceApproval === 'Request') {
                const approvalResponse = await axios.post(`${API_BASE_URL}/api/approvals`, {
                    type: "additionalService",
                    reqData: { dayInvoiceId: response.data._id, additionalServiceDetails: rotaDetail.dayInvoice.additionalServiceDetails, details: "Additional Service addition requested for: \n" + response.data.driverName + ' for ' + response.data.site + ' on ' + new Date(response.data.date).toLocaleDateString() },
                })
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
        } catch (error) {
            alert(error + "error");
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
        } catch (error) {
            alert(error + "error");
        }
    };

    const makeTotal = (mileValue) => {
        const dayInvoice = { ...rotaDetail.dayInvoice };
        const miles = mileValue ? mileValue : dayInvoice.miles;
        const calculatedMileage = Number((miles * dayInvoice.mileage).toFixed(2));


        const totalDeductions = dayInvoice.deductionDetail?.reduce(
            (sum, ded) => sum + Number(ded.rate || 0),
            0
        );

        const incentiveDetailforMain = dayInvoice.incentiveDetailforMain ? dayInvoice.incentiveDetailforMain.rate : 0

        const additionalServiceTotal = dayInvoice.additionalServiceDetails && dayInvoice.additionalServiceApproval === 'Approved'
            ? Number((Number(dayInvoice.additionalServiceDetails.serviceRate || 0) +
                Number(dayInvoice.additionalServiceDetails.byodRate || 0) +
                Number(dayInvoice.additionalServiceDetails.calculatedMileage || 0)).toFixed(2))
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
                    incentiveDetailforMain -
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
     * Render table cell for each day
     */
    const renderTableCell = (driver, day) => {
        const dateObj = new Date(day.date);
        const dateKey = dateObj.toLocaleDateString('en-UK');
        const key = `${dateKey}_${driver._id}`;

        const schedule = scheduleMap[key]?.schedule;
        const invoice = scheduleMap[key]?.invoice;
        const streak = streaks[driver._id]?.[dateKey] || 0;
        const isToday = dateObj.toDateString() === new Date().toDateString();
        const cellClass = isToday ? 'bg-amber-100/30' : '';
        const isLocked = schedule?.status !== 'completed'

        if (!schedule) return <td key={day.date} className={cellClass} />;

        const borderColor = streak < 3 ? 'border-l-green-500/60' :
            streak < 5 ? 'border-l-yellow-500/60' :
                'border-l-red-400';
        return (
            <td key={day.date} className={cellClass}>
                <div className="relative flex justify-center h-full w-full">
                    <div className="relative max-w-40">
                        <div
                            onClick={() => { if (!isLocked) handleShowDetails(schedule, driver, invoice) }}
                            className={`relative z-6 w-full h-full shadow-md flex gap-2 items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5
                ${!isLocked ? 'cursor-pointer' : ''}
                border-l-4 ${borderColor} 
                ${isLocked && 'border-[1.5px] border-dashed border-gray-400/70 [border-left-style:solid] text-gray-400/70'} 
                rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}
                        >
                            <div className="overflow-auto max-h-[4rem]">{schedule?.service}</div>
                            <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-[7px]">
                                {invoice ? (
                                    <i className="flex items-center text-sky-500 fi fi-rr-paper-plane"></i>
                                ) : isLocked ? (
                                    <FaLock size={17} />
                                ) : (
                                    <FaUnlock className="text-orange-400" size={17} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        );
    };

    /**
     * Generate table data for each driver
     */
    const tableData = (driver) => {
        return days.map((day) => renderTableCell(driver, day));
    };

    return (
        <>
            <TableStructure
                title="Rota"
                state={state}
                setters={setters}
                tableData={tableData}
            />

            {/* Invoice Modal */}
            <Modal isOpen={rotaDetail}>
                <div className="relative flex flex-col justify-center items-center">
                    <div className="w-full px-5 py-2 border-b border-neutral-200 dark:border-dark-5">
                        <h2>Invoice Generation</h2>
                    </div>

                    <div className="px-5 py-3 flex flex-col gap-3 max-h-[40rem] overflow-auto pb-35">
                        <h1 className="text-xl font-bold border-b border-neutral-300 ">Main Service</h1>

                        {/* Main Service Section */}
                        <InputGroup
                            label="Service Title - Main"
                            disabled={true}
                            value={rotaDetail?.dayInvoice.mainService}
                        />

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
                                    value={rotaDetail?.dayInvoice.miles > 0 ? rotaDetail?.dayInvoice.miles : ''}
                                    onChange={(e) => {
                                        makeTotal(e.target.value);
                                        setErrors(prev => ({ ...prev, milesDriven: false, total: false }))
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
                        </InputWrapper>

                        {/* Incentives Section */}
                        {(rotaDetail?.dayInvoice?.incentiveDetailforMain) &&
                            (<div className='incentive-detail'>
                                <label></label>
                                <InputGroup type="text" icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                    iconPosition="left" label={`${rotaDetail?.dayInvoice?.incentiveDetailforMain.type} Incentive`} value={rotaDetail?.dayInvoice?.incentiveDetailforMain.rate} disabled /> </div>)
                        }

                        {/* Deductions Section */}
                        {rotaDetail?.deductions?.length > 0 && (
                            <InputWrapper title="Deductions">
                                {rotaDetail?.deductions?.map((ded) => (
                                    <div key={ded._id} className="flex items-center gap-5 justify-between">
                                        <input
                                            className="h-[50%] self-end mb-2 w-4 accent-primary-400 rounded focus:ring-primary-400"
                                            type="checkbox"
                                            checked={rotaDetail?.dayInvoice?.deductionDetail?.some((d) => d._id === ded._id)}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                const updatedDeductions = isChecked
                                                    ? [...(rotaDetail?.dayInvoice?.deductionDetail || []), ded]
                                                    : rotaDetail?.dayInvoice?.deductionDetail?.filter(d => d._id !== ded._id);

                                                setRotaDetail(prev => {
                                                    const currentTotal = Number(prev.dayInvoice?.total || 0);
                                                    const rate = Number(ded?.rate || 0);
                                                    const newTotal = isChecked ? currentTotal - rate : currentTotal + rate;

                                                    return {
                                                        ...prev,
                                                        dayInvoice: {
                                                            ...prev.dayInvoice,
                                                            deductionDetail: updatedDeductions,
                                                            total: Number(newTotal.toFixed(2))
                                                        }
                                                    };
                                                });
                                            }}
                                        />
                                        <div className="flex-1 grid grid-cols-2 space-x-3">
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
                        {rotaDetail?.dayInvoice?.miles > 0 &&
                            <div>
                                <h1 className="text-xl font-bold border-b mb-2 border-neutral-300">Additional Service</h1>
                                <div className="w-full">
                                    <InputGroup
                                        type="dropdown"
                                        label="Services with Ratecard available"
                                        value={rotaDetail?.dayInvoice?.additionalServiceDetails?.service}
                                        onChange={(e) => handleAdditionalService(e.target.value)}
                                    >
                                        <option value=''>-Select service-</option>
                                        <option value="Other">Other</option>
                                        {services.map((service) => {
                                            if (rateCardFinder(
                                                ratecards,
                                                rotaDetail?.dayInvoice?.serviceWeek,
                                                service.title,
                                                rotaDetail?.dayInvoice?.driverVehicleType
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

                                    {rotaDetail?.dayInvoice?.additionalServiceDetails && (
                                        <>
                                            {rotaDetail?.dayInvoice?.additionalServiceApproval && (
                                                <div className='flex justify-start gap-2 items-center'>
                                                    <div
                                                        className={`text-sm w-fit my-4 px-2 py-1 rounded border ${rotaDetail.dayInvoice.additionalServiceApproval === 'Request'
                                                            ? 'bg-amber-200/40 text-amber-700 border-amber-700'
                                                            : rotaDetail.dayInvoice.additionalServiceApproval === 'Requested'
                                                                ? 'bg-sky-200/40 text-sky-700 border-sky-700'
                                                                : 'bg-green-200/40 text-green-700 border-green-700'
                                                            }`}
                                                    >
                                                        {rotaDetail.dayInvoice.additionalServiceApproval === 'Request'
                                                            ? 'Service will be added after successful approval'
                                                            : rotaDetail.dayInvoice.additionalServiceApproval === 'Requested'
                                                                ? 'Waiting for additional service approval'
                                                                : 'Successfully Approved'}
                                                    </div>
                                                    {rotaDetail.dayInvoice.additionalServiceApproval === 'Approved' && <button onClick={() => setRotaDetail(prev => ({ ...prev, dayInvoice: { ...prev.dayInvoice, serviceRateforAdditional: 0, total: prev.dayInvoice.total - prev.dayInvoice.serviceRateforAdditional, additionalServiceApproval: 'Request' } }))}><i class="flex items-center text-[1.6rem] hover:text-amber-600 text-amber-500 fi fi-rr-pen-square"></i></button>}
                                                </div>
                                            )}

                                            <InputWrapper title="Ratecard Details" gridCols={4} colspan={3}>
                                                <div>
                                                    <InputGroup
                                                        icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                        iconPosition="left"
                                                        label="Service Rate"
                                                        disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request'}
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
                                                        disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request'}
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
                                                        disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other' || rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request'}
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
                                                        disabled={rotaDetail.dayInvoice?.additionalServiceApproval !== 'Request'}
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
                                            </InputWrapper>
                                        </>
                                    )}
                                </div>
                            </div>}
                    </div>
                    <div className={`z-7 absolute bottom-21 left-0 w-full md:w-[25rem] ${rotaDetail?.dayInvoice?.calculatedMileage ? '-translate-y-0 opacity-100' : 'translate-y-5 opacity-0'} transition-all duration-200`}>
                        <div className='border-t border-x border-neutral-300 bg-white/70 dark:bg-dark-4/70 backdrop-blur-lg h-6 w-full rounded-t-2xl flex justify-center items-center p-1'><button onClick={() => setOpenTotalBreakdown(prev => !prev)} className={` px-7 py-1 hover:bg-gray-200 rounded-md ${openTotalBreakdown && 'rotate-180'}`}><FaChevronUp size={12} /></button></div>
                        <div className={`bg-white dark:bg-dark-4 ${openTotalBreakdown ? 'h-[23rem] border' : 'h-0  '}  border-neutral-200 overflow-auto transition-all duration-300`}>
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
                                    error={errors.total}
                                    icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                    iconPosition="left"
                                    type="number"
                                    className='w-full'
                                    disabled={true}
                                    placeholder="Enter miles to calculate total"
                                    value={(rotaDetail?.dayInvoice?.total > 0) ? rotaDetail?.dayInvoice?.total : ''}
                                />
                                {errors.total && (
                                    <p className="text-sm mt-1 text-red-500">*The total cannot be a negative value</p>
                                )}
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
                                        className="px-2 h-fit py-1 bg-red-500 rounded-md text-white hover:bg-red-600"
                                        onClick={handleDeleteInvoice}
                                    >
                                        Delete
                                    </button>
                                    <button
                                        name="edit"
                                        onClick={handleSubmitInvoice}
                                        className="px-2 h-fit py-1 bg-amber-500 rounded-md text-white hover:bg-amber-600"
                                    >
                                        Update
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="px-2 py-1 h-fit bg-primary-500 rounded-md text-white hover:bg-primary-600"
                                    name="add"
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