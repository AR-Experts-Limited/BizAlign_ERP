import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import DatePicker from '../../components/Datepicker/Datepicker';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import countries from '../../lib/countries';
import SuccessTick from '../../components/UIElements/SuccessTick';
import { FaHouseUser, FaUser, FaEnvelope, FaIdCard, FaGlobe, FaCar } from 'react-icons/fa';
import { FaBuildingUser } from "react-icons/fa6";
import { GoNumber } from "react-icons/go";
import { IoEye } from "react-icons/io5";
import { IoEyeOff } from "react-icons/io5";
import Modal from '../../components/Modal/Modal';

// Personnel Info Tab Component
const PersonnelInfoTab = ({ sites, newDriver, onInputChange, errors, age, setAge }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Personnel Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* First Name */}
                <div>
                    <InputGroup
                        label="First Name"
                        placeholder="Enter first name"
                        type="text"
                        value={newDriver?.firstName}
                        name='firstName'
                        iconPosition="left"
                        onChange={(e) => onInputChange(e)}
                        required={true}
                        icon={<FaUser className='text-neutral-300' />}
                        error={errors.firstName}
                    />
                    {errors.firstName && <p className='text-sm font-light text-red'>* please provide first name</p>}
                </div>

                {/* Last Name */}
                <div>
                    <InputGroup
                        label="Last Name"
                        placeholder="Enter last name"
                        type="text"
                        name="lastName"
                        value={newDriver.lastName}
                        onChange={(e) => onInputChange(e)}
                        required={true}
                        iconPosition="left"
                        icon={<FaUser className='text-neutral-300' />}
                        error={errors.lastName}
                    />
                    {errors.lastName && <p className='text-sm font-light text-red'>* please provide last name</p>}
                </div>

                {/* Address */}
                <div>
                    <InputGroup
                        label="Address"
                        placeholder="Enter address"
                        type="text"
                        name="address"
                        error={errors.address}
                        value={newDriver.address}
                        iconPosition="left"
                        icon={<FaHouseUser className='text-neutral-300' />}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/* Post Code */}
                <div>
                    <InputGroup
                        label="Postal Code"
                        placeholder="Enter postal code"
                        type="text"
                        name="postcode"
                        error={errors.postcode}
                        value={newDriver.postcode}
                        iconPosition="left"
                        icon={<FaHouseUser className='text-neutral-300' />}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/* Date of Birth */}
                <div className='relative'>
                    <DatePicker
                        label="Date of Birth"
                        required={true}
                        value={newDriver.dateOfBirth}
                        name="dateOfBirth"

                        iconPosition="left"
                        error={errors.dateOfBirth}
                        maxDate={(() => {
                            const today = new Date();
                            const minDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
                                .toISOString().split('T')[0];
                            return minDate;
                        })()}
                        onChange={(value) => {
                            if (value !== '') {
                                const birthDate = new Date(value);
                                const today = new Date();

                                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                const hasBirthdayPassed =
                                    today.getMonth() > birthDate.getMonth() ||
                                    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

                                if (!hasBirthdayPassed) {
                                    calculatedAge--;
                                }
                                setAge(calculatedAge);
                            } else {
                                setAge(null);
                            }
                            onInputChange(null, value, "dateOfBirth");
                        }}
                    />
                    {age !== null && <div className='absolute top-1/2 right-3 text-xs bg-stone-100 border border-stone-200 shadow-sm rounded-md p-2'>Age: {age}</div>}
                    {errors.dateOfBirth && <p className='text-sm font-light text-red'>* Please provide date of birth</p>}
                </div>

                {/* Nationality */}
                <div>
                    <InputGroup type='dropdown'
                        name='nationality'
                        label='Nationality'
                        className={`${newDriver.nationality === '' && 'text-gray-400'}`}
                        value={newDriver.nationality}
                        onChange={(e) => onInputChange(e)}
                        error={errors.nationality}
                        iconPosition="left"
                        icon={<FaGlobe className='text-neutral-300' />}
                        required={true}>
                        <option disabled value="">Select Nationality</option>
                        {countries.map((country) => (
                            <option value={country}>{country}</option>
                        ))}
                    </InputGroup>
                    {errors.nationality && <p className='text-sm font-light text-red'>* please provide the nationality</p>}
                </div>

                {/* National Insurance Number */}
                <div>
                    <InputGroup
                        label="National Insurance Number"
                        placeholder="Enter NIN"
                        type="text"
                        required={true}
                        name="nationalInsuranceNumber"
                        error={errors.nationalInsuranceNumber}
                        iconPosition="left"
                        icon={<FaIdCard className='text-neutral-300' />}
                        value={newDriver.nationalInsuranceNumber}
                        onChange={(e) => { if (e.target.value.length <= 9) onInputChange(e) }}
                    />
                    {errors.nationalInsuranceNumber && <p className='text-sm font-light text-red'>* please provide a valid NI number</p>}
                </div>

                {/* Phone Number */}
                <div>
                    <InputGroup
                        label="Phone Number"
                        placeholder="Enter phone number"
                        type="phone"
                        required={true}
                        name="phoneNo"
                        value={newDriver.phoneNo}
                        onChange={(value) => onInputChange(null, value, "phoneNo")}
                        error={errors.phoneNo}
                    />
                    {errors.phoneNo && <p className='text-sm font-light text-red'>* please provide a valid Phone number</p>}
                </div>

                {/* Email */}
                <div>
                    <InputGroup
                        label="Email Address"
                        placeholder="Enter email address"
                        type="email"
                        required={true}
                        name="Email"
                        iconPosition='left'
                        icon={<FaEnvelope className='text-neutral-300' />}
                        error={errors.Email}
                        value={newDriver.Email}
                        onChange={(e) => onInputChange(e)}
                    />
                    {errors.Email && <p className='text-sm font-light text-red'>* please provide a valid email address</p>}
                </div>

                {/*Vehicle Type */}
                <div>
                    <InputGroup type='dropdown'
                        name='typeOfDriver'
                        label='Vehicle Type'
                        className={`${newDriver.typeOfDriver === '' && 'text-gray-400'}`}
                        value={newDriver.typeOfDriver}
                        onChange={(e) => onInputChange(e)}
                        error={errors.typeOfDriver}
                        iconPosition="left"
                        icon={<FaCar className='text-neutral-300' />}
                        required={true}>
                        <option disabled value="">Select Vehicle Type</option>
                        <option value='Own Vehicle'>Own Vehicle</option>
                        <option value='Company Vehicle'>Company Vehicle</option>
                    </InputGroup>
                    {errors.typeOfDriver && <p className='text-sm font-light text-red'>* please provide the vehicle type</p>}
                </div>
                {(newDriver.typeOfDriver === 'Company Vehicle') && <div>
                    <InputGroup
                        type='toggleswitch'
                        label='Personnel represents a limited company'
                        name="isLimitedCompany"
                        checked={newDriver.isLimitedCompany && newDriver.typeOfDriver === 'Company Vehicle'}
                        onChange={(e) => {

                            onInputChange(e)
                        }}
                    />
                </div>}

                {/* Vehicle Registration Plate */}
                <div>
                    <InputGroup
                        label="Vehicle Registration Plate"
                        placeholder="Enter vehicle registration number"
                        type="text"
                        name="vehicleRegPlate"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.vehicleRegPlate}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/*Vehicle Size */}
                <div>
                    <InputGroup type='dropdown'
                        name='vehicleSize'
                        label='Vehicle Size'
                        className={`${newDriver.vehicleSize === '' && 'text-gray-400'}`}
                        value={newDriver.vehicleSize}
                        onChange={(e) => onInputChange(e)}
                        error={errors.vehicleSize}
                        iconPosition="left"
                        icon={<FaCar className='text-neutral-300' />}
                        required={true}>
                        <option value="">Select Vehicle Size</option>
                        <option value='Small Van'>Small Van</option>
                        <option value='Large Van'>Large Van</option>
                    </InputGroup>
                    {errors.vehicleSize && <p className='text-sm font-light text-red'>* please provide the vehicle size</p>}
                </div>

                {/*Sites */}
                <div>
                    <InputGroup type='dropdown'
                        name='siteSelection'
                        label='Select Site'
                        className={`${newDriver.siteSelection === '' && 'text-gray-400'}`}
                        value={newDriver.siteSelection}
                        onChange={(e) => onInputChange(e)}
                        error={errors.siteSelection}
                        iconPosition="left"
                        icon={<FaBuildingUser className='text-neutral-300' />}
                        required={true}>
                        <option value="">Select Site</option>
                        {sites?.map((site) => (
                            <option value={site.siteKeyword}>{site.siteName}</option>
                        ))}
                    </InputGroup>
                    {errors.siteSelection && <p className='text-sm font-light text-red'>* please select the site</p>}
                </div>

                {/* TransportId */}
                <div>
                    <InputGroup
                        label="Transport Id"
                        placeholder="Enter transport id"
                        type="text"
                        name="transportId"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.transportId}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/* TransportId */}
                <div>
                    <InputGroup
                        label="Transporter Name"
                        placeholder="Enter Transporter Name"
                        type="text"
                        name="transporterName"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.transporterName}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/* UTR No.*/}
                <div>
                    <InputGroup
                        label="UTR Number"
                        placeholder="Enter UTR number"
                        type="text"
                        name="utrNo"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.utrNo}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {/* VAT Number */}
                <div>
                    <InputGroup
                        label="Vat Number"
                        placeholder="Enter VAT No."
                        type="text"
                        name="vatNo"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.vatNo}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                <div>
                    <DatePicker
                        label="VAT Effective Date"
                        value={newDriver.vatEffectiveDate}
                        name="vatEffectiveDate"
                        iconPosition="left"
                        onChange={(value) => onInputChange(null, value, "vatEffectiveDate")}
                    />
                </div>

                <div>
                    <DatePicker
                        label="Date of Joining"
                        value={newDriver.dateOfJoining}
                        name="dateOfJoining"
                        iconPosition="left"
                        onChange={(value) => onInputChange(null, value, "dateOfJoining")}
                    />
                </div>
            </div>
        </div>
    );
};

