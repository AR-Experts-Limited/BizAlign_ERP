import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FiUserCheck, FiMapPin } from "react-icons/fi";
import { PiCardholder } from "react-icons/pi";
import { AiOutlineStock } from "react-icons/ai";
import { TbMap } from "react-icons/tb";
import {
    fetchDrivers,
    addDriver,
    updateDriver,
    deleteDriver,
} from '../../features/drivers/driverSlice';
import { fetchSchedules } from '../../features/schedules/scheduleSlice';

import { fetchSites } from '../../features/sites/siteSlice';
import Location from '../../components/Location/Location'

const Dashboard = () => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus, addStatus, deleteStatus, error } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const { list: schedules, scheduleStatus } = useSelector((state) => state.schedules)


    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
        if (scheduleStatus === 'idle') dispatch(fetchSchedules())
    }, [driverStatus, siteStatus, dispatch]);

    const informationCardDetails = [
        { title: 'Total Personnels', icon: <FiUserCheck size={20} />, info: drivers.length },
        { title: 'Total Sites', icon: <TbMap size={20} />, info: sites.length },
        { title: 'Total Rate Cards', icon: <PiCardholder size={20} />, info: 0 },
        { title: 'Overall Revenue', icon: <AiOutlineStock size={20} />, info: '£' + '0.00' },
        { title: 'Overall Expenses', icon: <AiOutlineStock size={20} />, info: '£' + '0.00' }
    ]
    return (
        <div className='w-full p-4 overflow-auto'>
            <h2 className='text-xl font-bold dark:text-white'>Dashboard</h2>

            {/* Info cards */}
            <div className='flex flex-wrap gap-2 m-1 md:m-8  justify-center md:justify-between'>
                {informationCardDetails.map((infoCard) => (
                    <div className='flex gap-3 w-full md:w-60 p-4 overflow-auto bg-primary-200/30 border-[1.5px] border-primary-500/30 text-primary-500 rounded-xl shadow-lg md:shadow-xl'>
                        <div className='flex items-center justify-center p-4 bg-white inset-shadow-sm/30 border-[1.5px] border-primary-500/40 rounded-lg'>{infoCard.icon}</div>
                        <div className='flex flex-col gap-2 '>
                            <p className='text-center font-bold'>{infoCard.title}</p>
                            <p className='text-center text-2xl text-white font-bold'>{infoCard.info}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Site cards */}
            <div className='flex flex-wrap m-1 mt-4 md:m-8 gap-2 justify-center md:justify-between text-sm'>
                {sites.map((site, index) => (
                    <div className='flex flex-col shadow-lg md:shadow-xl items-center gap-3 w-full md:w-60 p-4 bg-white/30 border-[1.5px] border-neutral-200 rounded-xl'>
                        <div className='flex items-center gap-2 '>
                            <div><FiMapPin size={17} /></div>
                            <p className='text-center font-bold'>{site.siteName}</p>
                        </div>
                        <div className='bg-primary-500 text-xs shadow-md text-white p-1 px-2 rounded-lg'>
                            <p>Site #{index + 1}</p>
                        </div>
                        <div>
                            <p className='my-2'>Total Expenses:</p>
                            <p className='my-2'>Total Profitable Revenue:</p>
                            <p className='my-2'>Total Personnels: {drivers.filter((d) => d.siteSelection === site.siteKeyword).length}</p>
                        </div>
                    </div>
                ))}
            </div>
            {/* <Location /> */}
        </div>
    );
};

export default Dashboard;