// src/features/ratecards/RateCardForm.jsx
import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import RateCardWeek from '../../components/Calendar/RateCardWeek';
import WeekRangeDropdown from './WeekRangeDropdown';
import { FaPoundSign } from "react-icons/fa";
import Spinner from '../../components/UIElements/Spinner';

const RateCardForm = ({ ratecards, rateCard, setRateCard, clearRateCard, services, onAddRatecard, onUpdateRatecard, mode, setMode, loading, setConfirmModal }) => {
    const [newService, setNewService] = useState(false);
    const [newServiceInfo, setNewServiceInfo] = useState({
        title: '',
        hours: '',
        minutes: '0',
        totalHours: ''
    });
    const [errors, setErrors] = useState({
        vehicleType: false,
        minimumRate: false,
        serviceTitle: false,
        serviceRate: false,
        byodRate: false,
        serviceWeek: false,
        mileage: false,
        vanRent: false,
        vanRentHours: false,
        newService: false,
        hourlyRate: false,
        existingRateCard: false
    });
    const [breakdownHTML, setBreakdownHTML] = useState('');
    const [weekbyCalendar, setWeekbyCalendar] = useState(true);

    useEffect(() => {
        if (mode === 'edit') {
            setWeekbyCalendar(true)
        }
    }, [mode])

    useEffect(() => {
        if (mode !== 'edit')
            setRateCard(prev => ({ ...prev, serviceWeek: [] }))
    }, [weekbyCalendar])

    useEffect(() => {
        calculateHourlyRate();
    }, [
        rateCard.serviceRate,
        rateCard.minimumRate,
        rateCard.serviceTitle,
        rateCard.vehicleType,
        rateCard.vanRent,
        rateCard.vanRentHours,
        newService,
        newServiceInfo
    ]);

    useEffect(() => {
        checkExistingRateCards();
    }, [rateCard.serviceTitle, rateCard.serviceWeek, weekbyCalendar]);


    const validateFields = () => {
        const newErrors = {
            vehicleType: !rateCard.vehicleType,
            minimumRate: !rateCard.minimumRate,
            serviceTitle: !rateCard.serviceTitle,
            serviceRate: !rateCard.serviceRate,
            byodRate: !rateCard.byodRate,
            serviceWeek: rateCard.serviceWeek.length === 0,
            mileage: !rateCard.mileage,
            vanRent: rateCard.vehicleType === 'Own Vehicle' && !rateCard.vanRent,
            vanRentHours: rateCard.vehicleType === 'Own Vehicle' && !rateCard.vanRentHours,
            newService: false,
            hourlyRate: false,
            existingRateCard: false
        };

        if (newService) {
            newErrors.newService = !newServiceInfo.title || !newServiceInfo.hours;
        }

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const calculateHourlyRate = () => {
        const {
            minimumRate,
            serviceTitle,
            serviceRate,
            vehicleType,
            vanRent,
            vanRentHours,
        } = rateCard;

        if (!minimumRate || !serviceTitle || serviceRate === '' || serviceRate === null) {
            setErrors(prev => ({ ...prev, hourlyRate: false }));
            setRateCard(prev => ({ ...prev, hourlyRate: '' }));
            setBreakdownHTML(''); // Clear breakdown when not all inputs are valid
            return;
        }

        const service = newService
            ? newServiceInfo
            : services.find(service => service.title === serviceTitle);

        if (!service && service?.hours !== 0 || (!service.totalHours && !service.hours)) {
            console.warn("Service not found or hours not defined");
            return;
        }

        const serviceHours = parseFloat(service.totalHours || service.hours);
        let hourlyRate;

        if (vehicleType === 'Own Vehicle') {
            if (!vanRent || !vanRentHours) {
                setErrors(prev => ({ ...prev, hourlyRate: false }));
                setRateCard(prev => ({ ...prev, hourlyRate: '' }));
                setBreakdownHTML(''); // Clear breakdown when not all inputs are valid
                return;
            }
            const vanRentPerDay = parseFloat(vanRent) / 6;
            const vanRentPerHour = vanRentPerDay / parseFloat(vanRentHours);
            hourlyRate = (parseFloat(serviceRate) / serviceHours - vanRentPerHour).toFixed(2);
            setBreakdownHTML(renderBreakdownHTML(parseFloat(serviceRate), serviceHours, parseFloat(vanRent), parseFloat(vanRentHours), parseFloat(hourlyRate)));
        } else {
            hourlyRate = (parseFloat(serviceRate) / serviceHours).toFixed(2);
            setBreakdownHTML('');
        }

        setRateCard(prev => ({ ...prev, hourlyRate: parseFloat(hourlyRate) }));
        setErrors(prev => ({ ...prev, hourlyRate: parseFloat(hourlyRate) < parseFloat(minimumRate) }));
    };

    const renderBreakdownHTML = (serviceRate, serviceHours, vanRent, vanRentHours, hourlyRate) => {
        const hourlyRateBeforeVan = (serviceRate / serviceHours).toFixed(2);
        const vanRentPerDay = (vanRent / 6).toFixed(2);
        const vanRentPerHourCalculated = ((vanRent / 6) / vanRentHours).toFixed(2);

        return (
            <div className="grid grid-cols-2 text-sm text-gray-700 p-3 bg-white rounded-lg border border-neutral-400 gap-x-1 gap-y-2">
                <div className="font-medium">Hourly Rate:</div>
                <div>£{serviceRate.toFixed(2)} / {serviceHours.toFixed(2)} hrs = <span className="font-medium">£{hourlyRateBeforeVan}</span></div>
                <div className="font-medium">Van Rent:</div>
                <div>£{vanRent.toFixed(2)} &divide; 6 days = £{vanRentPerDay}</div>
                <div className="font-medium">Van Rent per Hour:</div>
                <div>£{vanRentPerDay} / {vanRentHours.toFixed(2)} hrs = <span className="font-medium">£{vanRentPerHourCalculated}</span></div>
                <div className="font-medium">Adjusted Hourly Rate:</div>
                <div>
                    (£{hourlyRateBeforeVan} - £{vanRentPerHourCalculated}) =
                    <span className="font-bold text-gray-900"> £{hourlyRate.toFixed(2)}/hr</span>
                </div>
            </div>
        );
    };

    const checkExistingRateCards = () => {
        let foundRateCard = []
        if (rateCard.serviceTitle !== '' && rateCard.serviceWeek.length > 0 && mode !== 'edit') {
            foundRateCard = ratecards.filter(item =>
                item.serviceTitle === rateCard.serviceTitle &&
                item.vehicleType === rateCard.vehicleType &&
                rateCard.serviceWeek.some(week => item.serviceWeek === week)
            );
        }
        setErrors(prev => ({
            ...prev,
            existingRateCard: foundRateCard.length > 0
        }));
    };


    const handleAddRateCard = () => {
        const isValid = validateFields();
        if (!isValid) return;

        if (errors.existingRateCard) {
            return;
        }

        onAddRatecard(rateCard, newService, newServiceInfo, errors.existingweek);
    };

    const handleVehicleTypeChange = (e) => {
        setRateCard(prev => ({ ...prev, vehicleType: e.target.value }));
        setErrors(prev => ({ ...prev, vehicleType: false }));
    };

    const handleMinimumRateChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({ ...prev, minimumRate: value === '' ? '' : parseFloat(value) }));
        setErrors(prev => ({ ...prev, minimumRate: false }));
    };

    const handleVanRentChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({ ...prev, vanRent: value === '' ? '' : parseFloat(value) }));
        setErrors(prev => ({ ...prev, vanRent: false }));
    };

    const handleVanRentHoursChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({ ...prev, vanRentHours: value === '' ? '' : parseFloat(value) }));
        setErrors(prev => ({ ...prev, vanRentHours: false }));
    };

    const handleNewServiceTitleChange = (e) => {
        const value = e.target.value;
        if (services.some(service =>
            String(service.title).replace(/ +/g, "").toLowerCase() ===
            String(value).replace(/ +/g, "").toLowerCase()
        )) {
            setErrors(prev => ({ ...prev, newService: true }));
        } else {
            setErrors(prev => ({ ...prev, newService: false }));
        }
        setNewServiceInfo(prev => ({ ...prev, title: value }));
        setRateCard(prev => ({ ...prev, serviceTitle: value }));
        setErrors(prev => ({ ...prev, serviceTitle: false }));
    };

    const handleHoursChange = (e) => {
        const value = e.target.value;
        setNewServiceInfo(prev => ({
            ...prev,
            hours: value,
            totalHours: parseFloat(prev.minutes) + parseFloat(value || 0)
        }));
        setErrors(prev => ({ ...prev, serviceTitle: false }));
    };

    const handleMinutesChange = (e) => {
        const value = e.target.value;
        setNewServiceInfo(prev => ({
            ...prev,
            minutes: value,
            totalHours: parseFloat(newServiceInfo.hours || 0) + parseFloat(value)
        }));
    };

    const handleServiceChange = (e) => {
        setRateCard(prev => ({ ...prev, serviceTitle: e.target.value }));
        setErrors(prev => ({ ...prev, serviceTitle: false }));
    };

    const handleWeekChange = (e) => {
        setErrors(prev => ({ ...prev, existingweek: ratecards.some((item) => e.includes(item.serviceWeek)) }))
        setRateCard(prev => ({ ...prev, serviceWeek: e }));
        setErrors(prev => ({ ...prev, serviceWeek: false }));
    };

    const handleMileageChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({ ...prev, mileage: value === '' ? '' : parseFloat(value) }));
        setErrors(prev => ({ ...prev, mileage: false }));
    };

    const handleServiceRateChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({
            ...prev,
            serviceRate: value === '' ? '' : parseFloat(value)
        }));
        setErrors(prev => ({ ...prev, serviceRate: false }));
    };

    const handleByodRateChange = (e) => {
        const value = e.target.value;
        setRateCard(prev => ({ ...prev, byodRate: value === '' ? '' : parseFloat(value) }));
        setErrors(prev => ({ ...prev, byodRate: false }));
    };

    return (
        <div className='flex-[3] w-full h-full bg-white dark:bg-dark border border-neutral-300 dark:border-dark-3 rounded-lg flex-1 overflow-auto'>
            <div className='flex flex-col relative flex-1 h-full overflow-auto pb-3'>
                <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                    <h3>Add new rate card</h3>
                </div>

                <div className='p-4 flex-1 flex flex-col gap-3 '>
                    <div>
                        <InputGroup
                            disabled={mode === 'edit'}
                            type="dropdown"
                            value={rateCard.vehicleType}
                            className={`${rateCard.vehicleType === '' && 'text-gray-400'}`}
                            onChange={handleVehicleTypeChange}
                            label="Vehicle Type"
                            required="true"
                            error={errors.vehicleType}
                        >
                            <option value=''>-Select Type of Vehicle-</option>
                            <option value='Own Vehicle'>Own vehicle</option>
                            <option value='Company Vehicle'>Company vehicle</option>
                        </InputGroup>
                        {errors.vehicleType && <p className='text-red-400 text-sm mt-1'>* Vehicle type is required</p>}
                    </div>

                    <div>
                        <InputGroup
                            type="number"
                            label="Contractual Minimum Rate"
                            placeholder="Minimum Rate"
                            required="true"
                            step="any"
                            min='1'
                            onChange={handleMinimumRateChange}
                            error={errors.minimumRate}
                            value={rateCard.minimumRate}
                        />
                        {errors.minimumRate && <p className='text-red-400 text-sm mt-1'>* Minimum rate is required</p>}
                    </div>

                    {rateCard?.vehicleType === 'Own Vehicle' && (
                        <>
                            <div className='flex space-between gap-5'>
                                <div>
                                    <InputGroup
                                        label='Van Rent per week'
                                        required='true'
                                        placeholder='Van Rent'
                                        type='number'
                                        step="any"
                                        min='1'
                                        onChange={handleVanRentChange}
                                        error={errors.vanRent}
                                        value={rateCard.vanRent}
                                    />
                                    {errors.vanRent && <p className='text-red-400 text-sm mt-1'>* Van rent is required</p>}
                                </div>
                                <div>
                                    <InputGroup
                                        label='Van Rent Hours'
                                        required='true'
                                        placeholder='Rent Hours'
                                        type='number'
                                        step='0.25'
                                        min='1'
                                        onChange={handleVanRentHoursChange}
                                        error={errors.vanRentHours}
                                        value={rateCard.vanRentHours}
                                    />
                                    {errors.vanRentHours && <p className='text-red-400 text-sm mt-1'>* Van rent hours are required</p>}
                                </div>
                            </div>
                        </>
                    )}

                    <InputWrapper title="Service">
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-1'>
                                <input
                                    disabled={mode === 'edit'}
                                    type="radio"
                                    checked={newService}
                                    onChange={(e) => {
                                        setNewService(e.target.checked);
                                        setNewServiceInfo({
                                            title: '',
                                            hours: '',
                                            minutes: '0',
                                            totalHours: ''
                                        })
                                        setErrors(prev => ({ ...prev, serviceTitle: false }));
                                    }}
                                />
                                <label className='font-medium text-sm'> New Service</label>
                            </div>

                            {newService && (
                                <>
                                    <div>
                                        <InputGroup
                                            disabled={mode === 'edit'}
                                            type="text"
                                            label='Service title'
                                            placeholder="New service title"
                                            required={true}
                                            onChange={handleNewServiceTitleChange}
                                            error={!newServiceInfo.title && errors.serviceTitle}
                                            value={newServiceInfo.title}
                                        />
                                        {errors.newService && <p className='text-red-400 text-sm mt-1'>* The given service already exists</p>}
                                        {!newServiceInfo.title && errors.serviceTitle && <p className='text-red-400 text-sm mt-1'>* Service title is required</p>}
                                    </div>

                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                        <div>
                                            <InputGroup

                                                type="number"
                                                label='Hours'
                                                required={true}
                                                min={1}
                                                onChange={handleHoursChange}
                                                error={!newServiceInfo.hours && errors.serviceTitle}
                                                value={newServiceInfo.hours}
                                            />
                                            {!newServiceInfo.hours && errors.serviceTitle && <p className='text-red-400 text-sm mt-1'>* Hours are required</p>}
                                        </div>
                                        <div>
                                            <InputGroup
                                                type='dropdown'
                                                label='Minutes'
                                                onChange={handleMinutesChange}
                                                value={newServiceInfo.minutes}
                                            >
                                                <option value="0">0</option>
                                                <option value="0.25">15</option>
                                                <option value="0.50">30</option>
                                                <option value="0.75">45</option>
                                            </InputGroup>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className='flex items-center gap-1'>
                                <input
                                    type="radio"
                                    disabled={mode === 'edit'}
                                    checked={!newService}
                                    onChange={() => {
                                        setNewService(false);
                                        setErrors(prev => ({ ...prev, serviceTitle: false }));
                                    }}
                                />
                                <label className='font-medium text-sm'> Existing Service</label>
                            </div>

                            {!newService && (
                                <div>
                                    <InputGroup
                                        type='dropdown'
                                        disabled={mode === 'edit'}
                                        required={true}
                                        label='Select service'
                                        className={`${rateCard.serviceTitle === '' && 'text-gray-400'}`}
                                        onChange={handleServiceChange}
                                        error={!rateCard.serviceTitle && errors.serviceTitle}
                                        value={rateCard.serviceTitle}
                                    >
                                        <option value="">-Select Service-</option>
                                        {services.map((service) => (
                                            <option key={service.title} value={service.title}>{service.title}</option>
                                        ))}
                                    </InputGroup>
                                    {!rateCard.serviceTitle && errors.serviceTitle && <p className='text-red-400 text-sm mt-1'>* Service is required</p>}
                                </div>
                            )}
                        </div>
                    </InputWrapper>

                    <InputWrapper title={'Week'}>
                        <div>
                            <div className='flex items-center gap-1'>
                                <input
                                    type='radio'
                                    disabled={mode === 'edit'}
                                    checked={weekbyCalendar}
                                    onChange={() => {
                                        setWeekbyCalendar(prev => !prev);
                                        setErrors(prev => ({ ...prev, serviceWeek: false }));
                                    }}
                                />
                                <label className='text-sm font-medium'>Select Weeks <span className='text-red-400'>*</span></label>
                            </div>
                            <div className='mt-3'>
                                <RateCardWeek
                                    value={weekbyCalendar ? rateCard.serviceWeek : []}
                                    onChange={handleWeekChange}
                                    disabled={!weekbyCalendar || mode === 'edit'}
                                    mode={mode}
                                />
                            </div>
                        </div>
                        <div>
                            <div className='flex items-center gap-1'>
                                <input
                                    type='radio'
                                    disabled={mode === 'edit'}
                                    checked={!weekbyCalendar}
                                    onChange={() => {
                                        setWeekbyCalendar(prev => !prev);
                                        setErrors(prev => ({ ...prev, serviceWeek: false }));
                                    }}
                                />
                                <label className='text-sm font-medium'>Select Week Range <span className='text-red-400'>*</span></label>
                            </div>
                            <WeekRangeDropdown
                                onChange={handleWeekChange}
                                disabled={weekbyCalendar}
                                selectedWeeks={rateCard.serviceWeek}
                            />
                        </div>
                        {errors.serviceWeek && <p className='text-red-400 text-sm mt-1'>* Please select at least one week</p>}
                    </InputWrapper>

                    <div>
                        <InputGroup
                            type="number"
                            iconPosition='left'
                            icon={<FaPoundSign className='text-neutral-300' />}
                            placeholder="Select week mileage"
                            label="Week Mileage"
                            onChange={handleMileageChange}
                            required="true"
                            min={1}
                            error={errors.mileage}
                            value={rateCard.mileage}
                        />
                        {errors.mileage && (
                            <p className='text-red-400 text-sm mt-1'>* Mileage is required</p>)}
                        {errors.existingweek &&
                            (<p className='text-sm text-red-400 mt-1'>
                                * Modifying the mileage may impact the mileage values of the existing rate cards for the selected weeks
                            </p>)}
                    </div>

                    <div>
                        <InputGroup
                            type="number"
                            placeholder="Select service rate"
                            label="Service Rate"
                            required="true"
                            min={1}
                            step='any'
                            iconPosition='left'
                            icon={<FaPoundSign className='text-neutral-300' />}
                            onChange={handleServiceRateChange}
                            error={errors.serviceRate}
                            value={rateCard.serviceRate}
                        />
                        {errors.serviceRate && <p className='text-red-400 text-sm mt-1'>* Service rate is required</p>}
                        {rateCard.hourlyRate !== '' && !isNaN(rateCard.hourlyRate) && (
                            <p className='text-sm m-1 text-gray-500'>
                                <div className='flex flex-col gap-2'>
                                    <div>
                                        {rateCard.vehicleType === 'Own Vehicle' && 'Adjusted '}
                                        Hourly Rate: £{rateCard.hourlyRate.toFixed(2)} /hr
                                    </div>
                                    {breakdownHTML}
                                </div>
                            </p>
                        )}
                        {errors.hourlyRate && (
                            <p className='text-sm m-1 text-red-400'>
                                *{rateCard.vehicleType === 'Own Vehicle' && 'Adjusted '}
                                hourly rate is below the minimum rate (£{rateCard?.minimumRate?.toFixed(2)} /hr)
                            </p>
                        )}
                    </div>

                    <div>
                        <InputGroup
                            type="number"
                            iconPosition='left'
                            min={1}
                            icon={<FaPoundSign className='text-neutral-300' />}
                            placeholder="Select byod rate"
                            label="Byod Rate"
                            onChange={handleByodRateChange}
                            required="true"
                            error={errors.byodRate}
                            value={rateCard.byodRate}
                        />
                        {errors.byodRate && <p className='text-red-400 text-sm mt-1'>* BYOD rate is required</p>}
                    </div>

                    <div className='w-full flex justify-between mt-2 gap-3 items-center'>
                        {errors.existingRateCard && (
                            <p className='text-sm text-red-400 m-1'>
                                * A Rate Card already exists for the specified Service and for selected Week.
                            </p>
                        )}
                        {mode !== 'edit' ? <button
                            disabled={Object.keys(errors).some((er) => er !== 'existingweek' && errors[er]) || loading}
                            onClick={() => setConfirmModal(true)}
                            className='flex items-center gap-1 ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white'
                        >
                            Add
                        </button> :
                            <div className='flex justify-end w-full gap-2'>
                                <button
                                    disabled={Object.keys(errors).some((er) => er !== 'existingweek' && errors[er]) || loading}
                                    onClick={() => onUpdateRatecard()}
                                    className='flex items-center gap-1 border w-fit h-fit border-amber-500 bg-amber-500 text-white rounded-md py-1 px-2 hover:text-amber-500 hover:bg-transparent disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white'
                                >
                                    Update
                                </button>
                                <button
                                    disabled={loading}
                                    onClick={() => {
                                        setMode('create')
                                        setRateCard(clearRateCard)
                                    }
                                    }
                                    className=' border w-fit h-fit border-red-500 bg-red-500 text-white rounded-md py-1 px-2 hover:text-red-500 hover:bg-transparent disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white'
                                >
                                    Cancel
                                </button>
                            </div>}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default RateCardForm;