const BankDetails = ({ }) => {
    const [showDetails, setShowDetails] = useState({ showSortCode: false, showAccountNumber: false })
    return (<div className='p-6'>
        <h1 className='text-center font-bold'>Bank Details</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className='col-span-3 flex gap-1 items-center'>
                <label className='pt-2'>Personal Bank</label>
                <InputGroup className='!m-0' type='toggleswitch' />
                <label className='pt-2'>Company Bank</label>
            </div>
            <div><InputGroup type='text' label={`Bank Name`} /></div>
            <div className='relative'><InputGroup type={`${showDetails.showSortCode ? 'text' : 'password'}`} label={`Sort Code`} />
                <div className='cursor-pointer absolute text-stone-300 top-[60%] right-5' onClick={() => setShowDetails(prev => ({ ...prev, showSortCode: !prev.showSortCode }))}>{showDetails.showSortCode ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
            </div>
            <div className='relative'><InputGroup type={`${showDetails.showAccountNumber ? 'text' : 'password'}`} label={`Account Number`} />
                <div className='cursor-pointer absolute text-stone-300 top-[60%] right-5' onClick={() => setShowDetails(prev => ({ ...prev, showAccountNumber: !prev.showAccountNumber }))}>{showDetails.showAccountNumber ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
            </div>
            <div><InputGroup type='text' label={`Account Name`} /></div>
        </div>
    </div>)
}

// Driving License Tab Component
const DrivingLicenseTab = ({ newDriver, onInputChange, errors }) => {
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
                    {errors.drivingLicenseNumber && <p className='text-sm font-light text-red'>* please provide DL number</p>}
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
                        onChange={(value) => onInputChange(null, value, "dlValidity")}
                    />
                    {errors.dlValidity && <p className='text-sm font-light text-red'>* please provide your DL issue date</p>}
                </div>

                {/* DL Test Pass Date */}
                <div>
                    <DatePicker
                        label="Driving Licence Test Pass Date"
                        value={newDriver.dlPassDate}
                        maxDate={new Date()}
                        iconPosition="left"
                        onChange={(value) => onInputChange(null, value, "dlPassDate")}
                    />
                </div>

                {/* DL Expiry Date */}
                <div >
                    <DatePicker
                        label="Driving Licence Expiry Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.dlExpiry}
                        minDate={new Date()}
                        error={errors.dlExpiry}
                        onChange={(value) => onInputChange(null, value, "dlExpiry")}
                    />
                    {errors.dlExpiry && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>}
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
                            />
                            <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                <table className='table-general'>
                                    <thead>
                                        <tr>
                                            <th colspan={3}>
                                                History of Driving license Front Image
                                            </th>
                                        </tr>
                                        <tr>
                                            <th>Version</th>
                                            <th>Actions</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                        </div>
                        <div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Driving license Back Image"
                            />
                            <div className='mt-2 rounded-md h-20 w-full border-2 border-neutral-200'>
                                <table className='table-general'>
                                    <thead>
                                        <tr>
                                            <th colspan={3}>
                                                History of Driving license Back Image
                                            </th>
                                        </tr>
                                        <tr>
                                            <th>Version</th>
                                            <th>Actions</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                        </div>
                    </InputWrapper>
                </div>

            </div>
        </div >
    );
};

// Passport Tab Component
const PassportTab = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Passport Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Passport Issued From */}
                <div>
                    <InputGroup type='dropdown'
                        name='passportIssuedFrom'
                        label='Passport Issued From'
                        className={`${newDriver.passportIssuedFrom === '' && 'text-gray-400'}`}
                        value={newDriver.passportIssuedFrom}
                        onChange={(e) => onInputChange(e)}
                        error={errors.passportIssuedFrom}
                        iconPosition="left"
                        icon={<FaGlobe className='text-neutral-300' />}
                        required={true}>
                        <option disabled value="">Select Country</option>
                        {countries.map((country) => (
                            <option value={country}>{country}</option>
                        ))}
                    </InputGroup>
                    {errors.passportIssuedFrom && <p className='text-sm font-light text-red'>* please provide the passport issued country</p>}
                </div>

                {/*Passport Number*/}
                <div>
                    <InputGroup
                        label="Passport Number"
                        placeholder="Enter passport number"
                        type="text"
                        name="passportNumber"
                        iconPosition='left'
                        icon={<GoNumber className='text-neutral-300' />}
                        value={newDriver.passportNumber}
                        onChange={(e) => onInputChange(e)}
                        error={errors.passportNumber}
                        required={true}
                    />
                    {errors.passportNumber && <p className='text-sm font-light text-red'>* please provide passport number</p>}
                </div>

                <div>
                    <DatePicker
                        label="Passport Issue Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.passportIssueDate}
                        maxDate={new Date()}
                        error={errors.passportIssueDate}
                        onChange={(value) => onInputChange(null, value, "passportIssueDate")}
                    />
                    {errors.passportIssueDate && <p className='text-sm font-light text-red'>* please provide passport issue date</p>}
                </div>

                <div>
                    <DatePicker
                        label="Passport Expiry Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.passportExpiryDate}
                        minDate={new Date()}
                        error={errors.passportExpiryDate}
                        onChange={(value) => onInputChange(null, value, "passportExpiryDate")}
                    />
                    {errors.passportExpiryDate && <p className='text-sm font-light text-red'>* please provide passport expiry date</p>}
                </div>
                <div className='col-span-3 grid grid-cols-1 md:grid-cols-3'>
                    <div className='col-span-1'>
                        <InputGroup
                            type="file"
                            className='col-span-1'
                            fileStyleVariant="style1"
                            label="Passport Document"
                            name="passportDocument"
                            onChange={(e) => onInputChange(e)}
                        />
                    </div>
                    <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
                                <tr>
                                    <th colspan={3}>
                                        History of Passport Document
                                    </th>
                                </tr>
                                <tr>
                                    <th>Version</th>
                                    <th>Actions</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// RightToWork Tab Component
