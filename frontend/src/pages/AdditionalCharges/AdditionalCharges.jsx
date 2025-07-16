import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { MdOutlineDelete } from 'react-icons/md';
import { FaPoundSign, FaUser, FaEye } from 'react-icons/fa';
import { FaBuildingUser } from 'react-icons/fa6';
import InputGroup from '../../components/InputGroup/InputGroup';
import { fetchDrivers } from '../../features/drivers/driverSlice';
import { fetchSites } from '../../features/sites/siteSlice';
import WeekInput from '../../components/Calendar/WeekInput';
import SuccessTick from '../../components/UIElements/SuccessTick'
import Spinner from '../../components/UIElements/Spinner'
import TrashBin from '../../components/UIElements/TrashBin'
import TableFeatures from '../../components/TableFeatures/TableFeatures'

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AdditionalCharges = () => {
    const dispatch = useDispatch();
    const { bySite: driversBySite, driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites);

    const clearAddOn = {
        site: '',
        driverId: '',
        driverName: '',
        week: '',
        title: '',
        type: 'addition',
        rate: '',
        chargeDocument: null,
    };

    const [addOn, setAddOn] = useState(clearAddOn);
    const [allAdditionalCharges, setAllAdditionalCharges] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState({});
    const [toastOpen, setToastOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const chargeFileRef = useRef(null)
    const [errors, setErrors] = useState({
        site: false,
        driverId: false,
        week: false,
        title: false,
        rate: false,
    });

    const columns = {
        'Site': 'site',
        "Driver Name": 'driverName',
        'Week': 'week',
        'Title': 'title',
        'Rate': 'rate'
    };
    const [displayColumns, setDisplayColumns] = useState(columns);

    const fileInputRefs = useRef({});
    const uploadButtonsRefs = useRef({});

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites());
    }, [driverStatus, siteStatus, dispatch]);

    useEffect(() => {
        fetchAddOns();
    }, []);

    const fetchAddOns = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/addons`);
            setAllAdditionalCharges(response.data);
        } catch (error) {
            console.error('Error fetching additional charges:', error);
        }
    };

    const validateFields = () => {
        const newErrors = {
            site: !addOn.site,
            driverId: !addOn.driverId,
            week: !addOn.week,
            title: !addOn.title,
            rate: !addOn.rate || addOn.rate <= 0,
            chargeDocument: addOn?.chargeDocument && !['image/jpeg', 'image/jpg', 'image/png'].includes(addOn?.chargeDocument?.type)

        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleFileChange = (e) => {
        setAddOn({ ...addOn, chargeDocument: e.target.files[0] });
    };

    const handleAdd = async (e) => {
        if (!validateFields()) return;
        e.preventDefault();
        try {
            const driverDetail = driversBySite[addOn.site]?.find(
                (driver) => driver._id === addOn.driverId
            );
            if (!driverDetail) {
                console.error('Driver not found');
                return;
            }

            const newAddOn = {
                ...addOn,
                rate: addOn?.vat ? parseFloat(addOn?.rate * 1.2).toFixed(2) : addOn?.rate,
                driverName: `${driverDetail.firstName} ${driverDetail.lastName}`,
                user_ID: driverDetail?.user_ID,
            };

            const data = new FormData();

            // Append non-file fields first
            Object.keys(newAddOn).forEach((key) => {
                const value = newAddOn[key];
                if (value && !(value instanceof File)) {
                    data.append(key, value);
                }
            });

            // Append file fields last
            if (newAddOn.chargeDocument instanceof File) {
                data.append('chargeDocument', newAddOn.chargeDocument);
            }

            // Extra field
            data.append('signed', false);

            const response = await axios.post(`${API_BASE_URL}/api/addons`, data);
            setAllAdditionalCharges([...allAdditionalCharges, response.data.obj]);
            setAddOn(clearAddOn);
            setSearchTerm('');
            chargeFileRef.current.value = '';

            setToastOpen({
                content: (
                    <>
                        <SuccessTick width={20} height={20} />
                        <p className="text-sm font-bold text-green-500">
                            Additional Charge added successfully
                        </p>
                    </>
                ),
            });
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            console.error('Error adding charge:', error);
            setToastOpen({
                content: (
                    <>
                        <p className="flex gap-1 text-sm font-bold text-red-600">
                            <i className="flex items-center fi fi-ss-triangle-warning"></i>
                            {error?.response?.data?.message || 'Failed to add charge'}
                        </p>
                    </>
                ),
            });
            setTimeout(() => setToastOpen(null), 3000);
        }
    };


    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/addons/${id}`);
            setAllAdditionalCharges(allAdditionalCharges.filter((addon) => addon._id !== id));
            setToastOpen({
                content:
                    <>
                        <TrashBin width={25} height={25} />
                        <p className='text-sm font-bold text-red-500'>Additional Charge deleted successfully</p>
                    </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        } catch (error) {
            console.error('Error deleting charge:', error);
            setToastOpen({
                content: <>
                    <p className='flex gap-1 text-sm font-bold text-red-600'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.response?.data?.message}</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
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
        if (chooseFileElement && fileNameElement && uploadButtonsRefs.current[id]) {
            chooseFileElement.classList.add('hidden');
            chooseFileElement.classList.remove('block');
            uploadButtonsRefs.current[id].classList.remove('hidden');
            uploadButtonsRefs.current[id].classList.add('flex');
            fileNameElement.classList.add('block');
            fileNameElement.classList.remove('hidden');
            fileNameElement.textContent = e.target.files[0]?.name || 'No file chosen';
        }
    };

    const handleRemoveFileAdded = (id) => {
        const chooseFileElement = document.getElementById(`chooseFile-${id}`);
        const fileNameElement = document.getElementById(`fileName-${id}`);
        if (chooseFileElement && fileNameElement && uploadButtonsRefs.current[id]) {
            uploadButtonsRefs.current[id].classList.remove('flex');
            uploadButtonsRefs.current[id].classList.add('hidden');
            chooseFileElement.classList.add('block');
            chooseFileElement.classList.remove('hidden');
            fileNameElement.classList.add('hidden');
            fileNameElement.classList.remove('block');
            fileInputRefs.current[id].value = '';
            fileNameElement.textContent = 'No file chosen';
        }
    };

    const handleUploadFile = async (addon) => {
        const data = new FormData();
        Object.keys(addon).forEach((key) => {
            if (addon[key] && key !== 'chargeDocument') {
                data.append(key, addon[key]);
            }
        });
        if (fileInputRefs.current[addon._id]?.files[0]) {
            data.append('chargeDocument', fileInputRefs.current[addon._id].files[0]);
        }
        try {
            setIsUploadingFile(prev => ({ ...prev, [addon._id]: true }));
            await axios.post(`${API_BASE_URL}/api/addons/docupload`, data);
            await fetchAddOns();
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setIsUploadingFile(prev => ({ ...prev, [addon._id]: false }));
        }
    };

    const handleRemoveFileUploaded = async (id) => {
        try {
            await axios.post(`${API_BASE_URL}/api/addons/deleteupload`, { id });
            await fetchAddOns();
        } catch (error) {
            console.error('Error deleting uploaded file:', error);
        }
    };

    const getFileName = (documentUrl, driverId) => {
        if (!documentUrl || !driverId) return 'No file';
        try {
            const parts = documentUrl.split(`${driverId}/`);
            return parts[1] ? decodeURIComponent(parts[1]) : 'Document';
        } catch {
            return 'Document';
        }
    };

    const isVatApplicable = () => {
        const driver = driversBySite[addOn?.site]?.find((driver) => driver._id === addOn?.driverId)
        return (
            driver && ((driver?.vatDetails?.vatNo && new Date() >= new Date(driver.vatDetails.vatEffectiveDate)) ||
                (driver?.companyVatDetails?.companyVatNo && new Date() >= new Date(driver.companyVatDetails.companyVatEffectiveDate)))
        );
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5 overflow-auto'>
            <div className='flex flex-col w-full h-full'>
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
                <h2 className='text-xl mb-3 font-bold dark:text-white'>Additional Charges</h2>
                <div className='flex-1 flex overflow-auto gap-3'>
                    {/* Add new charge section */}
                    <div className='h-full flex-1 flex-[2] flex flex-col w-full bg-white dark:bg-dark border border-neutral-300 dark:border-dark-3 rounded-lg'>
                        <div className='relative overflow-auto flex-1 flex flex-col'>
                            <div className='sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white'>
                                <h3>Add new charge</h3>
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
                                        className={`${addOn.site === '' && 'text-gray-400'}`}
                                        onChange={(e) => {
                                            setAddOn({ ...addOn, site: e.target.value });
                                            setErrors({ ...errors, site: false });
                                        }}
                                        error={errors.site}
                                        value={addOn.site}
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
                                            <FaUser className="z-1 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-200  pointer-events-none" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                disabled={addOn.site === ''}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onFocus={() => setDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setDropdownOpen(false), 100)}
                                                placeholder="-Select Personnel-"
                                                className={`w-full rounded-lg border-[1.5px] ${errors.driverId ? "border-red animate-pulse" : "border-neutral-300"} bg-transparent outline-none px-12 py-3.5 placeholder:text-dark-6 dark:text-white dark:border-dark-3 dark:bg-dark-2 focus:border-primary-500`}
                                            />
                                            {dropdownOpen && (
                                                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-300 bg-white dark:bg-dark-3 shadow-lg">
                                                    {(driversBySite[addOn.site] || [])
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
                                                                    setAddOn({
                                                                        ...addOn,
                                                                        driverId: driver._id,
                                                                        driverName: fullName,
                                                                    });
                                                                    setSearchTerm(fullName);
                                                                    setErrors({ ...errors, driverId: false });
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

                                {/* Week selection */}
                                <div>
                                    <label className='text-sm font-medium block mb-3'>Select Weeks <span className='text-red-400'>*</span></label>
                                    <WeekInput
                                        value={addOn.week}
                                        error={errors.week}
                                        onChange={(week) => {
                                            setAddOn({ ...addOn, week: week });
                                            setErrors({ ...errors, week: false });
                                        }}
                                        selectedWeeks={addOn.week}
                                    />
                                    {errors.week && <p className="text-red-400 text-sm mt-1">* Week is required</p>}
                                </div>

                                {/* Title */}
                                <div>
                                    <InputGroup
                                        type="text"
                                        label="Title"
                                        placeholder="Enter Charge Title"
                                        required={true}
                                        onChange={(e) => {
                                            setAddOn({ ...addOn, title: e.target.value });
                                            setErrors({ ...errors, title: false });
                                        }}
                                        error={errors.title}
                                        value={addOn.title}
                                    />
                                    {errors.title && <p className="text-red-400 text-sm mt-1">* Title is required</p>}
                                </div>

                                {/* Type selection */}
                                <div>
                                    <label className="text-body-sm font-medium text-black dark:text-white">
                                        Charge Type<span className="ml-1 text-red select-none">*</span>
                                    </label>
                                    <div className="flex gap-4 mt-3">
                                        <label className="flex items-center gap-2 text-sm text-black dark:text-white">
                                            <input
                                                type="radio"
                                                checked={addOn.type === 'addition'}
                                                onChange={() => setAddOn({ ...addOn, type: 'addition' })}
                                                className="text-primary-500 focus:ring-primary-500"
                                            />
                                            Addition
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-black dark:text-white">
                                            <input
                                                type="radio"
                                                checked={addOn.type === 'deduction'}
                                                onChange={() => setAddOn({ ...addOn, type: 'deduction' })}
                                                className="text-primary-500 focus:ring-primary-500"
                                            />
                                            Deduction
                                        </label>
                                    </div>
                                </div>

                                {/* Rate */}
                                <div>
                                    <InputGroup
                                        type="number"
                                        label="Rate (£)"
                                        placeholder="Enter Amount"
                                        required={true}
                                        min={0}
                                        step="any"
                                        iconPosition="left"
                                        icon={<div>{addOn.type === 'deduction' ? <i class="absolute top-4 left-1 flex items-center fi fi-rr-minus-small text-[1.2rem] text-neutral-300"></i> : <i class="absolute top-4 left-1 flex items-center fi fi-rr-plus-small text-[1.2rem] text-neutral-300"></i>}<FaPoundSign className="text-neutral-300" /></div>}
                                        onChange={(e) => {
                                            setAddOn({ ...addOn, rate: parseFloat(e.target.value) });
                                            setErrors({ ...errors, rate: false });
                                        }}
                                        error={errors.rate}
                                        value={addOn.rate}
                                    />
                                    {errors.rate && <p className="text-red-400 text-sm mt-1">* Valid amount is required</p>}
                                </div>

                                {isVatApplicable() && addOn?.type === 'addition' &&
                                    <div>
                                        <InputGroup checked={addOn?.vat} type='toggleswitch' label="Add 20% VAT" onChange={(e) => setAddOn(prev => ({ ...prev, vat: e.target.checked }))} />
                                    </div>
                                }

                                {addOn?.vat && addOn?.type === 'addition' && <div>
                                    <InputGroup
                                        type="number"
                                        label={`Rate (£) after VAT 20%`}
                                        placeholder="Enter Amount"
                                        disabled={true}
                                        min={0}
                                        step="any"
                                        iconPosition="left"
                                        icon={<div>{addOn.type === 'deduction' ? <i class="absolute top-4 left-1 flex items-center fi fi-rr-minus-small text-[1.2rem] text-neutral-300"></i> : <i class="absolute top-4 left-1 flex items-center fi fi-rr-plus-small text-[1.2rem] text-neutral-300"></i>}<FaPoundSign className="text-neutral-300" /></div>}
                                        error={errors.rate}
                                        value={parseFloat(addOn?.rate * 1.2).toFixed(2)}
                                    />
                                </div>}


                                {/* Document upload */}
                                <div>
                                    <label className="text-sm font-medium text-black dark:text-white">Document Upload</label>
                                    <p className="text-xs text-amber-500 mb-1">Allowed file formats: JPG, JPEG, PNG</p>
                                    <div className="relative mt-1">
                                        <InputGroup
                                            type="file"
                                            ref={chargeFileRef}
                                            fileStyleVariant="style1"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    {errors.chargeDocument && <p className="text-red-400 text-sm mt-1">* Invalid file format</p>}
                                </div>

                                <button
                                    onClick={handleAdd}
                                    disabled={Object.values(errors).some((error) => error)}
                                    className="ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Additional charges list section */}
                    <div className='relative flex-1 flex-[5] flex flex-col w-full h-full bg-white dark:bg-dark dark:border-dark-3  border border-neutral-300 rounded-lg'>
                        <div className='flex justify-between items-center rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                            <h3>Additional Charges list</h3>
                            <TableFeatures
                                columns={columns}
                                setColumns={setDisplayColumns}
                                content={allAdditionalCharges}
                                setContent={setAllAdditionalCharges}
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
                                        <th>Document</th>
                                        <th>Options</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allAdditionalCharges.map((addon, index) => (
                                        <tr key={addon._id}>
                                            <td>{index + 1}</td>
                                            {Object.values(displayColumns).map((col) => {
                                                if (col === 'rate')
                                                    return <td>{addon.type === 'addition' ? '+ £ ' : '- £ '}{addon.rate}</td>

                                                return <td>{addon[col]}</td>

                                            })}
                                            <td>
                                                <div className="flex flex-col justify-center items-center gap-1 min-w-[100px]">
                                                    {addon.signed ? (
                                                        <a
                                                            href={addon.chargeDocument}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex justify-around gap-2 text-green-800 w-fit text-sm px-2 py-1 bg-green-100 border border-green-800/60 shadow rounded hover:bg-green-200 transition-colors"
                                                        >
                                                            <FaEye size={14} /> Download
                                                        </a>
                                                    ) : (
                                                        <>
                                                            {!addon.chargeDocument ? (
                                                                <div className="w-full flex flex-col items-center">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            id={`chooseFile-${addon._id}`}
                                                                            onClick={() => handleFileInputClick(addon._id)}
                                                                            className="block text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                                                                        >
                                                                            Choose File
                                                                        </button>
                                                                        <input
                                                                            type="file"
                                                                            ref={(el) => (fileInputRefs.current[addon._id] = el)}
                                                                            className="hidden"
                                                                            accept=".jpg,.jpeg,.png"
                                                                            onChange={(e) => handleFileChangeTable(e, addon._id)}
                                                                        />
                                                                    </div>
                                                                    <span id={`fileName-${addon._id}`} className="hidden text-sm text-gray-500 truncate max-w-[120px]">
                                                                        No file chosen
                                                                    </span>
                                                                    <div
                                                                        ref={(el) => (uploadButtonsRefs.current[addon._id] = el)}
                                                                        className="hidden mt-2 gap-2"
                                                                    >
                                                                        <button
                                                                            className="text-sm px-3 py-1 bg-primary-400 text-white rounded hover:bg-primary-500 disabled:bg-primary-200 transition-colors"
                                                                            onClick={() => handleUploadFile(addon)}
                                                                            disabled={isUploadingFile[addon._id]}
                                                                        >
                                                                            {isUploadingFile[addon._id] ? 'Uploading...' : 'Upload'}
                                                                        </button>
                                                                        <button
                                                                            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                                                                            onClick={() => handleRemoveFileAdded(addon._id)}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className='flex flex-col items-center gap-2 rounded bg-white border border-neutral-200 p-2'>
                                                                    <span id={`fileName-${addon._id}`} className="text-sm text-gray-700 truncate max-w-[150px]">
                                                                        {getFileName(addon.chargeDocument, addon.driverId)}
                                                                    </span>
                                                                    <div className='flex gap-1'>
                                                                        <span className="flex w-fit items-center gap-1 text-xs px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full">
                                                                            <i className="fi fi-rr-file-signature"></i> Pending
                                                                        </span>
                                                                        <a
                                                                            href={addon.chargeDocument}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="cursor-pointer flex w-fit items-center gap-1 text-xs p-2 bg-sky-100 text-sky-600 rounded-full"
                                                                        >
                                                                            <FaEye size={14} />
                                                                        </a>
                                                                        <span
                                                                            onClick={() => handleRemoveFileUploaded(addon._id)}
                                                                            className="cursor-pointer flex w-fit items-center gap-1 text-xs p-2 bg-red-100 text-red-600 rounded-full"
                                                                        >
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
                                                    onClick={() => handleDelete(addon._id)}
                                                    className="p-2 rounded-md hover:bg-neutral-200 text-red-400 transition-colors"
                                                    title="Delete charge"
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
        </div>
    );
};

export default AdditionalCharges;