import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRatecards, deleteRatecard, addRatecard } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { FcInfo } from "react-icons/fc";
import InputGroup from '../../components/InputGroup/InputGroup'
import InputWrapper from '../../components/InputGroup/InputWrapper'
import RateCardWeek from '../../components/Calendar/RateCardWeek'
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineDelete } from "react-icons/md";
import TrashBin from '../../components/UIElements/TrashBin';
import WeekRangeDropdown from './WeekRangeDropdown';
import { groupRateCards } from './groupRateCards';
import { FaPoundSign, FaInfoCircle } from "react-icons/fa";

import './Ratecard.scss'

const Ratecard = () => {
    const dispatch = useDispatch();
    const [toastOpen, setToastOpen] = useState(false)
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
    })
    const [selectedWeeks, setSelectedWeeks] = useState({});

    const { list: ratecards, ratecardStatus, addRateCardStatus, deleteRateCardStatus, rateCardError } = useSelector((state) => state.ratecards);
    // const [ratecards, setRatecard] = useState([])
    const { list: services, serviceStatus, addServiceStatus, deleteServiceStatus, serviceError } = useSelector((state) => state.services);
    const [newService, setNewService] = useState(false)
    const [filterVehicleType, setFilterVehicleType] = useState('')
    const [newServiceInfo, setNewServiceInfo] = useState({ title: '', hours: '', minutes: '', totalHours: '' })

    const [errors, setErrors] = useState({})
    const [breakdownHTML, setBreakdownHTML] = useState('')
    const [weekbyCalendar, setWeekbyCalendar] = useState(false)

    const filteredRatecards = useMemo(() => {
        return filterVehicleType
            ? ratecards.filter(rc => rc.vehicleType === filterVehicleType)
            : ratecards;
    }, [filterVehicleType, ratecards]);

    useEffect(() => {
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (serviceStatus === 'idle') dispatch(fetchServices());
    }, [ratecardStatus, serviceStatus, dispatch]);

    const handleDeleteRatecard = async (id) => {
        setToastOpen(true)
        //dispatch(deleteRatecard(id))
        setTimeout(() => setToastOpen(false), 2000)
    }

    // const handleSearchByVehicleType = (filterVehicleType) => {
    //     if (filterVehicleType != '')
    //         setRatecard(ratecardsfromstate.filter((ratecard) => ratecard.vehicleType == filterVehicleType))
    //     else
    //         setRatecard(ratecardsfromstate)
    // }


    const groupedRateCards = groupRateCards(filteredRatecards);

    useEffect(() => {
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
            setBreakdownHTML(
                <div className="grid grid-cols-2 text-sm text-gray-700 p-3 bg-white rounded-lg border border-neutral-400 gap-x-1 gap-y-2">
                    {/* Service Rate */}
                    <div className="font-medium">Hourly Rate:</div>
                    <div>£{serviceRate} / {serviceHours} hrs = <span className="font-medium">£{(serviceRate / serviceHours).toFixed(2)} </span></div>

                    {/* Van Rent */}
                    <div className="font-medium">Van Rent:</div>
                    <div>£{vanRent} ÷ 6 days = £{(vanRent / 6).toFixed(2)}</div>

                    <div className="font-medium">Van Rent per Hour:</div>
                    <div>£{(vanRent / 6).toFixed(2)} / {vanRentHours} hrs = <span className="font-medium">£{((vanRent / 6) / vanRentHours).toFixed(2)}</span></div>

                    {/* Adjusted Hourly Rate */}
                    <div className="font-medium">Adjusted Hourly Rate:</div>
                    <div>
                        (£{(serviceRate / serviceHours).toFixed(2)} - £{((vanRent / 6) / vanRentHours).toFixed(2)}) =
                        <span className="font-bold text-gray-900"> £{hourlyRate.toFixed(2)}/hr</span>
                    </div>
                </div>)
        } else {
            hourlyRate = serviceRate / serviceHours;
            setBreakdownHTML(null)
        }

        setRateCard(prev => ({ ...prev, hourlyRate }));
        setErrors(prev => ({ ...prev, hourlyRate: hourlyRate < minimumRate }));

    }, [rateCard.serviceRate, rateCard.minimumRate, rateCard.serviceTitle, rateCard.vehicleType, rateCard.vanRent, rateCard.vanRentHours, newService, newServiceInfo, services]);


    useEffect(() => {
        const selectedServiceWeeks = rateCard.serviceWeek
        const foundRateCard = ratecards.filter((ratecard) => selectedServiceWeeks.some((sweek) => sweek === ratecard.serviceWeek))
        if (foundRateCard.length > 0) {
            setErrors(prev => ({ ...prev, mileage: true }))
        }
        else {
            setErrors(prev => ({ ...prev, mileage: false }))
        }

    }, [rateCard.serviceWeek])

    useEffect(() => {
        console.log(rateCard)
        if (rateCard.serviceTitle !== '' && rateCard.serviceWeek.length > 0) {
            let foundRateCard = []
            foundRateCard = (ratecards.filter(item => item.serviceTitle == rateCard.serviceTitle && item.vehicleType == rateCard.vehicleType && rateCard.serviceWeek.some((week => item.serviceWeek === week))));
            console.log(foundRateCard)
            if (foundRateCard.length > 0) {
                setErrors(prev => ({ ...prev, existingRateCard: true }))
            }
            else
                setErrors(prev => ({ ...prev, existingRateCard: false }))

        }
    }, [rateCard.serviceTitle, rateCard.serviceWeek])

    const handleAddRateCard = async () => {
        dispatch(addRatecard(rateCard))
    }

    return (
        <div className='relative w-full p-4 overflow-auto'>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-red-400 fixed flex justify-center items-center z-50 backdrop-blur-md top-4 left-1/2 -translate-x-1/2 bg-white/20 dark:bg-dark/20 w-50 h-15 md:w-60 md:h-30 rounded-lg shadow-lg`}>
                <div className='flex flex-rol md:flex-col gap-3 items-center'>
                    <TrashBin width={'40px'} height={'40px'} />
                    <p className='text-base font-bold text-red-500'>Rate deleted</p>
                </div>
            </div>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Rate Card</h2>
            <div className='grid grid-cols-1 md:grid-cols-10 gap-3'>
                <div className=' h-full md:col-span-3 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg'>
                    <div className='relative overflow-auto max-h-[40rem]'>
                        <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'><h3>Add new rate card</h3></div>
                        <div className='p-4 pb-8 flex flex-col gap-3  '>
                            <div>
                                <InputGroup type="dropdown" className={`${rateCard.vehicleType === '' && 'text-gray-400'}`} onChange={(e) => setRateCard(prev => ({ ...prev, vehicleType: e.target.value }))} label="Vehicle Type" required="true">
                                    <option value=''>-Select Type of Vehicle-</option>
                                    <option value='Own Vehicle'>Own vehicle</option>
                                    <option value='Company Vehicle'>Company vehicle</option>
                                </InputGroup>
                            </div>
                            <div>
                                <InputGroup type="number" label="Contractual Minimum Rate" required="true" step="any"
                                    onChange={(e) => {
                                        setRateCard(prev => ({ ...prev, minimumRate: parseFloat(e.target.value) }))
                                    }}
                                />
                            </div>
                            {rateCard?.vehicleType === 'Own Vehicle' && <div className='flex space-between gap-5'>
                                <div>
                                    <InputGroup label='Van Rent per week' required='true' placeholder='Van Rent' type='number' step="any" min='1' onChange={(e) => setRateCard(prev => ({ ...prev, vanRent: e.target.value }))} />
                                </div>
                                <div>
                                    <InputGroup label='Van Rent Hours' required='true' placeholder='Rent Hours' type='number' step='0.25' min='1' onChange={(e) => setRateCard(prev => ({ ...prev, vanRentHours: e.target.value }))} />
                                </div>
                            </div>}
                            <InputWrapper title="Service">
                                <div className='flex flex-col gap-3'>
                                    <div className='flex items-center gap-1'>
                                        <input type="radio" checked={newService} onChange={(e) => setNewService(e.target.value)} />
                                        <label className='font-medium text-sm'> New Service</label>
                                    </div>
                                    <div>
                                        <InputGroup type="text" label='Service title' placeholder="New service title" required={newService} disabled={!newService}
                                            onChange={(e) => {
                                                if (services.some((service) => String(service.title).replace(/ +/g, "").toLowerCase() == String(e.target.value).replace(/ +/g, "").toLowerCase())) {
                                                    setErrors(prev => ({ ...prev, newService: true }))
                                                }
                                                else {
                                                    setNewServiceInfo(prev => ({ ...prev, title: e.target.value }))
                                                    setErrors(prev => ({ ...prev, newService: false }))
                                                }
                                            }} />
                                        {errors.newService && <p className='text-red-400'>* the given service already exists</p>}
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                        <InputGroup type="number" label='Hours' required={newService} disabled={!newService} min={1}
                                            onChange={(e) => {
                                                setNewServiceInfo(prev => ({ ...prev, hours: e.target.value, totalHours: parseFloat(prev.minutes) + parseFloat(e.target.value) }))
                                            }}
                                        />
                                        <InputGroup type='dropdown' label='Minutes' required={newService} disabled={!newService}
                                            onChange={(e) => {
                                                setNewServiceInfo(prev => ({ ...prev, minutes: e.target.value, totalHours: parseFloat(prev.hours) + parseFloat(e.target.value) }))
                                            }}
                                        >
                                            <option value="0">0</option>
                                            <option value="0.25">15</option>
                                            <option value="0.50">30</option>
                                            <option value="0.75">45</option>
                                        </InputGroup>
                                    </div>
                                    <div className='flex items-center gap-1'>
                                        <input type="radio" checked={!newService} onChange={() => setNewService(false)} />
                                        <label className='font-medium text-sm'> Existing Service</label>
                                    </div>
                                    <div>
                                        <InputGroup type='dropdown' required={!newService} label='Select service' disabled={newService}
                                            onChange={(e) => setRateCard(prev => ({ ...prev, serviceTitle: e.target.value }))}>
                                            {services.map((service) => (
                                                <option value={service.title}>{service.title}</option>
                                            ))}
                                        </InputGroup>
                                    </div>
                                </div>
                            </InputWrapper>
                            <InputWrapper title={'Week'} >
                                <div>
                                    <div className='flex items-center gap-1'>
                                        <input type='radio' checked={weekbyCalendar} onChange={() => setWeekbyCalendar(prev => !prev)} />
                                        <label className='text-sm font-medium'>Select Weeks <span className='text-red-400'>*</span></label>
                                    </div>
                                    <div className='mt-3'><RateCardWeek onChange={(e) => setRateCard(prev => ({ ...prev, serviceWeek: e }))} disabled={!weekbyCalendar} /></div>
                                </div>
                                <div>
                                    <div className='flex items-center gap-1'>
                                        <input type='radio' checked={!weekbyCalendar} onChange={() => setWeekbyCalendar(prev => !prev)} />
                                        <label className='text-sm font-medium'>Select Week Range <span className='text-red-400'>*</span></label>
                                    </div>
                                    <WeekRangeDropdown onChange={(e) => setRateCard(prev => ({ ...prev, serviceWeek: e }))} disabled={weekbyCalendar} />
                                </div>
                            </InputWrapper>
                            <div>
                                <InputGroup type="number" iconPosition='left'
                                    icon={<FaPoundSign className='text-neutral-300' />} placeholder="Select week mileage" label="Week Mileage"
                                    onChange={(e) => setRateCard(prev => ({ ...prev, mileage: e.target.value }))} required="true" min={1} />
                                {errors.mileage && <p className='text-sm text-red-400 m-1'>* Modifying the mileage may impact the mileage values of the existing rate cards for the selected weeks</p>}
                            </div>
                            <div >
                                <InputGroup
                                    type="number" placeholder="Select service rate" label="Service Rate" required="true" min={1} step='any'
                                    iconPosition='left'
                                    icon={<FaPoundSign className='text-neutral-300' />}
                                    onChange={(e) => setRateCard(prev => ({ ...prev, serviceRate: e.target.value === '' ? '' : parseFloat(e.target.value) }))} />
                                {rateCard.hourlyRate &&
                                    <p className='text-sm m-1 text-gray-500'>
                                        <div className='flex flex-col gap-2 '>
                                            <div>{rateCard.vehicleType === 'Own Vehicle' && 'Adjusted '} Hourly Rate: £{rateCard.hourlyRate.toFixed(2)} /hr </div>
                                            {breakdownHTML}
                                        </div>
                                    </p>}
                                {errors.hourlyRate && <p className='text-sm m-1 text-red-400'>*{rateCard.vehicleType === 'Own Vehicle' && 'Adjusted '} hourly rate is below the minimum rate (£{rateCard.minimumRate} /hr)</p>}
                            </div>
                            <div><InputGroup type="number" iconPosition='left'
                                icon={<FaPoundSign className='text-neutral-300' />} placeholder="Select byod rate" label="Byod Rate"
                                onChange={(e) => setRateCard(prev => ({ ...prev, byodRate: e.target.value }))} required="true" /></div>
                            <div className='w-full flex justify-between mt-2 gap-3 items-center'>
                                {errors.existingRateCard && <p className='text-sm text-red-400 m-1'>* A Rate Card already exists for the specified Service and for selected Week.</p>}
                                <button disabled={Object.keys(errors).some((er) => er !== 'mileage' && errors[er])} onClick={handleAddRateCard} className='ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white '>Add</button>
                            </div>
                        </div>
                    </div>
                </div>


                <div className='max-h-[40rem] relative md:col-span-7 w-full bg-white dark:bg-dark dark:border-dark-3  shadow-lg border border-neutral-300 rounded-lg'>
                    <div className='z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'><h3>Rate card list</h3></div>
                    <div className='flex items-center justify-between p-2 rounded-lg border border-neutral-200 mx-3 mt-3'>
                        <div className='flex items-center gap-3'>
                            <p className='text-sm'>Filter By:</p>
                            <select className='w-30 h-8 text-sm rounded-lg border-[1.5px] border-neutral-300 bg-transparent outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500",
                                "px-5.5 placeholder:text-dark-6 dark:text-white"' onChange={(e) => setFilterVehicleType(e.target.value)} >
                                <option value=''>-Vehicle Type-</option>
                                <option value='Own Vehicle'>Own vehicle</option>
                                <option value='Company Vehicle'>Company vehicle</option>
                            </select>
                        </div>
                    </div>
                    <div className="max-h-[32.5rem] px-2 overflow-auto">
                        <table className="ratecard-table w-full text-sm text-center">
                            <thead>
                                <tr className="sticky top-0 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                                    <th>Status</th>
                                    <th>Vehicle Type</th>
                                    <th>Minimum Rate</th>
                                    <th>Service Title</th>
                                    <th>Service Week</th>
                                    <th>Service Rate</th>
                                    <th>Hourly Rate</th>
                                    <th>Mileage</th>
                                    <th>Byod Rate</th>
                                    <th>Options</th>
                                    <th>Added by</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedRateCards.map((group, index) => {
                                    const selectedWeek = selectedWeeks[group._id] || group.serviceWeeks[0];
                                    const currentCard = group.cards.find(card => card.serviceWeek === selectedWeek);

                                    return (
                                        <tr key={index} className={`hover:bg-neutral-50 dark:hover:bg-dark-4 ${!group.active ? 'text-gray-400' : 'dark:text-white'}`}>
                                            <td className="border-b border-neutral-200">
                                                <div className="flex justify-center">
                                                    <InputGroup type="toggleswitch" checked={group.active} />
                                                </div>
                                            </td>
                                            <td className="border-b border-neutral-200">
                                                {group.vehicleType}
                                            </td>
                                            <td className="border-b border-neutral-200">£ {group.minimumRate}</td>
                                            <td className="border-b border-neutral-200">{group.serviceTitle}</td>
                                            <td className="border-b border-neutral-200">
                                                {group.serviceWeeks.length > 1 ? (
                                                    <select
                                                        value={selectedWeek}
                                                        onChange={(e) => handleWeekSelect(group._id, e.target.value)}
                                                        className="border-[1.5px] border-neutral-200 rounded-md bg-white px-1 py-2 outline-none focus:border-primary-400"
                                                    >
                                                        {group.serviceWeeks.map((week, i) => (
                                                            <option key={i} value={week}>{week}</option>
                                                        ))}
                                                    </select>
                                                ) : group.serviceWeeks[0]}</td>
                                            <td className="border-b border-neutral-200">£ {group.serviceRate}</td>
                                            <td className="border-b border-neutral-200">£ {group.hourlyRate}</td>
                                            <td className="border-b border-neutral-200">£ {group.mileage}</td>
                                            <td className="border-b border-neutral-200">£ {group.byodRate}</td>
                                            <td className="border-b border-neutral-200">
                                                <div className="flex justify-center gap-2">
                                                    <button className="p-2 rounded-md hover:bg-neutral-200 text-amber-300">
                                                        <FiEdit3 size={17} />
                                                    </button>
                                                    <button className="p-2 rounded-md hover:bg-neutral-200 text-red-400">
                                                        <MdOutlineDelete size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="border-b border-neutral-200">
                                                <div className="relative flex justify-center cursor-pointer group">
                                                    <div className="z-4 absolute -left-5 -top-18 text-white -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md p-2 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
                                                        Added By: {group?.addedBy?.name} on {new Date(group.dateAdded).toLocaleDateString()}
                                                    </div>
                                                    <FcInfo size={18} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div >
        </div >
    );
};

export default Ratecard;