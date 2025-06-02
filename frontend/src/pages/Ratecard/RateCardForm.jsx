// src/features/ratecards/RateCardForm.jsx
import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import RateCardWeek from '../../components/Calendar/RateCardWeek';
import WeekRangeDropdown from './WeekRangeDropdown';
import { FaPoundSign } from "react-icons/fa";

const RateCardForm = ({ ratecards, services, onAddRatecard }) => {
    const [rateCard, setRateCard] = useState({
        vehicleType: '',
        minimumRate: '',
        serviceTitle: '',
        serviceRate: '',
        byodRate: '',
        serviceWeek: [],
        mileage: '',
        active: true,
        vanRent: '',
        vanRentHours: 1,
        hourlyRate: '',
    });
    const [newService, setNewService] = useState(false);
    const [newServiceInfo, setNewServiceInfo] = useState({
        title: '',
        hours: '',
        minutes: '',
        totalHours: ''
    });
    const [errors, setErrors] = useState({});
    const [breakdownHTML, setBreakdownHTML] = useState('');
    const [weekbyCalendar, setWeekbyCalendar] = useState(false);

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

    useEffect(() => {
        setRateCard(prev => ({ ...prev, serviceWeek: [] }))
    }, [weekbyCalendar])

    const calculateHourlyRate = () => {
        const {
            minimumRate,
            serviceTitle,
            serviceRate,
            vehicleType,
            vanRent,
            vanRentHours,
        } = rateCard;

        if (!minimumRate || !serviceTitle || !serviceRate) {
            setErrors(prev => ({ ...prev, hourlyRate: false }));
            setRateCard(prev => ({ ...prev, hourlyRate: '' }));
            return;
        }

        const service = newService
            ? newServiceInfo
            : services.find(service => service.title === serviceTitle);

        if (!service) {
            console.warn("Service not found");
            return;
        }

        const serviceHours = service.totalHours || service.hours;
        let hourlyRate;

        if (vehicleType === 'Own Vehicle') {
            if (!vanRent || !vanRentHours) {
                setErrors(prev => ({ ...prev, hourlyRate: false }));
                setRateCard(prev => ({ ...prev, hourlyRate: '' }));
                return;
            }
            hourlyRate = (serviceRate / serviceHours - (vanRent / 6) / vanRentHours).toFixed(2);
            setBreakdownHTML(renderBreakdownHTML(serviceRate, serviceHours, vanRent, vanRentHours, hourlyRate));
        } else {
            hourlyRate = serviceRate / serviceHours;
            setBreakdownHTML(null);
        }

        setRateCard(prev => ({ ...prev, hourlyRate }));
        setErrors(prev => ({ ...prev, hourlyRate: hourlyRate < minimumRate }));
    };

    const renderBreakdownHTML = (serviceRate, serviceHours, vanRent, vanRentHours, hourlyRate) => {
        return (
            <div className="grid grid-cols-2 text-sm text-gray-700 p-3 bg-white rounded-lg border border-neutral-400 gap-x-1 gap-y-2">
                <div className="font-medium">Hourly Rate:</div>
                <div>£{serviceRate} / {serviceHours} hrs = <span className="font-medium">£{(serviceRate / serviceHours).toFixed(2)}</span></div>
                <div className="font-medium">Van Rent:</div>
                <div>£{vanRent} ÷ 6 days = £{(vanRent / 6).toFixed(2)}</div>
                <div className="font-medium">Van Rent per Hour:</div>
                <div>£{(vanRent / 6).toFixed(2)} / {vanRentHours} hrs = <span className="font-medium">£{((vanRent / 6) / vanRentHours).toFixed(2)}</span></div>
                <div className="font-medium">Adjusted Hourly Rate:</div>
                <div>
                    (£{(serviceRate / serviceHours).toFixed(2)} - £{((vanRent / 6) / vanRentHours).toFixed(2)}) =
                    <span className="font-bold text-gray-900"> £{hourlyRate.toFixed(2)}/hr</span>
                </div>
            </div>
        );
    };

    const checkExistingRateCards = () => {
        console.log(rateCard)
        let foundRateCard = []
        if (rateCard.serviceTitle !== '' && rateCard.serviceWeek.length > 0) {
            foundRateCard = ratecards.filter(item =>
                item.serviceTitle === rateCard.serviceTitle &&
                item.vehicleType === rateCard.vehicleType &&
                rateCard.serviceWeek.some(week => item.serviceWeek === week)
            );
        }
        console.log(foundRateCard)
        setErrors(prev => ({
            ...prev,
            existingRateCard: foundRateCard.length > 0
        }));
    };

    const handleAddRateCard = () => {
        onAddRatecard(rateCard);
    };

    return (
        <div className='h-full md:col-span-3 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg'>
            <div className='relative overflow-auto max-h-[40rem]'>
                <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                    <h3>Add new rate card</h3>
                </div>

                <div className='p-4 pb-8 flex flex-col gap-3'>
                    <div>
                        <InputGroup
                            type="dropdown"
                            className={`${rateCard.vehicleType === '' && 'text-gray-400'}`}
                            onChange={(e) => setRateCard(prev => ({ ...prev, vehicleType: e.target.value }))}
                            label="Vehicle Type"
                            required="true"
                        >
                            <option value=''>-Select Type of Vehicle-</option>
                            <option value='Own Vehicle'>Own vehicle</option>
                            <option value='Company Vehicle'>Company vehicle</option>
                        </InputGroup>
                    </div>

                    <div>
                        <InputGroup
                            type="number"
                            label="Contractual Minimum Rate"
                            required="true"
                            step="any"
                            onChange={(e) => setRateCard(prev => ({ ...prev, minimumRate: parseFloat(e.target.value) }))}
                        />
                    </div>

                    {rateCard?.vehicleType === 'Own Vehicle' && (
                        <div className='flex space-between gap-5'>
                            <div>
                                <InputGroup
                                    label='Van Rent per week'
                                    required='true'
                                    placeholder='Van Rent'
                                    type='number'
                                    step="any"
                                    min='1'
                                    onChange={(e) => setRateCard(prev => ({ ...prev, vanRent: e.target.value }))}
                                />
                            </div>
                            <div>
                                <InputGroup
                                    label='Van Rent Hours'
                                    required='true'
                                    placeholder='Rent Hours'
                                    type='number'
                                    step='0.25'
                                    min='1'
                                    onChange={(e) => setRateCard(prev => ({ ...prev, vanRentHours: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    <InputWrapper title="Service">
                        <div className='flex flex-col gap-3'>
                            <div className='flex items-center gap-1'>
                                <input
                                    type="radio"
                                    checked={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                />
                                <label className='font-medium text-sm'> New Service</label>
                            </div>

                            <div>
                                <InputGroup
                                    type="text"
                                    label='Service title'
                                    placeholder="New service title"
                                    required={newService}
                                    disabled={!newService}
                                    onChange={(e) => {
                                        if (services.some(service =>
                                            String(service.title).replace(/ +/g, "").toLowerCase() ===
                                            String(e.target.value).replace(/ +/g, "").toLowerCase()
                                        )) {
                                            setErrors(prev => ({ ...prev, newService: true }));
                                        } else {
                                            setNewServiceInfo(prev => ({ ...prev, title: e.target.value }));
                                            setRateCard(prev => ({ ...prev, serviceTitle: e.target.value }))
                                            setErrors(prev => ({ ...prev, newService: false }));
                                        }
                                    }}
                                />
                                {errors.newService && <p className='text-red-400'>* the given service already exists</p>}
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                <InputGroup
                                    type="number"
                                    label='Hours'
                                    required={newService}
                                    disabled={!newService}
                                    min={1}
                                    onChange={(e) => {
                                        setNewServiceInfo(prev => ({
                                            ...prev,
                                            hours: e.target.value,
                                            totalHours: parseFloat(prev.minutes) + parseFloat(e.target.value)
                                        }));
                                    }}
                                />
                                <InputGroup
                                    type='dropdown'
                                    label='Minutes'
                                    required={newService}
                                    disabled={!newService}
                                    onChange={(e) => {
                                        setNewServiceInfo(prev => ({
                                            ...prev,
                                            minutes: e.target.value,
                                            totalHours: parseFloat(prev.hours) + parseFloat(e.target.value)
                                        }));
                                    }}
                                >
                                    <option value="0">0</option>
                                    <option value="0.25">15</option>
                                    <option value="0.50">30</option>
                                    <option value="0.75">45</option>
                                </InputGroup>
                            </div>

                            <div className='flex items-center gap-1'>
                                <input
                                    type="radio"
                                    checked={!newService}
                                    onChange={() => setNewService(false)}
                                />
                                <label className='font-medium text-sm'> Existing Service</label>
                            </div>

                            <div>
                                <InputGroup
                                    type='dropdown'
                                    required={!newService}
                                    label='Select service'
                                    disabled={newService}
                                    onChange={(e) => setRateCard(prev => ({ ...prev, serviceTitle: e.target.value }))}
                                >
                                    {services.map((service) => (
                                        <option value={service.title}>{service.title}</option>
                                    ))}
                                </InputGroup>
                            </div>
                        </div>
                    </InputWrapper>

                    <InputWrapper title={'Week'}>
                        <div>
                            <div className='flex items-center gap-1'>
                                <input
                                    type='radio'
                                    checked={weekbyCalendar}
                                    onChange={() => setWeekbyCalendar(prev => !prev)}
                                />
                                <label className='text-sm font-medium'>Select Weeks <span className='text-red-400'>*</span></label>
                            </div>
                            <div className='mt-3'>
                                <RateCardWeek
                                    onChange={(e) => setRateCard(prev => ({ ...prev, serviceWeek: e }))}
                                    disabled={!weekbyCalendar}
                                />
                            </div>
                        </div>
                        <div>
                            <div className='flex items-center gap-1'>
                                <input
                                    type='radio'
                                    checked={!weekbyCalendar}
                                    onChange={() => setWeekbyCalendar(prev => !prev)}
                                />
                                <label className='text-sm font-medium'>Select Week Range <span className='text-red-400'>*</span></label>
                            </div>
                            <WeekRangeDropdown
                                onChange={(e) => setRateCard(prev => ({ ...prev, serviceWeek: e }))}
                                disabled={weekbyCalendar}
                            />
                        </div>
                    </InputWrapper>

                    <div>
                        <InputGroup
                            type="number"
                            iconPosition='left'
                            icon={<FaPoundSign className='text-neutral-300' />}
                            placeholder="Select week mileage"
                            label="Week Mileage"
                            onChange={(e) => setRateCard(prev => ({ ...prev, mileage: e.target.value }))}
                            required="true"
                            min={1}
                        />
                        {errors.mileage && (
                            <p className='text-sm text-red-400 m-1'>
                                * Modifying the mileage may impact the mileage values of the existing rate cards for the selected weeks
                            </p>
                        )}
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
                            onChange={(e) => setRateCard(prev => ({
                                ...prev,
                                serviceRate: e.target.value === '' ? '' : parseFloat(e.target.value)
                            }))}
                        />
                        {rateCard.hourlyRate && (
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
                                hourly rate is below the minimum rate (£{rateCard.minimumRate} /hr)
                            </p>
                        )}
                    </div>

                    <div>
                        <InputGroup
                            type="number"
                            iconPosition='left'
                            icon={<FaPoundSign className='text-neutral-300' />}
                            placeholder="Select byod rate"
                            label="Byod Rate"
                            onChange={(e) => setRateCard(prev => ({ ...prev, byodRate: e.target.value }))}
                            required="true"
                        />
                    </div>

                    <div className='w-full flex justify-between mt-2 gap-3 items-center'>
                        {errors.existingRateCard && (
                            <p className='text-sm text-red-400 m-1'>
                                * A Rate Card already exists for the specified Service and for selected Week.
                            </p>
                        )}
                        <button
                            disabled={Object.keys(errors).some((er) => er !== 'mileage' && errors[er])}
                            onClick={handleAddRateCard}
                            className='ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white'
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RateCardForm;