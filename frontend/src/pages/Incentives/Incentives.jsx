import React, { useState, useEffect, useMemo } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import InputGroup from '../../components/InputGroup/InputGroup';
import { IoCalendarOutline } from "react-icons/io5";
import { TiDelete } from "react-icons/ti";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { MdOutlineDelete } from "react-icons/md";
import { FaPoundSign } from 'react-icons/fa';
import axios from 'axios';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSites } from '../../features/sites/siteSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { FaUser } from "react-icons/fa";
import { FaBuildingUser } from "react-icons/fa6";
import moment from 'moment';
import SuccessTick from '../../components/UIElements/SuccessTick';
import Spinner from '../../components/UIElements/Spinner';
import TrashBin from '../../components/UIElements/TrashBin';
import DatePicker from '../../components/Datepicker/Datepicker';
import TableFeatures from '../../components/TableFeatures/TableFeatures'
import Modal from '../../components/Modal/Modal';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Incentives = () => {
    const dispatch = useDispatch();
    const { list: sites, siteStatus } = useSelector((state) => state.sites);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { userDetails } = useSelector((state) => state.auth);
    const [toastOpen, setToastOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const clearIncentive = {
        site: userDetails?.site || '',
        service: '',
        startDate: '',
        endDate: '',
        type: '',
        rate: 0,
    }
    const [newIncentive, setNewIncentive] = useState(clearIncentive);
    const [routeSupportInfoOpen, setRouteSupportInfoOpen] = useState(null)

    const [incentives, setIncentives] = useState([]);
    const [errors, setErrors] = useState({
        site: false,
        service: false,
        month: false,
        type: false,
        rate: false,
    });

    const columns = {
        'Site': 'site',
        "Service": 'service',
        'Start Date': 'startDate',
        'End Date': 'endDate',
        'Type': 'type',
        'Rate': 'rate'
    };
    const [displayColumns, setDisplayColumns] = useState(columns);

    const incentiveTypes = ['Normal', 'Prime', 'Peak'];

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites());
        if (serviceStatus === 'idle') dispatch(fetchServices());
    }, [siteStatus, serviceStatus, dispatch]);

    useEffect(() => {
        fetchIncentives();
    }, []);

    const fetchIncentives = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/incentives`);
            if (userDetails?.role === 'OSM') {
                const filteredIncentives = response.data.filter(
                    (incentive) => incentive.site === userDetails?.site
                );
                setIncentives(filteredIncentives);
            } else {
                setIncentives(response.data);
            }
        } catch (error) {
            console.error('Error fetching incentives:', error);
            // toast.error('Failed to fetch incentives');
        }
    };

    const validateFields = () => {
        const newErrors = {
            site: !newIncentive.site,
            service: !newIncentive.service,
            startDate: !newIncentive.startDate,
            endDate: !newIncentive.endDate,
            type: !newIncentive.type,
            rate: !newIncentive.rate || newIncentive.rate <= 0,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleAddIncentive = async () => {
        if (!validateFields()) return;

        try {
            setLoading(true)
            const incentiveToAdd = {
                ...newIncentive,
                // addedBy: {
                //     name: `${currentUser.firstName} ${currentUser.lastName}`,
                //     email: currentUser.email,
                //     addedOn: new Date().toISOString()
                // }
            };

            const response = await axios.post(`${API_BASE_URL}/api/incentives`, incentiveToAdd);
            setLoading(false)
            setIncentives([...incentives, response.data]);

            // Reset form
            setNewIncentive(clearIncentive);

            setToastOpen({
                content: <>
                    <SuccessTick width={20} height={20} />
                    <p className='text-sm font-bold text-green-500'>Incentive added successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            console.error('Error adding incentive:', error);
            // toast.error('Failed to add incentive');
        }
    };

    // Helper function to convert affectedInvoices to CSV
    const convertToCSV = (type, invoices) => {
        const headers = ['Driver Name', `${type === 'WeeklyInvoice' ? 'Week' : 'Date'}`];
        const rows = invoices.map((invoice) => [
            `"${invoice.driverName}"`, // Wrap in quotes to handle commas or special characters
            `${type === 'WeeklyInvoice' ? moment(invoice.serviceWeek).format('GGGG-[W]WW') : moment(invoice.date).format('DD/MM/YYYY')}`,
        ]);
        return [
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');
    };

    // Helper function to trigger CSV download
    const downloadCSV = (type, invoices, filename = `affected_${type === 'WeeklyInvoice' ? 'weekly' : 'daily'}_invoices.csv`) => {
        const csvContent = convertToCSV(type, invoices);
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

    const handleDeleteIncentive = async (id) => {
        try {
            setLoading(true)
            const incentiveData = incentives.find((inc) => inc._id === id)

            await axios.delete(`${API_BASE_URL}/api/incentives/${id}`);
            if (incentiveData.service === 'Route Support') {
                await axios.delete(`${API_BASE_URL}/api/deductions/${incentiveData.associatedDeduction?._id}`);
            }

            setRouteSupportInfoOpen(false)
            setIncentives(incentives.filter(incentive => incentive._id !== id));
            setToastOpen({
                content: <>
                    <TrashBin width={20} height={20} />
                    <p className='text-sm font-bold text-red-500'>Incentive deleted successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            setLoading(false)
            console.error('Error deleting incentive:', error);
            setToastOpen({
                content: <>
                    <div className='flex gap-3 items-center'>
                        <p className='flex gap-1 text-sm font-bold text-red-600 whitespace-nowrap'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.response?.data?.message}</p>
                        <div className="flex gap-2 mt-2">
                            <button
                                className="px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs whitespace-nowrap"
                                onClick={() => downloadCSV(error?.response?.data?.type, error?.response?.data?.negativeInvoices)}
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
        }
        finally {
            setLoading(false)
        }
    };


    const maxEndDate = useMemo(() => {
        if (!newIncentive.startDate) return null;

        const start = new Date(newIncentive.startDate);
        const max = new Date(start);
        max.setDate(start.getDate() + 10); // example: max end date is 30 days after start
        return max;
    }, [newIncentive.startDate]);

    const handleRouteSupportInfoOpen = async (incentive) => {
        const { _id: incentiveId, driverId, startDate: date } = incentive;

        try {
            const IncentiveCheck = await axios.get(`${API_BASE_URL}/api/incentives/check-dayinvoice`, {
                params: { incentiveId, driverId, date }
            });
            const DeductionCheck = await axios.get(`${API_BASE_URL}/api/deductions/check-dayinvoice`, {
                params: { deductionId: incentive.associatedDeduction._id, driverId: incentive.associatedDeduction.driverId, date }
            });
            const isLinked = IncentiveCheck.data.isLinked || DeductionCheck.data.isLinked
            setRouteSupportInfoOpen({ ...incentive, isLinked })
        } catch (error) {
            console.error('Error fetching deduction linkage:', error);
        }
    };


    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5 overflow-auto'>
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
            <div className='flex flex-col w-full h-full'>
                <h2 className="text-xl mb-3 font-bold dark:text-white">Incentives</h2>
                <div className='flex-1 flex overflow-auto gap-3'>
                    {/* Add new incentive section */}
                    <div className='h-full flex-1 flex-[2] flex flex-col w-full bg-white dark:bg-dark border border-neutral-300 dark:border-dark-3 rounded-lg'>
                        <div className='relative overflow-auto flex-1 flex flex-col'>
                            <div className='sticky top-0 z-5 rounded-t-lg w-full p-3.5 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                                <h3>Add new incentive</h3>
                            </div>
                            <div className="p-4 pb-8 flex flex-col gap-3">
                                {/* Site selection */}
                                <div>
                                    <InputGroup
                                        type="dropdown"
                                        label="Select Site"
                                        icon={<FaBuildingUser className='text-neutral-200' size={20} />}
                                        iconPosition="left"
                                        required={true}
                                        className={`${newIncentive.site === '' && 'text-gray-400'}`}
                                        onChange={(e) => {
                                            setNewIncentive({ ...newIncentive, site: e.target.value });
                                            setErrors({ ...errors, site: false });
                                        }}
                                        error={errors.site}
                                        value={newIncentive.site}
                                        disabled={userDetails?.role === 'OSM'}
                                    >
                                        <option value="">- Select Site -</option>
                                        {sites.map((site) => (
                                            <option key={site.siteKeyword} value={site.siteKeyword}>
                                                {site.siteName}
                                            </option>
                                        ))}
                                    </InputGroup>
                                    {errors.site && <p className="text-red-400 text-sm mt-1">* Site is required</p>}
                                </div>

                                {/* Service selection */}
                                <div>
                                    <InputGroup
                                        type="dropdown"
                                        label="Select Service"
                                        icon={<i class="absolute top-3.5 left-4.5 text-neutral-200 text-[1.2rem] fi fi-rr-shipping-fast"></i>}
                                        iconPosition="left"
                                        required={true}
                                        className={`${newIncentive.service === '' && 'text-gray-400'}`}
                                        onChange={(e) => {
                                            setNewIncentive({ ...newIncentive, service: e.target.value });
                                            setErrors({ ...errors, service: false });
                                        }}
                                        error={errors.service}
                                        value={newIncentive.service}
                                    >
                                        <option value="">- Select Service -</option>
                                        {services.map((service) => (
                                            <option key={service._id} value={service.title}>
                                                {service.title}
                                            </option>
                                        ))}
                                    </InputGroup>
                                    {errors.service && <p className="text-red-400 text-sm mt-1">* Service is required</p>}
                                </div>

                                {/* Month selection */}
                                {/* <div>
                                    <label className="text-sm font-medium block mb-3">Month <span className="text-red-400">*</span></label>
                                    <div className={`relative [&_svg]:absolute [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:left-4.5`}>
                                        <Flatpickr
                                            value={newIncentive.month}
                                            placeholder="Select Month"
                                            onChange={handleMonthChange}
                                            options={{
                                                plugins: [new monthSelectPlugin({
                                                    shorthand: true,
                                                    dateFormat: "Y-m",
                                                    theme: "light"
                                                })],
                                                dateFormat: "Y-m",
                                            }}
                                            className={`w-full pl-12 p-3 border-[1.5px] rounded-md ${errors.month ? 'border-red-400' : 'border-neutral-300'} focus:outline-none focus:border-2 focus:border-primary-500`}
                                        />
                                        {newIncentive.month ? (
                                            <TiDelete
                                                onClick={() => setNewIncentive({ ...newIncentive, month: '', type: '' })}
                                                className="size-7 cursor-pointer text-red-light right-3 left-auto"
                                            />
                                        ) : (
                                            <IoCalendarOutline className="pointer-events-none size-5 text-neutral-300" />
                                        )}
                                    </div>
                                    {errors.month && <p className="text-red-400 text-sm mt-1">* Month is required</p>}
                                </div> */}

                                <div>
                                    <DatePicker error={errors.startDate} iconPosition='left' value={newIncentive.startDate} label="Start date" onChange={(e) => { setErrors(prev => ({ ...prev, startDate: false })); setNewIncentive(prev => ({ ...prev, startDate: e })); }} />
                                    {errors.startDate && <p className="text-red-400 text-sm mt-1">* Start date is required</p>}
                                </div>
                                <div>
                                    <DatePicker error={errors.endDate} iconPosition='left' value={newIncentive.endDate} label="End date" disabled={!newIncentive.startDate} maxDate={maxEndDate} onChange={(e) => { setErrors(prev => ({ ...prev, endDate: false })); setNewIncentive(prev => ({ ...prev, endDate: e })) }} />
                                    {errors.endDate && <p className="text-red-400 text-sm mt-1">* End date is required</p>}
                                </div>

                                {/* Incentive type */}
                                <div>
                                    <InputGroup
                                        type="dropdown"
                                        label="Incentive Type"
                                        required={true}
                                        value={newIncentive.type}
                                        onChange={(e) => { setErrors(prev => ({ ...prev, type: false })); setNewIncentive(prev => ({ ...prev, type: e.target.value })) }}
                                        error={errors.type}
                                        icon={<i class="absolute top-3.5 left-4.5 fi fi-rr-handshake-deal-loan text-neutral-300 text-[1.2rem]"></i>}
                                        iconPosition="left"
                                        className={`${newIncentive.type === '' && 'text-gray-400'}`}
                                    >
                                        <option value=''>-Select Type-</option>
                                        <option value='Prime'>Prime</option>
                                        <option value='Normal'>Normal</option>
                                        <option value='Peak'>Peak</option>

                                    </InputGroup>
                                    {errors.type && <p className="text-red-400 text-sm mt-1">* Incentive type is required</p>}
                                </div>

                                {/* Rate */}
                                <div>
                                    <InputGroup
                                        type="number"
                                        label="Incentive Amount (£)"
                                        required={true}
                                        min={0}
                                        step="any"
                                        iconPosition="left"
                                        icon={<FaPoundSign className="text-neutral-300" />}
                                        onChange={(e) => {
                                            setNewIncentive({ ...newIncentive, rate: parseFloat(e.target.value) });
                                            setErrors({ ...errors, rate: false });
                                        }}
                                        error={errors.rate}
                                        value={newIncentive.rate}
                                    />
                                    {errors.rate && <p className="text-red-400 text-sm mt-1">* Valid incentive amount is required</p>}
                                </div>

                                <button
                                    onClick={handleAddIncentive}
                                    disabled={Object.values(errors).some((error) => error)}
                                    className="ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Incentives list section */}
                    <div className='relative flex-1 flex-[5] flex flex-col w-full h-full bg-white dark:bg-dark dark:border-dark-3  border border-neutral-300 rounded-lg'>
                        <div className='flex justify-between items-center rounded-t-lg w-full px-2 py-1.5 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                            <h3>Incentives list</h3>
                            <TableFeatures
                                columns={columns}
                                setColumns={setDisplayColumns}
                                content={incentives}
                                setContent={setIncentives}
                            />
                        </div>
                        <div className='flex-1 flex flex-col p-2 overflow-auto h-full'>
                            <table className="table-general overflow-auto">
                                <thead>
                                    <tr className="sticky -top-2 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                                        <th>#</th>
                                        {Object.keys(displayColumns).map((col) => (
                                            <th>{col}</th>
                                        ))}
                                        {/* <th>Added By</th>
                                    <th>Added On</th> */}
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incentives.map((incentive) => (
                                        <tr key={incentive._id} className={incentive.service === 'Route Support' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                            <td>{String(incentive._id).slice(-4)}</td>
                                            {Object.values(displayColumns).map((col) => {
                                                if (['startDate', 'endDate'].includes(col))
                                                    return <td>{new Date(incentive[col]).toLocaleDateString()}</td>
                                                if (col === 'rate')
                                                    return <td>£ {incentive.rate}</td>

                                                return <td>{incentive[col]}</td>

                                            })}
                                            {/* <td>
                                            {incentive.addedBy?.name}<br />
                                            {incentive.addedBy?.email}
                                        </td> 
                                        <td>{new Date(incentive.addedBy?.addedOn).toLocaleString()}</td>*/}
                                            <td>
                                                <div className='flex justify-center items-center gap-1'>
                                                    {incentive.type === 'Route Support' ?
                                                        <div onClick={() => handleRouteSupportInfoOpen(incentive)}>
                                                            <i class="cursor-pointer flex items-center text-blue-400 text-[1.1rem]  fi fi-sr-info"></i>
                                                            <Modal isOpen={routeSupportInfoOpen?._id === incentive._id}>
                                                                <div className='p-3 border-b border-neutral-300'>
                                                                    Associated Deduction
                                                                </div>
                                                                <div className='p-6 grid grid-cols-[2fr_5fr] gap-2'>
                                                                    <div className='font-bold'>Driver Name:</div>
                                                                    <div>{incentive?.associatedDeduction?.driverName}</div>
                                                                    <div className='font-bold'>Deduction Id:</div>
                                                                    <div>#{String(incentive?.associatedDeduction?._id).slice(-4)}</div>
                                                                    <div className='font-bold'>User ID:</div>
                                                                    <div>{incentive?.associatedDeduction?.user_ID}</div>
                                                                    <div className='font-bold'>Date:</div>
                                                                    <div>{new Date(incentive?.associatedDeduction?.date).toLocaleDateString()}</div>
                                                                    {routeSupportInfoOpen?.isLinked && <div className='flex gap-2 mt-4 col-span-2 bg-amber-100 px-2 py-1 rounded border border-amber-800 text-amber-800 text-sm text-left'><i class="flex items-center fi fi-sr-triangle-warning"></i> This route support assignment is linked to an existing Day Invoice.<br /> Please delete the associated Day Invoice before attempting to remove the route support assignment</div>}
                                                                    <div className='flex gap-1 mt-4 col-span-2 bg-amber-100 px-2 py-1 rounded border border-amber-800 text-amber-800 text-sm'><i class="flex items-center fi fi-sr-triangle-warning"></i>Deleting this incentive will also delete the associated deduction</div>
                                                                </div>
                                                                <div className='flex gap-2 justify-end border-t border-neutral-200 p-3'>
                                                                    <button onClick={() => setRouteSupportInfoOpen(null)} className='rounded bg-gray-500 text-white px-2 py-1 text-xs'>Close</button>
                                                                    <button onClick={() => handleDeleteIncentive(incentive._id)} disabled={routeSupportInfoOpen?.isLinked} className='rounded bg-red-500 text-white px-2 py-1 text-xs disabled:bg-gray-300'>Delete</button>
                                                                </div>
                                                            </Modal>
                                                        </div>
                                                        : <button
                                                            onClick={() => handleDeleteIncentive(incentive._id)}
                                                            className="justify-self-end p-2 rounded-md hover:bg-neutral-200 text-red-400"
                                                        >
                                                            <MdOutlineDelete size={17} />
                                                        </button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Incentives;