import React, { useState, useEffect } from 'react';
import PersonnelsTable from './PersonnelsTable';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { useSelector, useDispatch } from 'react-redux';
import PersonnelForm from './PersonnelForm';
import { fetchSites } from '../../features/sites/siteSlice';
import TableFeatures from '../../components/TableFeatures/TableFeatures';



const ManagePersonnels = () => {
    const [personnelMode, setPersonnelMode] = useState('view')
    const dispatch = useDispatch();
    const { list: drivers, driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const [driversList, setDriversList] = useState(drivers)
    const [columns, setColumns] = useState({ 'Vehicle Size': 'vehicleSize', 'First Name': 'firstName', 'Last Name': 'lastName', 'Transport Id': 'transportId', 'Site': 'siteSelection' })

    useEffect(() => {
        setDriversList(drivers)
    }, [drivers])

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, siteStatus, dispatch]);

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>
            {/* <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 items-center'>
                    {toastOpen?.content}
                </div>
            </div> */}
            <h2 className='text-sm md:text-xl mb-2 font-bold dark:text-white'>Manage Personnels</h2>
            <div className='flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='z-15 sticky top-0 flex items-center justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-t-lg border-b border-neutral-200'>
                    <div className='text-sm md:text-base'>{personnelMode === 'create' ? 'Add Personnel' : 'Personnels List'}</div>
                    {personnelMode === 'view' &&
                        <div className='flex h-full flex-col md:flex-row gap-2'>
                            <div className='justify-self-start md:justify-self-end'><TableFeatures columns={columns} setColumns={setColumns} content={driversList} setContent={setDriversList} /></div>
                            <button onClick={() => setPersonnelMode('create')} className='w-fit h-full self-end text-white bg-green-500 hover:bg-green-600  rounded-md text-xs md:text-sm px-2 py-1'>Add Personnel</button>
                        </div>
                    }
                </div>
                {personnelMode === 'view' ? <PersonnelsTable columns={columns} driversList={driversList} /> : <PersonnelForm setPersonnelMode={setPersonnelMode} sites={sites} />}
            </div>
        </div>
    );
};

export default ManagePersonnels;