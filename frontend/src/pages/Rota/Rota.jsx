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
import { FaLock, FaUnlock } from "react-icons/fa6";
import { FaPoundSign, FaTruck } from 'react-icons/fa';

// Utils and Redux
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { getIncentiveDetails, getDeductionDetails, getInstallmentDetails } from './supportFunctions';

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
            const weekKey = sch.schedule.week;
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
        let installments = await getInstallmentDetails(_id);

        installments = installments.map((insta) => {
            const perDayInstallmentRate = Number(
                parseFloat(insta.spreadRate / weeklyMap[`${_id}_${week}`]).toFixed(2)
            );
            return { ...insta, perDayInstallmentRate };
        });

        if (invoice) {
            setRotaDetail({
                dayInvoice: invoice,
                installments,
                deductions,
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
            installmentDetail: installments,
            deductionDetail: deductions,
            total: 0,
        };

        setRotaDetail({
            dayInvoice,
            installments,
            deductions,
            existingInvoice: false
        });
    };

    const handleAdditionalService = (additionalService) => {
        if (!rotaDetail) return;

        const { serviceWeek, driverVehicleType } = rotaDetail.dayInvoice;
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
                serviceRate: (additionalService === 'Other') ? 0 : additionalServiceRatecard?.serviceRate || 0,
                byodRate: (additionalService === 'Other') ? 0 : additionalServiceRatecard?.byodRate || 0,
                mileage: (additionalService === 'Other') ? 0 : additionalServiceRatecard?.mileage || 0,
                miles: 0,
            };
        }

        setRotaDetail(prev => ({
            ...prev,
            dayInvoice: {
                ...prev.dayInvoice,
                additionalServiceDetails
            }
        }));
    };

    const handleAdditionalServiceFieldChange = (field, value) => {
        setRotaDetail(prev => ({
            ...prev,
            dayInvoice: {
                ...prev.dayInvoice,
                additionalServiceDetails: {
                    ...prev.dayInvoice.additionalServiceDetails,
                    [field]: Number(value)
                }
            }
        }));
        setErrors(prev => ({ ...prev, [field]: false }));
    };

    const validateFields = () => {
        const newErrors = {};

        if (!rotaDetail?.dayInvoice?.miles) {
            newErrors['milesDriven'] = true;
        }

        if (rotaDetail?.dayInvoice?.total < 0) {
            newErrors['total'] = true;
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

    const handleAddInvoice = async () => {
        if (!validateFields()) return;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/dayInvoice/`,
                rotaDetail.dayInvoice
            );

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
                    driverId: rotaDetail.dayInvoice.driverId,
                    date: rotaDetail.dayInvoice.date,
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
        const calculatedMileage = miles * dayInvoice.mileage;

        const totalPerDayInstallment = dayInvoice.installmentDetail?.reduce((sum, insta) => {
            return sum + parseFloat(insta.perDayInstallmentRate || 0);
        }, 0);

        const totalDeductions = dayInvoice.deductionDetail?.reduce((sum, ded) => {
            return sum + parseFloat(ded.rate || 0);
        }, 0);

        const additionalServiceTotal = dayInvoice.additionalServiceDetails
            ? (Number(dayInvoice.additionalServiceDetails.serviceRate || 0) +
                Number(dayInvoice.additionalServiceDetails.byodRate || 0) +
                Number(dayInvoice.additionalServiceDetails.miles || 0) * Number(dayInvoice.additionalServiceDetails.mileage || 0))
            : 0;

        const updatedInvoice = {
            ...dayInvoice,
            miles,
            calculatedMileage,
            total: Number(
                (dayInvoice.serviceRateforMain +
                    dayInvoice.byodRate +
                    calculatedMileage +
                    additionalServiceTotal -
                    totalPerDayInstallment -
                    totalDeductions).toFixed(2)
            ),
            approvalStatus: "Access Requested"
        };

        setRotaDetail(prev => ({
            ...prev,
            dayInvoice: updatedInvoice
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
        const isLocked = schedule?.status !== 'completed';

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
                ${borderColor} 
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

                    <div className="px-5 py-3 flex flex-col gap-3 max-h-[35rem] overflow-auto pb-10">
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
                                    value={rotaDetail?.dayInvoice.miles}
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
                                value={rotaDetail?.dayInvoice.calculatedMileage}
                            />
                        </InputWrapper>

                        {/* Installments Section */}
                        {rotaDetail?.installments?.length > 0 && (
                            <InputWrapper title="Instalments">
                                {rotaDetail?.installments?.map((insta) => (
                                    <div key={insta._id} className="flex items-center gap-5 justify-between">
                                        <input
                                            type="checkbox"
                                            className="h-[50%] self-end mb-2 w-4 accent-primary-400 rounded focus:ring-primary-400"
                                            checked={rotaDetail?.dayInvoice?.installmentDetail?.some(i => i._id === insta._id)}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                const updatedInstallments = isChecked
                                                    ? [...(rotaDetail?.dayInvoice?.installmentDetail || []), insta]
                                                    : rotaDetail?.dayInvoice?.installmentDetail?.filter(i => i._id !== insta._id);

                                                setRotaDetail(prev => {
                                                    const currentTotal = Number(prev.dayInvoice?.total || 0);
                                                    const rate = Number(insta?.perDayInstallmentRate || 0);
                                                    const newTotal = isChecked ? currentTotal - rate : currentTotal + rate;

                                                    return {
                                                        ...prev,
                                                        dayInvoice: {
                                                            ...prev.dayInvoice,
                                                            installmentDetail: updatedInstallments,
                                                            total: Number(newTotal.toFixed(2))
                                                        }
                                                    };
                                                });
                                            }}
                                        />
                                        <div className="grid grid-cols-4 space-x-3">
                                            <InputGroup disabled={true} label="Instalment Type" value={insta.installmentType} />
                                            <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Instalment Total" value={insta.installmentRate} />
                                            <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Instalment Rate" value={insta.spreadRate} />
                                            <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Instalment Deducted" value={insta.perDayInstallmentRate} />
                                        </div>
                                        <div className="flex items-center justify-end self-end mb-4 text-xs w-15">
                                            {insta.signed ? (
                                                <p className="bg-green-400/30 text-green-700 px-2 py-1 rounded-md">Signed</p>
                                            ) : (
                                                <p className="bg-yellow-400/30 text-yellow-700 px-2 py-1 rounded-md">Unsigned</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </InputWrapper>
                        )}

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
                        <div>
                            <h1 className="text-xl font-bold">Additional Service</h1>
                            <div className="w-full">
                                <InputGroup
                                    type="dropdown"
                                    label="Services with Ratecard available"
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
                                        <InputWrapper title="Ratecard Details" gridCols={4} colspan={3}>
                                            <div>
                                                <InputGroup
                                                    icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                    iconPosition="left"
                                                    label="Service Rate"
                                                    disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other'}
                                                    type="number"
                                                    min={0}
                                                    name="serviceRate"
                                                    error={errors.serviceRate}
                                                    value={rotaDetail?.dayInvoice.additionalServiceDetails?.serviceRate}
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
                                                    disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other'}
                                                    type="number"
                                                    min={0}
                                                    name="byodRate"
                                                    error={errors.byodRate}
                                                    value={rotaDetail?.dayInvoice.additionalServiceDetails?.byodRate}
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
                                                    disabled={rotaDetail?.dayInvoice?.additionalServiceDetails?.service !== 'Other'}
                                                    type="number"
                                                    min={0}
                                                    name="mileage"
                                                    error={errors.mileage}
                                                    value={rotaDetail?.dayInvoice.additionalServiceDetails?.mileage}
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
                                                    error={errors.milesDriven}
                                                    name="milesDriven-additional"
                                                    label="Miles driven"
                                                    type="number"
                                                    min={0}
                                                    value={rotaDetail?.dayInvoice?.additionalServiceDetails?.miles}
                                                    onChange={(e) => {
                                                        handleAdditionalServiceFieldChange('miles', e.target.value);
                                                        makeTotal(rotaDetail?.dayInvoice?.miles);
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
                                                value={rotaDetail?.dayInvoice?.additionalServiceDetails?.miles * rotaDetail?.dayInvoice?.additionalServiceDetails?.mileage}
                                            />
                                        </InputWrapper>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer with Total and Actions */}
                    <div className="w-full flex justify-between border-t gap-8 border-neutral-200 dark:border-dark-5 px-5 py-1">
                        <div className="flex items-center gap-5 mb-3">
                            <label className="mt-3">Total:</label>
                            <div>
                                <InputGroup
                                    name="total"
                                    error={errors.total}
                                    icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                    iconPosition="left"
                                    type="number"
                                    disabled={true}
                                    value={rotaDetail?.dayInvoice?.total}
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
                                    setErrors({});
                                }}
                            >
                                Close
                            </button>
                            {rotaDetail?.existingInvoice ? (
                                <button
                                    className="px-2 h-fit py-1 bg-red-500 rounded-md text-white hover:bg-red-600"
                                    onClick={handleDeleteInvoice}
                                >
                                    Delete
                                </button>
                            ) : (
                                <button
                                    className="px-2 py-1 h-fit bg-primary-500 rounded-md text-white hover:bg-primary-600"
                                    onClick={handleAddInvoice}
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