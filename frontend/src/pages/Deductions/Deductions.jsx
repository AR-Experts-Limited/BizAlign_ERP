import React, { useState, useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import InputGroup from '../../components/InputGroup/InputGroup';
import { MdOutlineDelete } from "react-icons/md";
import { FaPoundSign } from 'react-icons/fa';
import { BiSolidTimeFive } from "react-icons/bi";
import { fetchDrivers } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { FcPlus } from "react-icons/fc";
import { FaEye, FaUser } from "react-icons/fa";
import { FaBuildingUser } from "react-icons/fa6";
import DocumentViewer from '../../components/DocumentViewer/DocumentViewer'

import DatePicker from '../../components/Datepicker/Datepicker';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Deductions = () => {
    const dispatch = useDispatch()
    const { bySite: driversBySite, driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const clearDeduction = {
        driverId: '',
        driverName: '',
        rate: '',
        date: '',
        site: '',
        serviceType: '',
        deductionDocument: null,
        signed: false,
    }
    const [newDeduction, setNewDeduction] = useState(clearDeduction);
    const [deductions, setDeductions] = useState([])
    const [isUploadingFile, setIsUploadingFile] = useState({});
    const [vatValue, setVatValue] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [documentView, setDocumentView] = useState(null)

    const [errors, setErrors] = useState({
        driverId: false,
        site: false,
        serviceType: false,
        rate: false,
        date: false,
    });

    const fileInputRefs = useRef({});
    const uploadButtonsRefs = useRef({});

    const deductionServices = [
        "Fuel Support",
        "Fuel Topup",
        "Damage/repair Cost",
        "Route Support",
        "Penalty Charge Notice Admin Fee",
        "Adblue Top up",
        "Valet",
        "Screenwash Top up",
        "Puncture",
        "Recovery"
    ];

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, siteStatus, dispatch]);

    useEffect(() => {
        const fetchDeductions = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/deductions`);
                setDeductions(response.data);
            } catch (error) {
                console.error('Error fetching deductions:', error);
            }
        };
        fetchDeductions()
    }, [])

    const validateFields = () => {
        const newErrors = {
            driverId: !newDeduction.driverId,
            site: !newDeduction.site,
            serviceType: !newDeduction.serviceType,
            rate: !newDeduction.rate || newDeduction.rate <= 0,
            date: !newDeduction.date,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleFileChange = (e) => {
        setNewDeduction({ ...newDeduction, deductionDocument: e.target.files[0] });
    };

    const handleVatCheck = (serviceType, driverId) => {
        if (serviceType === 'Route Support' && driverId) {
            setVatValue(true);
        } else {
            setVatValue(false);
        }
    };

    const handleAddDeduction = async (e) => {
        if (!validateFields()) return;
        e.preventDefault();
        try {
            const driverDetail = driversBySite[newDeduction.site].filter((driver) => driver._id == newDeduction.driverId)
            const { firstName: firstName, lastName: lastName } = driverDetail[0]
            const newDeductionObj = {
                ...newDeduction,
                user_ID: driverDetail[0].user_ID,
                driverName: firstName + ' ' + lastName,
                signed: false
            }

            const data = new FormData()
            Object.keys(newDeductionObj).forEach((key) => {
                if (newDeductionObj[key]) {
                    if (newDeductionObj[key] instanceof File) {
                        data.append(key, newDeductionObj[key]);
                    } else {
                        data.append(key, newDeductionObj[key]);
                    }
                }
            });
            data.append('signed', false)
            const response = await axios.post(`${API_BASE_URL}/api/deductions`, data);
            setDeductions([...deductions, response.data]);
            setNewDeduction(clearDeduction)
        } catch (error) {
            console.error('Error adding deduction:', error);
        }
    };

    const handleDeleteDeduction = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/deductions/${id}`);
            setDeductions(deductions.filter(ded => ded._id !== id));
        } catch (error) {
            console.error('Error deleting deduction:', error);
        }
    };

    const handleFileInputClick = (id) => {
        if (fileInputRefs.current[id]) {
            fileInputRefs.current[id].click();
        }
    };

    const handleFileChangeTable = (e, id) => {
        const chooseFileElement = document.getElementById(`chooseFile-${id}`);
        const fileNameElement = document.getElementById(`fileName-${id}`);
        chooseFileElement.classList.add('hidden')
        chooseFileElement.classList.remove('block')

        uploadButtonsRefs.current[id].classList.remove('hidden');
        uploadButtonsRefs.current[id].classList.add('flex');
        fileNameElement.classList.add('block')
        fileNameElement.classList.remove('hidden')
        fileNameElement.textContent = e.target.files[0]?.name || 'No file chosen';
    };

    const handleRemoveFileAdded = (id) => {
        const chooseFileElement = document.getElementById(`chooseFile-${id}`);
        const fileNameElement = document.getElementById(`fileName-${id}`);
        uploadButtonsRefs.current[id].classList.remove('flex');
        uploadButtonsRefs.current[id].classList.add('hidden');
        chooseFileElement.classList.add('block')
        chooseFileElement.classList.remove('hidden')
        fileNameElement.classList.add('hidden')
        fileNameElement.classList.remove('block')
        fileInputRefs.current[id].value = '';
        fileNameElement.textContent = 'No file chosen';
    }

    const handleUploadFile = async (deduction) => {
        const data = new FormData()
        Object.keys(deduction).forEach((key) => {
            if (deduction[key]) {
                if (deduction[key] instanceof File) {
                    data.append(key, deduction[key]);
                } else {
                    data.append(key, deduction[key]);
                }
            }
        });
        data.append('deductionDocument', fileInputRefs.current[deduction._id].files[0])
        try {
            setIsUploadingFile(prev => ({ ...prev, [deduction._id]: true }))
            await axios.post(`${API_BASE_URL}/api/deductions/docupload`, data)
        }
        catch (error) {
            console.error('error updating deduction')
        }
        finally {
            setIsUploadingFile(prev => ({ ...prev, [deduction._id]: false }))
            fetchDeductions()
        }
    }

    const handleRemoveFileUploaded = async (id) => {
        try {
            await axios.post(`${API_BASE_URL}/api/deductions/deleteupload`, { id })
            fetchDeductions()
        }
        catch (error) {
            console.error('error deleting uploaded file')
        }
    }

    const fetchDeductions = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/deductions`);
            setDeductions(response.data);
        } catch (error) {
            console.error('Error fetching deductions:', error);
        }
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5 overflow-auto'>
            <div className='flex flex-col w-full h-full'>
                <h2 className='text-xl mb-3 font-bold dark:text-white'>Deductions</h2>
                <div className='flex-1 flex overflow-auto gap-3'>
                    {/* Add new deduction section */}
                    <div className='h-full flex-1 flex-[2] flex flex-col w-full bg-white dark:bg-dark border border-neutral-300 dark:border-dark-3 rounded-lg'>
                        <div className='relative overflow-auto flex-1 flex flex-col'>
                            <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                                <h3>Add new deduction</h3>
                            </div>
                            <div className='p-4 pb-8 flex flex-col gap-3'>
                                {/* Site selection */}
                                <div>
                                    <InputGroup
                                        type="dropdown"
                                        label="Select Site"
                                        icon={<FaBuildingUser className='text-neutral-200' size={20} />}
                                        iconPosition="left"
                                        required={true}
                                        className={`${newDeduction.site === '' && 'text-gray-400'}`}
                                        onChange={(e) => {
                                            setNewDeduction({ ...newDeduction, site: e.target.value });
                                            setErrors({ ...errors, site: false });
                                        }}
                                        error={errors.site}
                                        value={newDeduction.site}
                                    >
                                        <option value="">-Select Site-</option>
                                        {sites.map((site) => (
                                            <option key={site.siteKeyword} value={site.siteKeyword}>
                                                {site.siteName}
                                            </option>
                                        ))}
                                    </InputGroup>
                                    {errors.site && <p className="text-red-400 text-sm mt-1">* Site is required</p>}
                                </div>

                                {/* Date selection */}
                                <div>
                                    <DatePicker iconPosition={'left'} value={newDeduction.date}
                                        label={'Date'}
                                        required={true}
                                        error={errors.date}
                                        onChange={(date) => {
                                            setNewDeduction(prev => ({ ...prev, date }));
                                            setErrors({ ...errors, date: false });
                                        }} />
                                    {errors.date && <p className="text-red-400 text-sm mt-1">* Date is required</p>}
                                </div>

                                {/* Driver selection */}
                                <div>
                                    <div className="relative">
                                        <label className="text-body-sm font-medium text-black dark:text-white">
                                            Select Personnel<span className="ml-1 text-red select-none">*</span>
                                        </label>

                                        <div className="relative mt-3">
                                            <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-200 z-10 pointer-events-none" />

                                            <input
                                                type="text"
                                                value={searchTerm}
                                                disabled={newDeduction.site === ''}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onFocus={() => setDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setDropdownOpen(false), 100)} // delay to allow click
                                                placeholder="-Select Personnel-"
                                                className={`w-full rounded-lg border-[1.5px] ${errors.driverId ? "border-red animate-pulse" : "border-neutral-300"
                                                    } bg-transparent outline-none px-12 py-3.5 placeholder:text-dark-6 dark:text-white dark:border-dark-3 dark:bg-dark-2 focus:border-primary-500`}
                                            />

                                            {dropdownOpen && (
                                                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-white dark:bg-dark-3 shadow-lg">
                                                    {(driversBySite[newDeduction.site] || []).filter((driver) => !driver.disabled)
                                                        .filter((driver) =>
                                                            `${driver.firstName} ${driver.lastName}`
                                                                .toLowerCase()
                                                                .includes(searchTerm.toLowerCase())
                                                        )
                                                        .map((driver) => (
                                                            <li
                                                                key={driver._id}
                                                                className="cursor-pointer px-4 py-2 hover:bg-primary-100/50 dark:hover:bg-dark-2 text-sm"
                                                                onMouseDown={() => {
                                                                    const fullName = `${driver.firstName} ${driver.lastName}`;
                                                                    setNewDeduction({
                                                                        ...newDeduction,
                                                                        driverId: driver._id,
                                                                        driverName: fullName,
                                                                    });
                                                                    setSearchTerm(fullName);
                                                                    setErrors({ ...errors, driverId: false });
                                                                    handleVatCheck(newDeduction.serviceType, driver._id);
                                                                }}
                                                            >
                                                                {driver.firstName} {driver.lastName}
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                        </div>

                                        {errors.driverId && (
                                            <p className="text-red-400 text-sm mt-1">* Personnel is required</p>
                                        )}
                                    </div>

                                </div>

                                {/* Service type */}
                                <div>
                                    <InputGroup
                                        type="dropdown"
                                        label="Deduction Service Type"
                                        required={true}
                                        icon={<i class="absolute left-4.5 top-8 -translate-y-1/2 fi fi-rs-cheap-dollar text-neutral-200 text-[1.5rem]"></i>}
                                        iconPosition="left"
                                        className={`${newDeduction.serviceType === '' && 'text-gray-400'}`}
                                        onChange={(e) => {
                                            setNewDeduction({ ...newDeduction, serviceType: e.target.value });
                                            setErrors({ ...errors, serviceType: false });
                                            handleVatCheck(e.target.value, newDeduction.driverId);
                                        }}
                                        error={errors.serviceType}
                                        value={newDeduction.serviceType}
                                    >
                                        <option value="">-Select Service-</option>
                                        {deductionServices.map((service) => (
                                            <option key={service} value={service}>
                                                {service}
                                            </option>
                                        ))}
                                    </InputGroup>
                                    {errors.serviceType && <p className="text-red-400 text-sm mt-1">* Service type is required</p>}
                                </div>

                                {/* Rate */}
                                <div>
                                    <InputGroup
                                        type="number"
                                        label="Price Rate (£)"
                                        placeholder='Enter Deduction Amount'
                                        required={true}
                                        min={0}
                                        step="any"
                                        iconPosition="left"
                                        icon={<FaPoundSign className="text-neutral-300" />}
                                        onChange={(e) => {
                                            setNewDeduction({ ...newDeduction, rate: parseFloat(e.target.value) });
                                            setErrors({ ...errors, rate: false });
                                        }}
                                        error={errors.rate}
                                        value={newDeduction.rate}
                                    />
                                    {errors.rate && <p className="text-red-400 text-sm mt-1">* Valid amount is required</p>}
                                </div>

                                {/* VAT display (conditional) */}
                                {vatValue && (
                                    <div>
                                        <InputGroup
                                            type="number"
                                            label="Price Rate + VAT (20%)"
                                            disabled={true}
                                            iconPosition="left"
                                            icon={<FaPoundSign className="text-neutral-300" />}
                                            value={(newDeduction.rate * 1.2).toFixed(2)}
                                        />
                                    </div>
                                )}

                                {/* Document upload */}
                                <div>
                                    <label className="text-sm font-medium">Bill Upload</label>
                                    <p className="text-xs text-amber-500 mb-1">Allowed file formats: JPG, JPEG, PNG</p>
                                    <div className="relative mt-1">
                                        <InputGroup
                                            type="file"
                                            fileStyleVariant="style1"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddDeduction}
                                    disabled={Object.values(errors).some((error) => error)}
                                    className="ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Deductions list section */}
                    <div className='relative flex-1 flex-[5] flex flex-col w-full h-full bg-white dark:bg-dark dark:border-dark-3  border border-neutral-300 rounded-lg'>
                        <div className='flex rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                            <h3>Deductions list</h3>
                        </div>
                        <div className='flex-1 flex flex-col p-2 overflow-auto h-full'>
                            <table className="table-general overflow-auto">
                                <thead>
                                    <tr className="sticky -top-2 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                                        <th>#</th>
                                        <th>Personnel Name</th>
                                        <th>Date</th>
                                        <th>Site</th>
                                        <th>Service</th>
                                        <th>Rate</th>
                                        <th>Document</th>
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deductions.map((deduction) => (
                                        <tr key={deduction._id} className={deduction.serviceType === 'Route Support' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                            <td>{String(deduction._id).slice(-4)}</td>
                                            <td>{deduction.driverName}</td>
                                            <td>{new Date(deduction.date).toLocaleDateString('en-GB')}</td>
                                            <td>{deduction.site}</td>
                                            <td>{deduction.serviceType}</td>
                                            <td>£ {deduction.rate}</td>
                                            <td>
                                                <div className="flex flex-col justify-center items-center gap-1 min-w-[100px]">
                                                    {deduction.signed ? (
                                                        <div className='flex gap-1'>
                                                            <a
                                                                href={deduction.deductionDocument}
                                                                target='_blank'
                                                                className="flex justify-around gap-2 text-green-800 w-fit text-sm px-2 py-1 bg-green-100 border border-green-800/60 shadow rounded hover:bg-green-200 transition-colors"
                                                            >
                                                                <i className='flex items-center fi fi-rr-document'></i> Download
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {!deduction.deductionDocument ? (
                                                                <div className="w-full flex flex-col items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            id={`chooseFile-${deduction._id}`}
                                                                            onClick={() => handleFileInputClick(deduction._id)}
                                                                            className="block text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                                                                        >
                                                                            Choose File
                                                                        </button>
                                                                        <input
                                                                            type="file"
                                                                            ref={(el) => (fileInputRefs.current[deduction._id] = el)}
                                                                            className="hidden"
                                                                            accept=".jpg,.jpeg,.png"
                                                                            onChange={(e) => handleFileChangeTable(e, deduction._id)}
                                                                        />
                                                                    </div>
                                                                    <span id={`fileName-${deduction._id}`} className="hidden text-sm text-gray-500 truncate max-w-[120px]">
                                                                        No file chosen
                                                                    </span>
                                                                    <div
                                                                        ref={(el) => (uploadButtonsRefs.current[deduction._id] = el)}
                                                                        className="hidden mt-2 gap-2"
                                                                    >
                                                                        <button
                                                                            className="text-sm px-3 py-1 bg-primary-400 text-white rounded hover:bg-primary-500 disabled:bg-primary-200 transition-colors"
                                                                            onClick={() => handleUploadFile(deduction)}
                                                                            disabled={isUploadingFile[deduction._id]}
                                                                        >
                                                                            {isUploadingFile[deduction._id] ? 'Uploading...' : 'Upload'}
                                                                        </button>
                                                                        <button
                                                                            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                                                            onClick={() => handleRemoveFileAdded(deduction._id)}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className='flex flex-col items-center gap-2 rounded bg-white border border border-neutral-200 p-2'>
                                                                    <span id={`fileName-${deduction._id}`} className="text-sm text-gray-700 truncate max-w-[150px]">
                                                                        {decodeURIComponent(deduction.deductionDocument.split(`${deduction.driverId}/`)[1])}
                                                                    </span>
                                                                    <div className='flex gap-1'>
                                                                        <span className="flex w-fit items-center gap-1 text-xs px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full">
                                                                            <i class="flex items-center fi fi-rr-file-signature"></i> Pending
                                                                        </span>

                                                                        <button onClick={() => setDocumentView(deduction)} className="cursor-pointer flex w-fit items-center gap-1 text-xs p-2 bg-sky-100 text-sky-600 rounded-full" >
                                                                            <FaEye className={`${documentView?._id === deduction?._id && 'text-orange-400 '}`} size={14} />
                                                                        </button>
                                                                        <span
                                                                            onClick={() => handleRemoveFileUploaded(deduction._id)}
                                                                            className="cursor-pointer flex w-fit items-center gap-1 text-xs p-2 bg-red-100 text-red-600 rounded-full">
                                                                            <MdOutlineDelete size={14} />
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeleteDeduction(deduction._id)}
                                                    className="p-2 rounded-md hover:bg-neutral-200 text-red-400 transition-colors"
                                                    title="Delete deduction"
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
            <DocumentViewer document={documentView?.deductionDocument} onClose={() => setDocumentView(null)} />
        </div >
    );
};

export default Deductions;