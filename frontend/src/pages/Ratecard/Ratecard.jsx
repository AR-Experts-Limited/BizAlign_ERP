// src/features/ratecards/Ratecard.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRatecards, addRatecard, deleteRatecard } from '../../features/ratecards/ratecardSlice';
import { fetchServices, addService } from '../../features/services/serviceSlice';
import RateCardForm from './RateCardForm';
import RateCardTable from './RateCardTable';
import './Ratecard.scss'
import TrashBin from '../../components/UIElements/TrashBin';
import SuccessTick from '../../components/UIElements/SuccessTick'

const Ratecard = () => {
    const dispatch = useDispatch();
    const [toastOpen, setToastOpen] = useState(false);
    const [filterVehicleType, setFilterVehicleType] = useState('');

    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);

    useEffect(() => {
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (serviceStatus === 'idle') dispatch(fetchServices());
    }, [ratecardStatus, serviceStatus, dispatch]);

    const handleDeleteRatecard = async (ids) => {
        console.log(ids)
        dispatch(deleteRatecard(ids))
        setToastOpen({
            content: <>
                <TrashBin width={27} height={27} />
                <p className='text-sm font-bold text-red-500'>{ids.length > 1 ? 'Rate cards ' : 'Rate card '}deleted successfully</p>
            </>
        })
        setTimeout(() => setToastOpen(null), 3000);
    };

    const handleAddRateCard = async (rateCard, newService, newServiceInfo, existingweek) => {
        dispatch(addRatecard(rateCard))
        if (newService) {
            dispatch(addService({ title: newServiceInfo.title, hours: newServiceInfo.totalHours }))
        }
        setToastOpen({
            content: <>
                <SuccessTick width={20} height={20} />
                <p className='text-sm font-bold text-green-500'>{rateCard.serviceWeek.length > 1 ? 'Rate cards ' : 'Rate card '}added successfully</p>
            </>
        })
        setTimeout(() => setToastOpen(null), 3000);
    }
    const handleUpdateRateCard = async (ratecard, ids) => {

    }

    return (
        <div className='relative w-full p-4 overflow-auto'>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-4 justify-around items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Rate Card</h2>

            <div className='grid grid-cols-1 md:grid-cols-10 gap-3'>
                <RateCardForm
                    ratecards={ratecards}
                    services={services}
                    onAddRatecard={handleAddRateCard}
                />

                <RateCardTable
                    ratecards={ratecards}
                    filterVehicleType={filterVehicleType}
                    onFilterChange={setFilterVehicleType}
                    onDelete={handleDeleteRatecard}
                />
            </div>
        </div>
    );
};

export default Ratecard;