// src/features/ratecards/Ratecard.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchRatecards, addRatecard, updateRatecard, deleteRatecard, updateRatecardActive } from '../../features/ratecards/ratecardSlice';
import { fetchServices, addService } from '../../features/services/serviceSlice';
import RateCardForm from './RateCardForm';
import RateCardTable from './RateCardTable';
import './Ratecard.scss'
import TrashBin from '../../components/UIElements/TrashBin';
import SuccessTick from '../../components/UIElements/SuccessTick'
import Spinner from '../../components/UIElements/Spinner'
import Modal from '../../components/Modal/Modal'
import InputGroup from '../../components/InputGroup/InputGroup'
import moment from 'moment'

const Ratecard = () => {
    const dispatch = useDispatch();
    const [mode, setMode] = useState('create')
    const clearRateCard = {
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
    }
    const [deleteInput, setDeleteInput] = useState('')
    const [deleteRatecards, setDeleteRatecards] = useState([])
    const [rateCard, setRateCard] = useState(clearRateCard);
    const [toastOpen, setToastOpen] = useState(false);
    const [loading, setLoading] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)

    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const { list: services, serviceStatus } = useSelector((state) => state.services);

    useEffect(() => {
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (serviceStatus === 'idle') dispatch(fetchServices());
    }, [ratecardStatus, serviceStatus, dispatch]);

    const convertToCSV = (invoices) => {
        const headers = ['Driver Name', 'Date'];
        const rows = invoices.map((invoice) => [
            `"${invoice.driverName}"`, // Wrap in quotes to handle commas or special characters
            moment(invoice.date).format('DD/MM/YYYY'),
        ]);
        return [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');
    };

    // Helper function to trigger CSV download
    const downloadCSV = (invoices, filename = 'affected_invoices.csv') => {
        const csvContent = convertToCSV(invoices);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDeleteRatecard = async (ids, confirm = false) => {
        setLoading(true)
        const reduxReturn = await dispatch(deleteRatecard({ ids, confirm })).unwrap()
        setLoading(false)
        if (!reduxReturn.response.data.confirm) {
            setDeleteRatecards(ids)
        }
        else {
            setDeleteRatecards([])
            setToastOpen({
                content: <>
                    <TrashBin width={27} height={27} />
                    <p className='text-sm font-bold text-red-500'>{ids.length > 1 ? 'Rate cards ' : 'Rate card '}deleted successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        }
    };

    const handleAddRateCard = async ({ rateCard, newService, newServiceInfo, existingWeeks }) => {
        setLoading(true)
        setConfirmModal(null)
        await dispatch(addRatecard({ rateCard, existingWeeks }))
        setLoading(false)

        setRateCard(clearRateCard)
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

    const onUpdateSelect = (ratecard) => {
        setRateCard(ratecard)
        setMode('edit')
    }

    const handleUpdateRateCard = async () => {
        setLoading(true);
        setConfirmModal(null);

        try {
            await dispatch(updateRatecard(rateCard)).unwrap(); // unwrap to catch the actual error thrown by createAsyncThunk
            setMode('create');
            setRateCard(clearRateCard);
            setToastOpen({
                content: (
                    <>
                        <SuccessTick width={20} height={20} />
                        <p className='text-sm font-bold text-green-500'>
                            {rateCard.serviceWeek.length > 1 ? 'Rate cards ' : 'Rate card '}updated successfully
                        </p>
                    </>
                )
            });
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            console.log(error)
            setToastOpen({
                content: <>
                    <div className='flex gap-3 items-center'>
                        <p className='flex gap-1 text-sm font-bold text-red-600 whitespace-nowrap'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.message}</p>
                        <div className="flex gap-2 mt-2">
                            <button
                                className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs whitespace-nowrap"
                                onClick={() => downloadCSV(error?.negativeInvoices)}
                            >
                                Download CSV
                            </button>
                            <button
                                className="px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 text-xs"
                                onClick={() => setToastOpen(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            })
        } finally {
            setLoading(false);
        }
    };


    const handleUpdateActiveStatus = async (ratecard) => {
        dispatch(updateRatecardActive(ratecard))
    }

    return (
        <div className='flex flex-col relative h-full w-full p-4 overflow-hidden'>
            <div className='flex flex-col w-full h-full dark:bg-dark-3'>
                <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                    <div className='flex gap-4 justify-around items-center'>
                        {toastOpen?.content}
                    </div>
                </div>
                <div className={`${loading ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                    <div className='flex gap-2 text-gray-500 justify-around items-center'>
                        <Spinner /> Processing...
                    </div>
                </div>
                <div className='text-xl font-bold dark:text-white'>Rate Card</div>
                <div className='flex-1 flex overflow-auto gap-3'>

                    <RateCardForm
                        ratecards={ratecards}
                        services={services}
                        rateCard={rateCard}
                        mode={mode}
                        setMode={setMode}
                        setRateCard={setRateCard}
                        clearRateCard={clearRateCard}
                        onAddRatecard={handleAddRateCard}
                        onUpdateRatecard={handleUpdateRateCard}
                        loading={loading}
                        setConfirmModal={setConfirmModal}
                    />

                    <RateCardTable
                        toastOpen={toastOpen}
                        ratecards={ratecards}
                        mode={mode}
                        rateCard={rateCard}
                        onDelete={handleDeleteRatecard}
                        onUpdate={onUpdateSelect}
                        onUpdateActive={handleUpdateActiveStatus}
                        loading={loading}
                    />
                </div>
            </div>
            <Modal isOpen={deleteRatecards.length > 0}>
                <div className='max-w-120 max-h-75 p-6'>
                    <>
                        <p>Delete User?</p>
                        <p className='text-sm italic'>Confirmation required for deleting associated schedules and invoices. Type "Permanently delete" to proceed.</p>
                        <InputGroup type='text' onChange={(e) => setDeleteInput(e.target.value)} />
                        <div className='flex gap-2 justify-end m-2'>
                            <button onClick={() => setDeleteRatecards([])} className='bg-amber-500 text-white text-xs border-1 border-amber-500 rounded-lg p-1 hover:bg-white hover:text-amber-500 dark:hover:bg-dark-4'>Cancel</button>
                            <button onClick={() => handleDeleteRatecard(deleteRatecards, true)} disabled={deleteInput !== "Permanently delete"} className='disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-neutral-100 bg-red border-1 border-red-500 p-1 rounded-md text-white text-sm hover:bg-white hover:text-red-500'>Delete</button>
                        </div>
                    </>
                </div>
            </Modal >
            <Modal isOpen={confirmModal}>
                <div className='flex flex-col w-150 max-w-150'>
                    <div className='p-3 border-b  border-neutral-300'>Confirm {confirmModal?.mode} ratecard</div>
                    <div className='px-8 py-4 rounded-md border border-neutral-300 m-5'>
                        <div className='grid grid-cols-2 gap-2 text-sm'>
                            <div>Vehicle Type:</div>
                            <div>{rateCard?.vehicleType}</div>
                            {rateCard?.vehicleType === 'Own Vehicle' && <>
                                <div>Van Rent:</div>
                                <div>£{rateCard?.vanRent}</div>
                                <div>Van Rent Hours:</div>
                                <div>{rateCard?.vanRentHours} hours</div></>}
                            <div>Service:</div>
                            <div>{rateCard?.serviceTitle}</div>
                            <div>Service Weeks:</div>
                            <div className='flex gap-1 border border-neutral-300 bg-white p-2 overflow-x-auto rounded'>{rateCard.serviceWeek.map((sweek) => (<div className='bg-gray-200 text-xs rounded-full px-2 py-1 whitespace-nowrap'>{sweek}</div>))}</div>
                            <div>Mileage:</div>
                            <div>£{rateCard?.mileage}</div>
                            <div>Service Rate:</div>
                            <div >£{rateCard?.serviceRate}</div>
                            <div>Hourly Rate</div>
                            <div>£{rateCard?.hourlyRate} /hr</div>
                            <div>Byod rate:</div>
                            <div>£{rateCard?.byodRate}</div>

                        </div>
                    </div>
                    <div className='flex gap-2 justify-end  border-t border-neutral-300 p-3'>
                        <button onClick={() => confirmModal?.mode === 'add' ? handleAddRateCard(confirmModal) : handleUpdateRateCard()} className='bg-primary-500 text-white text-sm border-1 border-primary-500 rounded-lg p-1 hover:bg-white hover:text-primary-500 dark:hover:bg-dark-4'>Confirm</button>
                        <button onClick={() => setConfirmModal(null)} className='bg-amber-500 text-white text-sm border-1 border-amber-500 rounded-lg p-1 hover:bg-white hover:text-amber-500 dark:hover:bg-dark-4'>Cancel</button>
                    </div>
                </div >
            </Modal >
        </div >
    );
};

export default Ratecard;