const RightToWorkTab = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Right to Work Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <DatePicker
                        label="Right to Work Issue Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.rightToWorkIssueDate}
                        maxDate={new Date()}
                        error={errors.rightToWorkIssueDate}
                        onChange={(value) => onInputChange(null, value, "rightToWorkIssueDate")}
                    />
                    {errors.rightToWorkIssueDate && <p className='text-sm font-light text-red'>* please provide issue date</p>}
                </div>

                <div>
                    <DatePicker
                        label="Right to Work Expiry Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.rightToWorkExpiryDate}
                        minDate={new Date()}
                        error={errors.rightToWorkExpiryDate}
                        onChange={(value) => onInputChange(null, value, "rightToWorkExpiryDate")}
                    />
                    {errors.rightToWorkExpiryDate && <p className='text-sm font-light text-red'>* please provide expiry date</p>}
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Right to work"
                        name="rightToWorkDocument"
                        onChange={(e) => onInputChange(e)}
                    />
                </div>
            </div>
        </div>
    );
};

// ECSTab Component
const ECSTab = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>ECS Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className='col-span-3'>
                    <InputGroup
                        type='toggleswitch'
                        label='ECS Information'
                        name="hasECS"
                        checked={newDriver.hasECS}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {newDriver.hasECS && (
                    <>
                        <div>
                            <DatePicker
                                label="ECS Issue Date"
                                required={true}
                                iconPosition="left"
                                value={newDriver.ecsIssueDate}
                                maxDate={new Date()}
                                error={errors.ecsIssueDate}
                                onChange={(value) => onInputChange(null, value, "ecsIssueDate")}
                            />
                            {errors.ecsIssueDate && <p className='text-sm font-light text-red'>* please provide issue date</p>}
                        </div>

                        <div>
                            <DatePicker
                                label="ECS Expiry Date"
                                required={true}
                                iconPosition="left"
                                value={newDriver.ecsExpiryDate}
                                minDate={new Date()}
                                error={errors.ecsExpiryDate}
                                onChange={(value) => onInputChange(null, value, "ecsExpiryDate")}
                            />
                            {errors.ecsExpiryDate && <p className='text-sm font-light text-red'>* please provide expiry date</p>}
                        </div>
                        <div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="ECS card"
                                name="ecsDocument"
                                onChange={(e) => onInputChange(e)}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// DocumentsTab Component
const DocumentsTab = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Documents</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Profile Picture"
                        name="profilePicture"
                        onChange={(e) => onInputChange(e)}
                    />
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
                                <tr>
                                    <th colspan={3}>
                                        History of Profile Picture
                                    </th>
                                </tr>
                                <tr>
                                    <th>Version</th>
                                    <th>Actions</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="NINO"
                        name="ninoDocument"
                        onChange={(e) => onInputChange(e)}
                    />
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
                                <tr>
                                    <th colspan={3}>
                                        History of NINO Document
                                    </th>
                                </tr>
                                <tr>
                                    <th>Version</th>
                                    <th>Actions</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Signature"
                        name="signature"
                        onChange={(e) => onInputChange(e)}
                    />
                    <div className='mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                        <table className='table-general'>
                            <thead>
                                <tr>
                                    <th colspan={3}>
                                        History of Signatures
                                    </th>
                                </tr>
                                <tr>
                                    <th>Version</th>
                                    <th>Actions</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VehicleInsuranceDetails = ({ newDriver, onInputChange, errors }) => {
    return (<div></div>)
}
const SelfEmploymentDetails = ({ newDriver, onInputChange, errors }) => {
    return (<div></div>)
}



const PersonnelForm = ({ sites, setPersonnelMode }) => {
    const clearDriver = {
        vehicleRegPlate: '',
        employmentStatus: 'Sole Trader',//personnel represents limited company if toggled 'set as "Limited Company"
        firstName: '',
        lastName: '',
        address: '',
        postcode: '',
        nationalInsuranceNumber: '',
        dateOfBirth: '',
        nationality: '',
        dateOfJoining: '',
        transportId: '',
        transporterName: '',
        utrNo: '',
        utrUpdatedOn: '',
        companyUtrNo: '',
        companyName: '',
        companyRegAddress: '',
        companyRegNo: '',
        companyRegExpiry: '',
        typeOfDriver: '',
        vehicleSize: '',
        Email: '',
        PhoneNo: '',
        bankName: '',
        sortCode: '',
        bankAccountNumber: '',
        accountName: '',
        bankNameCompany: '',  // Company Bank Details
        sortCodeCompany: '',
        bankAccountNumberCompany: '',
        accountNameCompany: '',
        bankChoice: 'Personal', // Toggle for Bank Choice
        drivingLicenseNumber: '',
        dlValidity: '',
        dlExpiry: '',
        issueDrivingLicense: '',
        passportIssuedFrom: '',
        passportNumber: '',
        passportValidity: '',
        passportExpiry: '',
        rightToWorkValidity: '',
        rightToWorkExpiry: '',
        siteSelection: '', // Default site selection
        ecsInformation: false,
        ecsValidity: '',
        ecsExpiry: '',
        profilePicture: '',
        insuranceDocument: '',
        drivingLicenseFrontImage: '',
        drivingLicenseBackImage: '',
        passportDocument: '',
        ecsCard: '',
        rightToWorkCard: '',
        signature: '',
        MotorVehicleInsuranceCertificate: '',
        GoodsInTransitInsurance: '',
        PublicLiablity: '',
    };

    const [newDriver, setNewDriver] = useState(clearDriver);
    const [errors, setErrors] = useState({});
    const [age, setAge] = useState(null);
    const [selectedTab, setSelectedTab] = useState('personnelInfo');
    const [success, setSuccess] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    let tabsInfo = [
        { id: 'personnelInfo', label: 'Personnel Info', component: PersonnelInfoTab },
        { id: 'bankDetails', label: 'Bank Details', component: BankDetails },
        { id: 'drivingLicense', label: 'Driving License', component: DrivingLicenseTab },
        { id: 'passport', label: 'Passport', component: PassportTab },
        { id: 'rightToWork', label: 'Right to Work', component: RightToWorkTab },
        { id: 'ecs', label: 'ECS', component: ECSTab },
        { id: 'documents', label: 'Documents', component: DocumentsTab },

    ];

    const [tabs, setTabs] = useState(tabsInfo)

    const requiredFields = {
        personnelInfo: [
            'firstName',
            'lastName',
            'dateOfBirth',
            'nationality',
            'nationalInsuranceNumber',
            'phoneNo',
            'Email',
            'typeOfDriver',
            'vehicleSize',
            'siteSelection',
        ],
        drivingLicense: [
            'drivingLicenseNumber',
            'dlValidity',
            'dlExpiry'
        ],
        passport: [
            'passportIssuedFrom',
            'passportNumber',
            'passportIssueDate',
            'passportExpiryDate'
        ],
        rightToWork: [
            'rightToWorkIssueDate',
            'rightToWorkExpiryDate'
        ],
        ecs: newDriver.hasECS ? [
            'ecsIssueDate',
            'ecsExpiryDate'
        ] : []
    };

    const validateFields = () => {
        const newErrors = {};
        const currentTabFields = requiredFields[selectedTab] || [];

        currentTabFields.forEach((key) => {
            if (String(newDriver[key]).trim() === "") {
                newErrors[key] = true;
            }
        });

        // Validate email fields
        if (selectedTab === 'personnelInfo' && newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2, 7}$/.test(newDriver.Email)) {
            newErrors.Email = true;
        }

        setErrors(newErrors);

        // Scroll to the first error input
        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return Object.keys(newErrors).length === 0;
    };

    const validateAllFields = () => {
        let isValid = true;

        for (const tabId in requiredFields) {
            const tabFields = requiredFields[tabId];
            if (tabId === 'ecs' && !newDriver.hasECS) continue;

            for (const field of tabFields) {
                if (String(newDriver[field]).trim() === "") {
                    setErrors(prev => ({ ...prev, [field]: true }));
                    isValid = false;
                }

                // Special validation for email
                if (field === 'Email' && newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2, 7}$/.test(newDriver.Email)) {
                    setErrors(prev => ({ ...prev, Email: true }));
                    isValid = false;
                }
            }
        }

        return isValid;
    };
    useEffect(() => {
        if (newDriver.typeOfDriver === 'Own Vehicle') {
            setNewDriver({ ...newDriver, isLimitedCompany: false })
            tabsInfo.splice(1, 0, { id: 'vehicleInsuranceDetails', label: 'Vehicle Insurance Details ', component: VehicleInsuranceDetails })
            setTabs(tabsInfo)
        }
        else if (newDriver.typeOfDriver === 'Company Vehicle') {
            tabsInfo = tabsInfo.filter((tabs) => tabs.id !== 'vehicleInsuranceDetails')
            setTabs(tabsInfo)
        }
        if (newDriver.isLimitedCompany) {
            tabsInfo.splice(1, 0, { id: 'selfEmploymentDetails', label: 'Self Employment Details ', component: SelfEmploymentDetails })
            setTabs(tabsInfo)
        }
        else if (!newDriver.isLimitedCompany) {
            tabsInfo = tabsInfo.filter((tabs) => tabs.id !== 'selfEmploymentDetails')
            setTabs(tabsInfo)
        }

    }, [newDriver.typeOfDriver, newDriver.isLimitedCompany])

    const onInputChange = (e, inputValue, inputName) => {
        let name, value;

        if (e) {
            if (e.target.type === 'checkbox') {
                value = e.target.checked;
                name = e.target.name;
            } else {
                value = e.target.value;
                name = e.target.name;
            }
        } else {
            name = inputName;
            value = inputValue;
        }

        setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
        setNewDriver((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateAllFields()) {
            // Find the first tab with errors
            for (const tab of tabs) {
                const tabHasError = requiredFields[tab.id]?.some(field => errors[field]);
                if (tabHasError) {
                    setSelectedTab(tab.id);
                    break;
                }
            }
            return;
        }

        // Submit logic here
        console.log('Form submitted:', newDriver);
        setSuccess(true);
        setTimeout(() => {
            setSuccess(false);
            setPersonnelMode('view');
        }, 2000);
    };

    const SelectedTabComponent = tabs.find(tab => tab.id === selectedTab)?.component;

    if (success) {
        return (
            <div className='flex flex-col h-full w-full items-center justify-center align-center'>
                <SuccessTick width='5rem' height='5rem' />
                <p className='flex mt-8 justify-center w-full text-green font-bold'>Personnel added successfully</p>
            </div>
        );
    }

    return (
        <>
            <div className='flex-1 p-2'>
                {/* Tabs Navigation */}
                <div className='flex justify-between overflow-x-auto snap-x snap-mandatory scrollbar-hide h-12 bg-primary-200/30 py-1 rounded-t-lg backdrop-blur-xl border border-primary-500'>
                    {tabs.map((tab, index) => (
                        <div
                            key={tab.id}
                            className={`flex justify-center m-1 w-full min-w-max dark:text-white snap-start ${index !== tabs.length - 1 ? 'border-r-2 border-primary-400' : ''}`}
                        >
                            <button
                                className={`${selectedTab === tab.id
                                    ? 'bg-white border-1 border-primary-400 shadow-lg dark:bg-primary-400'
                                    : 'hover:bg-primary-400/30 hover:rounded-md'
                                    } text-xs px-4 rounded-md transition mx-3`}
                                onClick={() => setSelectedTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Tab Content */}
                <div className='border-b border-x border-primary-300 rounded-b-lg'>
                    <SelectedTabComponent
                        newDriver={newDriver}
                        onInputChange={onInputChange}
                        errors={errors}
                        age={age}
                        setAge={setAge}
                        sites={sites}
                    />
                </div>


            </div>
            {/* Form Actions */}
            <div className='sticky bottom-0 bg-white flex justify-end items-center p-3 border-t border-neutral-200'>
                <div className='flex gap-3 text-sm'>
                    <button
                        onClick={() => {
                            if (validateFields()) {
                                // Find the next tab that's not the current one
                                const currentIndex = tabs.findIndex(tab => tab.id === selectedTab);
                                if (currentIndex < tabs.length - 1) {
                                    setSelectedTab(tabs[currentIndex + 1].id);
                                }
                            }
                        }}
                        className='bg-blue-500 rounded-md px-2 py-1 text-white'
                    >
                        Next
                    </button>
                    <button
                        onClick={handleSubmit}
                        className='bg-green-500 rounded-md px-2 py-1 text-white'
                    >
                        Save Personnel
                    </button>
                    <button
                        onClick={() => setPersonnelMode('view')}
                        className='bg-red-500 rounded-md px-2 py-1 text-white'
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};

export default PersonnelForm;