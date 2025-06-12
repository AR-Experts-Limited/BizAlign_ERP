import React, { useState, useEffect, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import InputGroup from '../../components/InputGroup/InputGroup';
import { MdOutlineDelete } from "react-icons/md";
import { FaPoundSign, FaUser } from 'react-icons/fa';
import { BiSolidTimeFive } from "react-icons/bi";
import { fetchDrivers } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import { useSelector, useDispatch } from 'react-redux';
import { FaBuildingUser } from "react-icons/fa6";
import axios from 'axios'
import { FcPlus } from "react-icons/fc";
import { FaEye } from "react-icons/fa";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Instalments = () => {
    const dispatch = useDispatch()
    const { bySite: driversBySite, driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const clearInstalment = {
        driverId: '',
        driverName: '',
        installmentRate: '',
        tenure: '',
        site: '',
        installmentType: '',
        installmentDocument: null,
    }
    const [newInstalment, setNewInstalment] = useState(clearInstalment);
    const [instalments, setInstalments] = useState([])
    const [isUploadingFile, setIsUploadingFile] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);


    const [errors, setErrors] = useState({
        driverId: false,
        site: false,
        installmentType: false,
        installmentRate: false,
        tenure: false,
    });

    const fileInputRefs = useRef({});
    const uploadButtonsRefs = useRef({});


    const instalmentTypes = ['Security Deposit', 'Vehicle Repair Cost'];

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, siteStatus, dispatch]);

    useEffect(() => {
        const fetchinstalments = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/installments`);
                setInstalments(response.data);
            } catch (error) {
                console.error('Error fetching installments:', error);
            }
        };
        fetchinstalments()
    }, [])

    const validateFields = () => {
        const newErrors = {
            driverId: !newInstalment.driverId,
            site: !newInstalment.site,
            installmentType: !newInstalment.installmentType,
            installmentRate: !newInstalment.installmentRate || newInstalment.installmentRate <= 0,
            tenure: !newInstalment.tenure || newInstalment.tenure <= 0,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleFileChange = (e) => {
        setNewInstalment({ ...newInstalment, instalmentDocument: e.target.files[0] });
    };

    const handleAddInstalment = async (e) => {
        if (!validateFields()) return;
        e.preventDefault();
        try {
            const driverDetail = driversBySite[newInstalment.site].filter((driver) => driver._id == newInstalment.driverId)
            const { firstName: firstName, lastName: lastName } = driverDetail[0]
            const { installmentRate, tenure } = newInstalment
            const newInstallmentObj = {
                ...newInstalment, user_ID: driverDetail[0].user_ID, installmentPending: installmentRate, spreadRate: (installmentRate / tenure).toFixed(3), driverName: firstName + ' ' + lastName,
            }
            const data = new FormData()

            Object.keys(newInstallmentObj).forEach((key) => {
                if (newInstallmentObj[key]) {
                    if (newInstallmentObj[key] instanceof File) {
                        data.append(key, newInstallmentObj[key]);
                    } else {
                        data.append(key, newInstallmentObj[key]);
                    }
                }
            });
            data.append('signed', false)
            const response = await axios.post(`${API_BASE_URL}/api/installments`, data);
            setInstalments([...instalments, response.data.installment]);
            setNewInstalment(clearInstalment)
        } catch (error) {
            console.error('Error adding deduction:', error);
        }
    };

    const handleDeleteInstallment = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/installments/${id}`);
            setInstalments(instalments.filter(insta => insta._id !== id));
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

    const handleUploadFile = async (installment) => {
        const data = new FormData()
        Object.keys(installment).forEach((key) => {
            if (installment[key]) {
                if (installment[key] instanceof File) {
                    data.append(key, installment[key]);
                } else {
                    data.append(key, installment[key]);
                }
            }
        });
        data.append('installmentDocument', fileInputRefs.current[installment._id].files[0])
        try {
            setIsUploadingFile(prev => ({ ...prev, [installment._id]: true }))
            const upload = await axios.post(`${API_BASE_URL}/api/installments/docupload`, data)
        }
        catch (error) {
            console.error('error updating installment')
        }
        finally {
            setIsUploadingFile(prev => ({ ...prev, [installment._id]: false }))
            fetchInstalments()
        }
    }

    const handleRemoveFileUploaded = async (id) => {
        try {
            const removeUpload = await axios.post(`${API_BASE_URL}/api/installments/deleteupload`, { id })
            fetchInstalments()
        }
        catch (error) {
            console.error('error deleting uploaded file')
        }
    }

    const fetchInstalments = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/installments`);
            setInstalments(response.data);
        } catch (error) {
            console.error('Error fetching installments:', error);
        }
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5 overflow-auto'>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Instalments</h2>
            <div className='h-full grid grid-cols-1 md:grid-cols-7 gap-3'>
                {/* Add new instalment section */}
                <div className='h-full md:col-span-2 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg'>
                    <div className='relative overflow-auto max-h-[42rem]'>
                        <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                            <h3>Add new instalment</h3>
                        </div>
                        <div className='p-4 pb-8 flex flex-col gap-3'>
                            {/* Site selection */}
                            <div>
                                <InputGroup
                                    type="dropdown"
                                    label="Select Site"
                                    required={true}
                                    icon={<FaBuildingUser className='text-neutral-200' size={20} />}
                                    iconPosition="left"
                                    className={`${newInstalment.site === '' && 'text-gray-400'}`}
                                    onChange={(e) => {
                                        setNewInstalment({ ...newInstalment, site: e.target.value });
                                        setErrors({ ...errors, site: false });
                                    }}
                                    error={errors.site}
                                    value={newInstalment.site}
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
                                            disabled={newInstalment.site === ''}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onFocus={() => setDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setDropdownOpen(false), 100)} // delay to allow item click
                                            placeholder="-Select Personnel-"
                                            className={`w-full rounded-lg border-[1.5px] ${errors.driverId ? "border-red animate-pulse" : "border-neutral-300"
                                                } bg-transparent outline-none px-12 py-3.5 placeholder:text-dark-6 dark:text-white dark:border-dark-3 dark:bg-dark-2 focus:border-primary-500`}
                                        />

                                        {dropdownOpen && (
                                            <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-white dark:bg-dark-3 shadow-lg">
                                                {(driversBySite[newInstalment.site] || [])
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
                                                                setNewInstalment({
                                                                    ...newInstalment,
                                                                    driverId: driver._id,
                                                                    driverName: `${driver.firstName} ${driver.lastName}`,
                                                                });
                                                                setSearchTerm(`${driver.firstName} ${driver.lastName}`);
                                                                setErrors({ ...errors, driverId: false });
                                                                setDropdownOpen(false);
                                                            }}
                                                        >
                                                            {driver.firstName} {driver.lastName}
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {errors.driverId && <p className="text-red-400 text-sm mt-1">* Personnel is required</p>}
                            </div>

                            {/* Instalment type */}
                            <div>
                                <InputGroup
                                    type="dropdown"
                                    label="Instalment Type"
                                    icon={<i class="absolute left-4.5 top-7 -translate-y-1/2 fi fi-rs-money-check-edit text-neutral-200 text-[1.3rem]"></i>}
                                    iconPosition="left"
                                    required={true}
                                    className={`${newInstalment.installmentType === '' && 'text-gray-400'}`}
                                    onChange={(e) => {
                                        setNewInstalment({ ...newInstalment, installmentType: e.target.value });
                                        setErrors({ ...errors, installmentType: false });
                                    }}
                                    error={errors.installmentType}
                                    value={newInstalment.installmentType}
                                >
                                    <option value="">-Select Type-</option>
                                    {instalmentTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </InputGroup>
                                {errors.installmentType && <p className="text-red-400 text-sm mt-1">* Instalment type is required</p>}
                            </div>

                            {/* Instalment rate */}
                            <div>
                                <InputGroup
                                    type="number"
                                    label="Instalment Amount (£)"
                                    placeholder='Enter Instalment Amount'
                                    required={true}
                                    min={0}
                                    step="any"
                                    iconPosition="left"
                                    icon={<FaPoundSign className="text-neutral-300" />}
                                    onChange={(e) => {
                                        setNewInstalment({ ...newInstalment, installmentRate: parseFloat(e.target.value) });
                                        setErrors({ ...errors, installmentRate: false });
                                    }}
                                    error={errors.installmentRate}
                                    value={newInstalment.installmentRate}
                                />
                                {errors.installmentRate && <p className="text-red-400 text-sm mt-1">* Valid amount is required</p>}
                            </div>

                            {/* Tenure */}
                            <div>
                                <InputGroup
                                    type="number"
                                    label="Tenure (weeks)"
                                    placeholder='Enter Tenure Length'
                                    icon={<i class="absolute left-4.5 top-7 -translate-y-1/2 fi fi-rr-calendar-week text-neutral-200 text-[1.2rem]"></i>}
                                    iconPosition="left"
                                    required={true}
                                    min={1}
                                    onChange={(e) => {
                                        setNewInstalment({ ...newInstalment, tenure: parseInt(e.target.value) });
                                        setErrors({ ...errors, tenure: false });
                                    }}
                                    error={errors.tenure}
                                    value={newInstalment.tenure}
                                />
                                {errors.tenure && <p className="text-red-400 text-sm mt-1">* Valid tenure is required</p>}
                            </div>

                            {/* Document upload */}
                            <div>
                                <label className="text-sm font-medium">Bill Upload</label>
                                <p className="text-xs text-amber-500 mb-1">Allowed file formats: JPG, JPEG, PNG</p>
                                <div className="relative mt-1">
                                    <InputGroup
                                        type="file"
                                        fileStyleVariant="style1"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddInstalment}
                                disabled={Object.values(errors).some((error) => error)}
                                className="ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Instalments list section */}
                <div className='relative md:col-span-5 w-full bg-white dark:bg-dark dark:border-dark-3 shadow-lg border border-neutral-300 rounded-lg'>
                    <div className='z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                        <h3>Instalments list</h3>
                    </div>
                    <div className='px-2 overflow-auto max-h-[39.5rem]'>
                        <table className="table-general">
                            <thead>
                                <tr className="sticky top-0 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                                    <th>#</th>
                                    <th>Personnel Name</th>
                                    <th>Site</th>
                                    <th>Type</th>
                                    <th>Rate</th>
                                    <th>Tenure</th>
                                    <th>Balance</th>
                                    <th>Document</th>
                                    <th>Options</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instalments.map((instalment) => (
                                    <tr key={instalment._id}>
                                        <td>{String(instalment._id).slice(-4)}</td>
                                        <td>{instalment.driverName}</td>
                                        <td>{instalment.site}</td>
                                        <td>{instalment.installmentType}</td>
                                        <td>£ {instalment.installmentRate}</td>
                                        <td>{instalment.tenure} week{instalment.tenure > 1 && 's'}</td>
                                        <td className={instalment.installmentPending > 0 ? 'text-red-500' : 'text-green-500'}>
                                            £ {instalment.installmentPending}
                                        </td>
                                        <td>
                                            <div className="flex flex-col justify-center items-center gap-1 min-w-[100px]">
                                                {instalment.signed ? (
                                                    <a
                                                        href={instalment.installmentDocument}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex justify-around gap-2 text-green-800 w-fit text-sm px-2 py-1 bg-green-100 border border-green-800/60 shadow rounded hover:bg-green-200 transition-colors"
                                                    >
                                                        <i className='flex items-center fi fi-rr-document'></i> Download
                                                    </a>
                                                ) : (
                                                    <>
                                                        {!instalment.installmentDocument ? (
                                                            <div className="w-full flex flex-col items-center">
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        id={`chooseFile-${instalment._id}`}
                                                                        onClick={() => handleFileInputClick(instalment._id)}
                                                                        className="block text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                                                                    >
                                                                        Choose File
                                                                    </button>
                                                                    <input
                                                                        type="file"
                                                                        ref={(el) => (fileInputRefs.current[instalment._id] = el)}
                                                                        className="hidden"
                                                                        onChange={(e) => handleFileChangeTable(e, instalment._id)}
                                                                    />

                                                                </div>
                                                                <span id={`fileName-${instalment._id}`} className="hidden text-sm text-gray-500 truncate max-w-[120px]">
                                                                    No file chosen
                                                                </span>
                                                                <div
                                                                    ref={(el) => (uploadButtonsRefs.current[instalment._id] = el)}
                                                                    className="hidden mt-2 gap-2"
                                                                >
                                                                    <button
                                                                        className="text-sm px-3 py-1 bg-primary-400 text-white rounded hover:bg-primary-500 disabled:bg-primary-200 transition-colors"
                                                                        onClick={() => handleUploadFile(instalment)}
                                                                        disabled={isUploadingFile[instalment._id]}
                                                                    >
                                                                        {isUploadingFile[instalment._id] ? 'Uploading...' : 'Upload'}
                                                                    </button>
                                                                    <button
                                                                        className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                                                        onClick={() => handleRemoveFileAdded(instalment._id)}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className='flex flex-col items-center gap-2 rounded bg-white border border border-neutral-200 py-2 px-1'>
                                                                <span id={`fileName-${instalment._id}`} className="text-sm text-gray-700 truncate max-w-[100px]">
                                                                    {decodeURIComponent(instalment.installmentDocument.split(`${instalment.driverId}/`)[1])}
                                                                </span>
                                                                <div className='flex gap-1'>
                                                                    <span className="flex w-fit items-center gap-1 text-xs px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full">
                                                                        <i class="flex items-center fi fi-rr-file-signature"></i> Pending
                                                                    </span>
                                                                    <a
                                                                        href={instalment.installmentDocument} className="cursor-pointer flex w-fit items-center gap-1 text-xs p-2 bg-sky-100 text-sky-600 rounded-full">
                                                                        <FaEye size={14} />
                                                                    </a>
                                                                    <span
                                                                        onClick={() => handleRemoveFileUploaded(instalment._id)}
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
                                                onClick={() => handleDeleteInstallment(instalment._id)}
                                                className="p-2 rounded-md hover:bg-neutral-200 text-red-400 transition-colors"
                                                title="Delete installment"
                                            >
                                                <MdOutlineDelete size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default Instalments;