import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import InputWrapper from '../../../components/InputGroup/InputWrapper';
import { FaIdCard } from 'react-icons/fa';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'

const DrivingLicenseTab = ({ newDriver, onInputChange, errors }) => {

    const calculateDLValidity = () => {
        if (!newDriver.dlValidity || !newDriver.dlExpiry) return '';

        const issueDate = new Date(newDriver.dlValidity);
        const expiryDate = new Date(newDriver.dlExpiry);

        if (expiryDate < issueDate) return 'Invalid Dates';

        let years = expiryDate.getFullYear() - issueDate.getFullYear();
        let months = expiryDate.getMonth() - issueDate.getMonth();
        let days = expiryDate.getDate() - issueDate.getDate();

        if (days < 0) {
            const previousMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 0);
            days += previousMonth.getDate();
            months -= 1;
        }

        if (months < 0) {
            months += 12;
            years -= 1;
        }

        return `${years} year(s), ${months} month(s), and ${days} day(s)`;
    };

    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Driving License Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Driving License Number */}
                <div>
                    <InputGroup
                        label="Driving License Number"
                        placeholder="Enter DL number"
                        type="text"
                        required={true}
                        name="drivingLicenseNumber"
                        error={errors.drivingLicenseNumber}
                        value={newDriver.drivingLicenseNumber}
                        iconPosition="left"
                        icon={<FaIdCard className='text-neutral-300' />}
                        onChange={(e) => onInputChange(e)}
                    />
                    {errors.drivingLicenseNumber && <p className='text-sm font-light text-red'>* Please provide driving license number</p>}
                </div>

                {/* DL Issue Date */}
                <div>
                    <DatePicker
                        label="Driving Licence Issue Date"
                        required={true}
                        value={newDriver.dlValidity}
                        maxDate={new Date()}
                        error={errors.dlValidity}
                        iconPosition="left"
                        name="dlValidity"
                        onChange={(value) => onInputChange(null, value, "dlValidity")}
                    />
                    {errors.dlValidity && <p className='text-sm font-light text-red'>* Please provide driving license issue date</p>}
                </div>

                {/* DL Test Pass Date */}
                <div>
                    <DatePicker
                        label="Driving Licence Test Pass Date"
                        value={newDriver.issueDrivingLicense}
                        maxDate={new Date()}
                        iconPosition="left"
                        name="issueDrivingLicense"
                        onChange={(value) => onInputChange(null, value, "issueDrivingLicense")}
                    />
                </div>

                {/* DL Expiry Date */}
                <div>
                    <DatePicker
                        label="Driving Licence Expiry Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.dlExpiry}
                        minDate={new Date()}
                        error={errors.dlExpiry}
                        name="dlExpiry"
                        onChange={(value) => onInputChange(null, value, "dlExpiry")}
                    />
                    {errors.dlExpiry && <p className='text-sm font-light text-red'>* Please provide driving license expiry date</p>}
                </div>

                {/* License Validity Display */}
                <div className="col-span-3">
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <strong className="text-primary-600">License Validity:</strong>
                        <span className="ml-2 font-medium">{calculateDLValidity()}</span>
                    </div>
                </div>

                {/* Driving License Images */}
                <div className='col-span-1 md:col-span-3'>
                    <InputWrapper title={'Driving License'} colspan={2} gridCols={2}>
                        <div className='text-amber-500 cols-span-1 md:col-span-2'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>

                        <div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Driving license Front Image"
                                name="drivingLicenseFrontImage"
                                onChange={(e) => onInputChange(e)}
                            />
                            {newDriver.drivingLicenseFrontImageArray?.length > 0 && <div className='mt-2 overflow-auto rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                <table className='table-general'>
                                    <thead className='sticky top-0 bg-white'>
                                        <tr>
                                            <th colSpan={3}>
                                                History of Driving license Front Image
                                            </th>
                                        </tr>
                                        <tr>
                                            <th>Version</th>
                                            <th>Actions</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(newDriver.drivingLicenseFrontImageArray)
                                            .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((drivingLicFrontImage, index) => (
                                                <tr>
                                                    <td>{newDriver.drivingLicenseFrontImageArray.length - index}</td>
                                                    <td>
                                                        <div className='flex justify-around'>
                                                            <div onClick={() => handleFileView(drivingLicFrontImage.original)}
                                                                className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                        </div>
                                                    </td>
                                                    <td>{new Date(drivingLicFrontImage.timestamp).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>}
                        </div>
                        <div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Driving license Back Image"
                                name="drivingLicenseBackImage"
                                onChange={(e) => onInputChange(e)}
                            />
                            {newDriver.drivingLicenseBackImageArray?.length > 0 && <div className='mt-2 overflow-auto rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                <table className='table-general'>
                                    <thead className='sticky top-0 bg-white'>
                                        <tr>
                                            <th colSpan={3}>
                                                History of Driving license Back Image
                                            </th>
                                        </tr>
                                        <tr>
                                            <th>Version</th>
                                            <th>Actions</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(newDriver.drivingLicenseBackImageArray).
                                            sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((drivingLicBackImage, index) => (
                                                <tr>
                                                    <td>{newDriver.drivingLicenseBackImageArray.length - index}</td>
                                                    <td>
                                                        <div className='flex justify-around'>
                                                            <div onClick={() => handleFileView(drivingLicBackImage.original)}
                                                                className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                        </div>
                                                    </td>
                                                    <td>{new Date(drivingLicBackImage.timestamp).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>}
                        </div>
                    </InputWrapper>
                </div>
            </div >
        </div >
    );
};

export default DrivingLicenseTab;