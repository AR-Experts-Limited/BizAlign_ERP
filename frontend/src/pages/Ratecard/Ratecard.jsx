import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRatecards, deleteRatecard } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { FcInfo } from "react-icons/fc";
import InputGroup from '../../components/InputGroup/InputGroup'
import InputWrapper from '../../components/InputGroup/InputWrapper'
import RateCardWeek from '../../components/Calendar/RateCardWeek'
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineDelete } from "react-icons/md";
import TrashBin from '../../components/UIElements/TrashBin';
import './Ratecard.scss'

const Ratecard = () => {
    const dispatch = useDispatch();
    const [toastOpen, setToastOpen] = useState(false)
    const { list: ratecards, ratecardStatus, addRateCardStatus, deleteRateCardStatus, rateCardError } = useSelector((state) => state.ratecards);
    // const [ratecards, setRatecard] = useState([])
    const { list: services, serviceStatus, addServiceStatus, deleteServiceStatus, serviceError } = useSelector((state) => state.services);
    const [newService, setNewService] = useState(false)
    const [filterVehicleType, setFilterVehicleType] = useState('')
    const [newServiceError, setNewServiceError] = useState(false)

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

    return (
        <div className='relative w-full p-4 overflow-auto'>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-red-400 fixed flex justify-center items-center z-50 backdrop-blur-md top-4 left-1/2 -translate-x-1/2 bg-white/20 dark:bg-dark/20 w-50 h-15 md:w-60 md:h-30 rounded-lg shadow-lg`}>
                <div className='flex flex-rol md:flex-col gap-3 items-center'>
                    <TrashBin width={'40px'} height={'40px'} />
                    <p className='text-base font-bold text-red-500'>Rate deleted</p>
                </div>
            </div>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Rate Card</h2>
            <div className='grid grid-cols-1 md:grid-cols-7 gap-3'>
                <div className=' h-full md:col-span-2 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg'>
                    <div className='relative overflow-auto max-h-[40rem]'>
                        <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'><h3>Add new rate card</h3></div>
                        <div className='p-4 pb-8 flex flex-col gap-3  '>
                            <InputGroup type="dropdown" label="Vehicle Type" required="true">
                                <option value='Own Vehicle'>Own vehicle</option>
                                <option value='Company Vehicle'>Company vehicle</option>
                            </InputGroup>
                            <InputGroup type="number" label="Contractual Minimum Rate" required="true">
                            </InputGroup>
                            <InputWrapper title="Service">
                                <div className='flex flex-col gap-3'>
                                    <div className='flex items-center gap-1'>
                                        <input type="radio" checked={newService} onChange={(e) => setNewService(e.target.value)} />
                                        <label className='font-medium text-sm'> New Service</label>
                                    </div>
                                    <div>
                                        <InputGroup type="text" label='Service title' placeholder="New service title" required={newService} disabled={!newService}
                                            onChange={(e) => {
                                                if (services.some((service) => String(service.title).trim().toLowerCase() == String(e.target.value).trim().toLowerCase())) {
                                                    setNewServiceError(true)
                                                }
                                                else {
                                                    setNewServiceError(false)
                                                }
                                            }} />
                                        {newServiceError && <p className='text-red-400'>* the given service already exists</p>}
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                        <InputGroup type="number" label='Hours' required={newService} disabled={!newService} />
                                        <InputGroup type='dropdown' label='Minutes' required={newService} disabled={!newService}>
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
                                        <InputGroup type='dropdown' required={!newService} label='Select service' disabled={newService}>
                                            {services.map((service) => (
                                                <option>{service.title}</option>
                                            ))}
                                        </InputGroup>
                                    </div>
                                </div>
                            </InputWrapper>
                            <div>
                                <label className='text-sm font-medium'>Select Week <span className='text-red-400'>*</span></label>
                                <div className='mt-3'><RateCardWeek /></div>
                            </div>
                            <InputGroup type="number" placeholder="Select week mileage" label="Week Mileage" required="true" />
                            <InputGroup type="number" placeholder="Select service rate" label="Service Rate" required="true" />
                            <InputGroup type="number" placeholder="Select byod rate" label="Byod Rate" required="true" />
                            <div>
                                <button className='border border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white '>Add</button>
                            </div>
                        </div>
                    </div>
                </div>


                <div className='max-h-[40rem] relative md:col-span-5 w-full bg-white dark:bg-dark dark:border-dark-3  shadow-lg border border-neutral-300 rounded-lg'>
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
                    <div className='max-h-[32.5rem] px-2 overflow-auto'>
                        <table className='ratecard-table w-full'>
                            <thead>
                                <tr className='sticky top-0 p-2 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400'>
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
                                {filteredRatecards.map((ratecard, index) => (
                                    <tr className='text-center hover:bg-neutral-50 dark:hover:bg-dark-4 dark:text-white'>
                                        <td className='border-b border-neutral-200'><div className='flex justify-center'><InputGroup type="toggleswitch" checked={ratecard.active} /></div></td>
                                        <td className='border-b border-neutral-200'>{ratecard.vehicleType}</td>
                                        <td className='border-b border-neutral-200'>£ {ratecard.minimumRate}</td>
                                        <td className='border-b border-neutral-200'>{ratecard.serviceTitle}</td>
                                        <td className='border-b border-neutral-200'>{ratecard.serviceWeek}</td>
                                        <td className='border-b border-neutral-200'>£ {ratecard.serviceRate}</td>
                                        <td className='border-b border-neutral-200'>£ {ratecard.hourlyRate}</td>
                                        <td className='border-b border-neutral-200'>£ {ratecard.mileage}</td>
                                        <td className='border-b border-neutral-200'>£ {ratecard.byodRate}</td>
                                        <td>
                                            <div className='flex justify-center gap-2'>
                                                <button className='p-2 rounded-md hover:bg-neutral-200 text-amber-300'><FiEdit3 size={17} /></button>
                                                <button onClick={() => handleDeleteRatecard(ratecard._id)} className='p-2 rounded-md hover:bg-neutral-200 text-red-400'><MdOutlineDelete size={17} /></button>
                                            </div>
                                        </td>
                                        <td className='border-b border-neutral-200'>
                                            <div className="relative flex justify-center cursor-pointer group">
                                                <div className="z-4 absolute -left-5 -top-18 text-white -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md p-2 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
                                                    Added By: {ratecard.addedBy?.name} on {new Date(ratecard.dateAdded).toLocaleDateString()}
                                                    <div className="absolute right-[-5.5px] bottom-0 -translate-y-1/2 w-0 h-0 border-x-7 border-x-transparent border-t-10 border-t-gray-800/50 backdrop-blur-md" />
                                                </div>
                                                <FcInfo size={18} />
                                            </div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Ratecard;