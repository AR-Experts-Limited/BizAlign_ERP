// src/features/ratecards/Ratecard.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRatecards, addRatecard } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import RateCardForm from './RateCardForm';
import RateCardTable from './RateCardTable';
import './Ratecard.scss'

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

    const handleDeleteRatecard = async (id) => {
        setToastOpen(true);
        setTimeout(() => setToastOpen(false), 2000);
    };

    return (
        <div className='relative w-full p-4 overflow-auto'>

            <h2 className='text-xl mb-3 font-bold dark:text-white'>Rate Card</h2>

            <div className='grid grid-cols-1 md:grid-cols-10 gap-3'>
                <RateCardForm
                    ratecards={ratecards}
                    services={services}
                    onAddRatecard={(rateCard) => dispatch(addRatecard(rateCard))}
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