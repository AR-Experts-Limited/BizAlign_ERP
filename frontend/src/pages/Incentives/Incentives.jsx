import React, { useState, useEffect } from 'react';
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

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Incentives = () => {
    const dispatch = useDispatch();
    const { list: sites, siteStatus } = useSelector((state) => state.sites);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { userDetails } = useSelector((state) => state.auth);

    const [newIncentive, setNewIncentive] = useState({
        site: userDetails?.site || '',
        service: '',
        month: '',
        type: '',
        rate: 0,
    });

    const [incentives, setIncentives] = useState([]);
    const [errors, setErrors] = useState({
        site: false,
        service: false,
        month: false,
        type: false,
        rate: false,
    });

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
            month: !newIncentive.month,
            type: !newIncentive.type,
            rate: !newIncentive.rate || newIncentive.rate <= 0,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleAddIncentive = async () => {
        if (!validateFields()) return;

        try {
            const incentiveToAdd = {
                ...newIncentive,
                // addedBy: {
                //     name: `${currentUser.firstName} ${currentUser.lastName}`,
                //     email: currentUser.email,
                //     addedOn: new Date().toISOString()
                // }
            };

            const response = await axios.post(`${API_BASE_URL}/api/incentives`, incentiveToAdd);
            setIncentives([...incentives, response.data]);

            // Reset form
            setNewIncentive({
                site: currentUser?.site || '',
                service: '',
                month: '',
                type: '',
                rate: 0,
            });

            // toast.success('Incentive added successfully');
        } catch (error) {
            console.error('Error adding incentive:', error);
            // toast.error('Failed to add incentive');
        }
    };

    const handleDeleteIncentive = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/incentives/${id}`);
            setIncentives(incentives.filter(incentive => incentive._id !== id));
            // toast.success('Incentive deleted successfully');
        } catch (error) {
            console.error('Error deleting incentive:', error);
            // toast.error('Failed to delete incentive');
        }
    };

    const handleMonthChange = ([date]) => {
        const monthStr = date.toISOString().slice(0, 7);
        const monthNum = monthStr.slice(-2);

        let type = 'Normal';
        if (['07', '08', '09'].includes(monthNum)) type = 'Prime';
        if (['10', '11', '12'].includes(monthNum)) type = 'Peak';

        setNewIncentive({
            ...newIncentive,
            month: monthStr,
            type
        });
        setErrors({ ...errors, month: false });
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5 overflow-auto'>
            <h2 className="text-xl mb-3 font-bold dark:text-white">Incentives</h2>
            <div className="h-full grid grid-cols-1 md:grid-cols-7 gap-3">
                {/* Add new incentive section */}
                <div className="h-full md:col-span-2 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg">
                    <div className="relative overflow-auto max-h-[42rem]">
                        <div className="sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white">
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
                            <div>
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
                            </div>

                            {/* Incentive type */}
                            <div>
                                <InputGroup
                                    type="text"
                                    label="Incentive Type"
                                    required={true}
                                    value={newIncentive.type}
                                    disabled={true}
                                    placeholder="Select month to determine type"
                                    error={errors.type}
                                />
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
                <div className="h-full relative md:col-span-5 w-full bg-white dark:bg-dark dark:border-dark-3 shadow-lg border border-neutral-300 rounded-lg">
                    <div className="z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white">
                        <h3>Incentives list</h3>
                    </div>
                    <div className="p-4 overflow-auto max-h-[39.5rem]">
                        <table className="table-general">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Site</th>
                                    <th>Service Title</th>
                                    <th>Month</th>
                                    <th>Incentive Type</th>
                                    <th>Rate</th>
                                    {/* <th>Added By</th>
                                    <th>Added On</th> */}
                                    <th>Options</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incentives.map((incentive) => (
                                    <tr key={incentive._id}>
                                        <td>{String(incentive._id).slice(-4)}</td>
                                        <td>{incentive.site}</td>
                                        <td>{incentive.service}</td>
                                        <td>{new Date(incentive.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                                        <td>{incentive.type}</td>
                                        <td>£ {incentive.rate}</td>
                                        {/* <td>
                                            {incentive.addedBy?.name}<br />
                                            {incentive.addedBy?.email}
                                        </td> 
                                        <td>{new Date(incentive.addedBy?.addedOn).toLocaleString()}</td>*/}
                                        <td>
                                            <button
                                                onClick={() => handleDeleteIncentive(incentive._id)}
                                                className="p-2 rounded-md hover:bg-neutral-200 text-red-400"
                                            >
                                                <MdOutlineDelete size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Incentives;