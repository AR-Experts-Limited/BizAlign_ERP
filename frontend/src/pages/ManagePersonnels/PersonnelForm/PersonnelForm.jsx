import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import DatePicker from '../../components/Datepicker/Datepicker';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import countries from '../../lib/countries';
import SuccessTick from '../../components/UIElements/SuccessTick';
import { FaHouseUser, FaUser, FaEnvelope, FaIdCard, FaGlobe, FaCar, FaPhone, FaTruck, FaUniversity, FaSortAmountUp, FaCreditCard, FaIdBadge, FaPassport } from 'react-icons/fa';
import { FaBuildingUser } from "react-icons/fa6";
import { GoNumber } from "react-icons/go";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { fetchDrivers, addDriver } from '../../features/drivers/driverSlice';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;


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
                    {errors.firstName && <p className='text-sm font-light text-red'>* Please provide first name</p>}
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
                    {errors.lastName && <p className='text-sm font-light text-red'>* Please provide last name</p>}
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
                    {errors.nationality && <p className='text-sm font-light text-red'>* Please provide nationality</p>}
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
                    {errors.nationalInsuranceNumber && <p className='text-sm font-light text-red'>* Please provide a valid NI number</p>}
                </div>

                {/* Phone Number */}
                <div>
                    <InputGroup
                        label="Phone Number"
                        placeholder="Enter phone number"
                        type="phone"
                        required={true}
                        name="PhoneNo"
                        value={newDriver.PhoneNo}
                        onChange={(value) => onInputChange(null, value, "PhoneNo")}
                        error={errors.PhoneNo}
                        iconPosition="left"
                        icon={<FaPhone className='text-neutral-300' />}
                    />
                    {errors.PhoneNo && <p className='text-sm font-light text-red'>* Please provide a valid phone number</p>}
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
                    {errors.Email && <p className='text-sm font-light text-red'>* Please provide a valid email address</p>}
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
                    {errors.typeOfDriver && <p className='text-sm font-light text-red'>* Please provide vehicle type</p>}
                </div>

                {(newDriver.typeOfDriver === 'Company Vehicle') && <div>
                    <InputGroup
                        type='toggleswitch'
                        label='Personnel represents a limited company'
                        name="employmentStatus"
                        checked={newDriver.employmentStatus === 'Limited Company'}
                        onChange={(e) => {
                            onInputChange({
                                target: {
                                    name: "employmentStatus",
                                    value: e.target.checked ? "Limited Company" : "Sole Trader"
                                }
                            });
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
                        required={newDriver.typeOfDriver === 'Own Vehicle'}
                        error={errors.vehicleRegPlate}
                    />
                    {errors.vehicleRegPlate && <p className='text-sm font-light text-red'>* Please provide vehicle registration plate</p>}
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
                    {errors.vehicleSize && <p className='text-sm font-light text-red'>* Please provide vehicle size</p>}
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
                    {errors.siteSelection && <p className='text-sm font-light text-red'>* Please select site</p>}
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

                {/* Transporter Name */}
                <div>
                    <InputGroup
                        label="Transporter Name"
                        placeholder="Enter Transporter Name"
                        type="text"
                        name="transporterName"
                        iconPosition='left'
                        icon={<FaTruck className='text-neutral-300' />}
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
                        label="VAT Number"
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
                        disabled={!newDriver.vatNo}
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

const BankDetails = ({ newDriver, onInputChange, errors }) => {
    const [showDetails, setShowDetails] = useState({
        showSortCode: false,
        showAccountNumber: false,
        showSortCodeCompany: false,
        showAccountNumberCompany: false
    });

    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Bank Details</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className='col-span-3 flex gap-1 items-center'>
                    <label className='pt-2'>Personal Bank</label>
                    <InputGroup
                        type='toggleswitch'
                        name="bankChoice"
                        checked={newDriver.bankChoice === "Company"}
                        onChange={(e) => onInputChange({
                            target: {
                                name: "bankChoice",
                                value: e.target.checked ? "Company" : "Personal"
                            }
                        })}
                    />
                    <label className='pt-2'>Company Bank</label>
                </div>

                {newDriver.bankChoice === "Personal" ? (
                    <>
                        <div>
                            <InputGroup
                                type='text'
                                label="Bank Name"
                                name="bankName"
                                value={newDriver.bankName}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.bankName}
                            />
                            {errors.bankName && <p className='text-sm font-light text-red'>* Please provide bank name</p>}
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showSortCode ? 'text' : 'password'}
                                label="Sort Code"
                                name="sortCode"
                                value={newDriver.sortCode}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaSortAmountUp className='text-neutral-300' />}
                                required={true}
                                error={errors.sortCode}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[60%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showSortCode: !prev.showSortCode }))}
                            >
                                {showDetails.showSortCode ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            {errors.sortCode && <p className='text-sm font-light text-red'>* Please provide a valid sort code</p>}
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showAccountNumber ? 'text' : 'password'}
                                label="Account Number"
                                name="bankAccountNumber"
                                value={newDriver.bankAccountNumber}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaCreditCard className='text-neutral-300' />}
                                required={true}
                                error={errors.bankAccountNumber}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[60%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showAccountNumber: !prev.showAccountNumber }))}
                            >
                                {showDetails.showAccountNumber ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            {errors.bankAccountNumber && <p className='text-sm font-light text-red'>* Please provide account number</p>}
                        </div>
                        <div>
                            <InputGroup
                                type='text'
                                label="Account Name"
                                name="accountName"
                                value={newDriver.accountName}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUser className='text-neutral-300' />}
                                required={true}
                                error={errors.accountName}
                            />
                            {errors.accountName && <p className='text-sm font-light text-red'>* Please provide account name</p>}
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <InputGroup
                                type='text'
                                label="Company Bank Name"
                                name="bankNameCompany"
                                value={newDriver.bankNameCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.bankNameCompany}
                            />
                            {errors.bankNameCompany && <p className='text-sm font-light text-red'>* Please provide company bank name</p>}
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showSortCodeCompany ? 'text' : 'password'}
                                label="Company Sort Code"
                                name="sortCodeCompany"
                                value={newDriver.sortCodeCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaSortAmountUp className='text-neutral-300' />}
                                required={true}
                                error={errors.sortCodeCompany}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[60%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showSortCodeCompany: !prev.showSortCodeCompany }))}
                            >
                                {showDetails.showSortCodeCompany ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            {errors.sortCodeCompany && <p className='text-sm font-light text-red'>* Please provide a valid company sort code</p>}
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showAccountNumberCompany ? 'text' : 'password'}
                                label="Company Account Number"
                                name="bankAccountNumberCompany"
                                value={newDriver.bankAccountNumberCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaCreditCard className='text-neutral-300' />}
                                required={true}
                                error={errors.bankAccountNumberCompany}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[60%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showAccountNumberCompany: !prev.showAccountNumberCompany }))}
                            >
                                {showDetails.showAccountNumberCompany ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            {errors.bankAccountNumberCompany && <p className='text-sm font-light text-red'>* Please provide company account number</p>}
                        </div>
                        <div>
                            <InputGroup
                                type='text'
                                label="Company Account Name"
                                name="accountNameCompany"
                                value={newDriver.accountNameCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUser className='text-neutral-300' />}
                                required={true}
                                error={errors.accountNameCompany}
                            />
                            {errors.accountNameCompany && <p className='text-sm font-light text-red'>* Please provide company account name</p>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Driving License Tab Component
const DrivingLicenseTab = ({ newDriver, onInputChange, errors }) => {
    const calculateDLValidity = () => {
        if (!newDriver.dlValidity || !newDriver.dlExpiry) return '';

        const issueDate = new Date(newDriver.dlValidity);
        const expiryDate = new Date(newDriver.dlExpiry);

        if (expiryDate < issueDate) return 'Invalid Dates';

        let years = expiryDate.getFullYear() - issueDate.getFullYear();
        let months = expiryDate.getMonth() - issueDate.getMonth();
        let days = expiryDate.getDate() - issueDate.getDate();

        // Adjust days if negative
        if (days < 0) {
            const previousMonth = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 0);
            days += previousMonth.getDate();
            months -= 1;
        }

        // Adjust months if negative
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
                                name="drivingLicenseBackImage"
                                onChange={(e) => onInputChange(e)}
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
        </div>
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
                    {errors.passportIssuedFrom && <p className='text-sm font-light text-red'>* Please provide passport issued country</p>}
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
                    {errors.passportNumber && <p className='text-sm font-light text-red'>* Please provide passport number</p>}
                </div>

                <div>
                    <DatePicker
                        label="Passport Issue Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.passportValidity}
                        maxDate={new Date()}
                        error={errors.passportValidity}
                        name="passportValidity"
                        onChange={(value) => onInputChange(null, value, "passportValidity")}
                    />
                    {errors.passportValidity && <p className='text-sm font-light text-red'>* Please provide passport issue date</p>}
                </div>

                <div>
                    <DatePicker
                        label="Passport Expiry Date"
                        required={true}
                        iconPosition="left"
                        value={newDriver.passportExpiry}
                        minDate={new Date()}
                        error={errors.passportExpiry}
                        name="passportExpiry"
                        onChange={(value) => onInputChange(null, value, "passportExpiry")}
                    />
                    {errors.passportExpiry && <p className='text-sm font-light text-red'>* Please provide passport expiry date</p>}
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
                        required={newDriver.passportIssuedFrom !== "United Kingdom"}
                        iconPosition="left"
                        value={newDriver.rightToWorkValidity}
                        maxDate={new Date()}
                        error={errors.rightToWorkValidity}
                        name="rightToWorkValidity"
                        onChange={(value) => onInputChange(null, value, "rightToWorkValidity")}
                        disabled={newDriver.passportIssuedFrom === "United Kingdom"}
                    />
                    VIC SAYS: The disabled attribute is set based on passportIssuedFrom, which could lead to the field being disabled even if previously filled. Consider adding a warning or clearing the field when disabled to avoid sending stale data in FormData.
                    {errors.rightToWorkValidity && <p className='text-sm font-light text-red'>* Please provide right to work issue date</p>}
                </div>

                <div>
                    <DatePicker
                        label="Right to Work Expiry Date"
                        required={newDriver.passportIssuedFrom !== "United Kingdom"}
                        iconPosition="left"
                        value={newDriver.rightToWorkExpiry}
                        minDate={new Date()}
                        error={errors.rightToWorkExpiry}
                        name="rightToWorkExpiry"
                        onChange={(value) => onInputChange(null, value, "rightToWorkExpiry")}
                        disabled={newDriver.passportIssuedFrom === "United Kingdom"}
                    />
                    {errors.rightToWorkExpiry && <p className='text-sm font-light text-red'>* Please provide right to work expiry date</p>}
                </div>
                <div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Right to Work"
                        name="rightToWorkCard"
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
                        name="ecsInformation"
                        checked={newDriver.ecsInformation}
                        onChange={(e) => onInputChange(e)}
                    />
                </div>

                {newDriver.ecsInformation && (
                    <>
                        <div>
                            <DatePicker
                                label="ECS Issue Date"
                                required={true}
                                iconPosition="left"
                                value={newDriver.ecsValidity}
                                maxDate={new Date()}
                                error={errors.ecsValidity}
                                name="ecsValidity"
                                onChange={(value) => onInputChange(null, value, "ecsValidity")}
                            />
                            {errors.ecsValidity && <p className='text-sm font-light text-red'>* Please provide ECS issue date</p>}
                        </div>

                        <div>
                            <DatePicker
                                label="ECS Expiry Date"
                                required={true}
                                iconPosition="left"
                                value={newDriver.ecsExpiry}
                                minDate={new Date()}
                                error={errors.ecsExpiry}
                                name="ecsExpiry"
                                onChange={(value) => onInputChange(null, value, "ecsExpiry")}
                            />
                            {errors.ecsExpiry && <p className='text-sm font-light text-red'>* Please provide ECS expiry date</p>}
                        </div>
                        <div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="ECS Card"
                                name="ecsCard"
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
                        label="NINO Document"
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

// VehicleInsuranceDetails Component
const VehicleInsuranceDetails = ({ newDriver, onInputChange, errors, ownVehicleInsuranceNA, setOwnVehicleInsuranceNA }) => {
    const handleNAChange = (type) => (e) => {
        setOwnVehicleInsuranceNA(prev => ({
            ...prev,
            [type]: e.target.checked
        }));
    };

    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Vehicle Insurance Details</h1>

            {/* Motor Vehicle Insurance Certificate */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Motor Vehicle Insurance Certificate</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={ownVehicleInsuranceNA.mvi}
                            onChange={handleNAChange('mvi')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!ownVehicleInsuranceNA.mvi && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <InputGroup
                                label="Insurance Provider"
                                placeholder="Enter insurance provider"
                                type="text"
                                name="insuranceProvider"
                                value={newDriver.insuranceProvider}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.insuranceProvider}
                            />
                            {errors.insuranceProvider && <p className='text-sm font-light text-red'>* Please provide insurance provider</p>}
                        </div>
                        <div>
                            <InputGroup
                                label="Policy Number"
                                placeholder="Enter policy number"
                                type="text"
                                name="policyNumber"
                                value={newDriver.policyNumber}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaIdCard className='text-neutral-300' />}
                                required={true}
                                error={errors.policyNumber}
                            />
                            {errors.policyNumber && <p className='text-sm font-light text-red'>* Please provide policy number</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy Start Date"
                                value={newDriver.policyStartDate}
                                name="policyStartDate"
                                iconPosition="left"
                                onChange={(value) => onInputChange(null, value, "policyStartDate")}
                                required={true}
                                error={errors.policyStartDate}
                            />
                            {errors.policyStartDate && <p className='text-sm font-light text-red'>* Please provide policy start date</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy End Date"
                                value={newDriver.policyEndDate}
                                name="policyEndDate"
                                iconPosition="left"
                                minDate={new Date()}
                                onChange={(value) => onInputChange(null, value, "policyEndDate")}
                                required={true}
                                error={errors.policyEndDate}
                            />
                            {errors.policyEndDate && <p className='text-sm font-light text-red'>* Please provide policy end date</p>}
                        </div>
                        <div className="col-span-3">
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Motor Vehicle Insurance Certificate"
                                name="MotorVehicleInsuranceCertificate"
                                onChange={(e) => onInputChange(e)}
                                required={true}
                                error={errors.MotorVehicleInsuranceCertificate}
                            />
                            {errors.MotorVehicleInsuranceCertificate && <p className='text-sm font-light text-red'>* Please provide motor vehicle insurance certificate</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Goods In Transit Insurance */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Goods In Transit Insurance</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={ownVehicleInsuranceNA.goods}
                            onChange={handleNAChange('goods')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!ownVehicleInsuranceNA.goods && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <InputGroup
                                label="Insurance Provider"
                                placeholder="Enter insurance provider"
                                type="text"
                                name="insuranceProviderG"
                                value={newDriver.insuranceProviderG}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.insuranceProviderG}
                            />
                            {errors.insuranceProviderG && <p className='text-sm font-light text-red'>* Please provide insurance provider</p>}
                        </div>
                        <div>
                            <InputGroup
                                label="Policy Number"
                                placeholder="Enter policy number"
                                type="text"
                                name="policyNumberG"
                                value={newDriver.policyNumberG}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaIdCard className='text-neutral-300' />}
                                required={true}
                                error={errors.policyNumberG}
                            />
                            {errors.policyNumberG && <p className='text-sm font-light text-red'>* Please provide policy number</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy Start Date"
                                value={newDriver.policyStartDateG}
                                name="policyStartDateG"
                                iconPosition="left"
                                onChange={(value) => onInputChange(null, value, "policyStartDateG")}
                                required={true}
                                error={errors.policyStartDateG}
                            />
                            {errors.policyStartDateG && <p className='text-sm font-light text-red'>* Please provide policy start date</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy End Date"
                                value={newDriver.policyEndDateG}
                                name="policyEndDateG"
                                iconPosition="left"
                                minDate={new Date()}
                                onChange={(value) => onInputChange(null, value, "policyEndDateG")}
                                required={true}
                                error={errors.policyEndDateG}
                            />
                            {errors.policyEndDateG && <p className='text-sm font-light text-red'>* Please provide policy end date</p>}
                        </div>
                        <div className="col-span-3">
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Goods In Transit Insurance"
                                name="GoodsInTransitInsurance"
                                onChange={(e) => onInputChange(e)}
                                required={true}
                                error={errors.GoodsInTransitInsurance}
                            />
                            {errors.GoodsInTransitInsurance && <p className='text-sm font-light text-red'>* Please provide goods in transit insurance</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Public Liability Insurance */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Public Liability Insurance</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={ownVehicleInsuranceNA.public}
                            onChange={handleNAChange('public')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!ownVehicleInsuranceNA.public && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <InputGroup
                                label="Insurance Provider"
                                placeholder="Enter insurance provider"
                                type="text"
                                name="insuranceProviderP"
                                value={newDriver.insuranceProviderP}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.insuranceProviderP}
                            />
                            {errors.insuranceProviderP && <p className='text-sm font-light text-red'>* Please provide insurance provider</p>}
                        </div>
                        <div>
                            <InputGroup
                                label="Policy Number"
                                placeholder="Enter policy number"
                                type="text"
                                name="policyNumberP"
                                value={newDriver.policyNumberP}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaIdCard className='text-neutral-300' />}
                                required={true}
                                error={errors.policyNumberP}
                            />
                            {errors.policyNumberP && <p className='text-sm font-light text-red'>* Please provide policy number</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy Start Date"
                                value={newDriver.policyStartDateP}
                                name="policyStartDateP"
                                iconPosition="left"
                                onChange={(value) => onInputChange(null, value, "policyStartDateP")}
                                required={true}
                                error={errors.policyStartDateP}
                            />
                            {errors.policyStartDateP && <p className='text-sm font-light text-red'>* Please provide policy start date</p>}
                        </div>
                        <div>
                            <DatePicker
                                label="Policy End Date"
                                value={newDriver.policyEndDateP}
                                name="policyEndDateP"
                                iconPosition="left"
                                minDate={new Date()}
                                onChange={(value) => onInputChange(null, value, "policyEndDateP")}
                                required={true}
                                error={errors.policyEndDateP}
                            />
                            {errors.policyEndDateP && <p className='text-sm font-light text-red'>* Please provide policy end date</p>}
                        </div>
                        <div className="col-span-3">
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Public Liability Insurance"
                                name="PublicLiablity"
                                onChange={(e) => onInputChange(e)}
                                required={true}
                                error={errors.PublicLiablity}
                            />
                            {errors.PublicLiablity && <p className='text-sm font-light text-red'>* Please provide public liability insurance</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// SelfEmploymentDetails Component
const SelfEmploymentDetails = ({ newDriver, onInputChange, errors }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Self-Employment Details</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <InputGroup
                        label="Company Name"
                        placeholder="Enter company name"
                        type="text"
                        name="companyName"
                        value={newDriver.companyName}
                        onChange={onInputChange}
                        iconPosition="left"
                        icon={<FaBuildingUser className='text-neutral-300' />}
                        required={true}
                        error={errors.companyName}
                    />
                    {errors.companyName && <p className='text-sm font-light text-red'>* Please provide company name</p>}
                </div>
                <div>
                    <InputGroup
                        label="Company Registered Address"
                        placeholder="Enter company address"
                        type="text"
                        name="companyRegAddress"
                        value={newDriver.companyRegAddress}
                        onChange={onInputChange}
                        iconPosition="left"
                        icon={<FaHouseUser className='text-neutral-300' />}
                        required={true}
                        error={errors.companyRegAddress}
                    />
                    {errors.companyRegAddress && <p className='text-sm font-light text-red'>* Please provide company registered address</p>}
                </div>
                <div>
                    <InputGroup
                        label="Company Registration Number"
                        placeholder="Enter company reg number"
                        type="text"
                        name="companyRegNo"
                        value={newDriver.companyRegNo}
                        onChange={onInputChange}
                        iconPosition="left"
                        icon={<FaIdCard className='text-neutral-300' />}
                        required={true}
                        error={errors.companyRegNo}
                    />
                    {errors.companyRegNo && <p className='text-sm font-light text-red'>* Please provide company registration number</p>}
                </div>
                <div>
                    <DatePicker
                        label="Company Registration Expiry"
                        value={newDriver.companyRegExpiry}
                        name="companyRegExpiry"
                        iconPosition="left"
                        minDate={new Date()}
                        onChange={(value) => onInputChange(null, value, "companyRegExpiry")}
                        required={true}
                        error={errors.companyRegExpiry}
                    />
                    {errors.companyRegExpiry && <p className='text-sm font-light text-red'>* Please provide company registration expiry date</p>}
                </div>
                <div>
                    <InputGroup
                        label="Company UTR Number"
                        placeholder="Enter company UTR"
                        type="text"
                        name="companyUtrNo"
                        value={newDriver.companyUtrNo}
                        onChange={onInputChange}
                        iconPosition="left"
                        icon={<GoNumber className='text-neutral-300' />}
                    />
                </div>
                <div className="col-span-3">
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Company Registration Certificate"
                        name="companyRegistrationCertificate"
                        onChange={(e) => onInputChange(e)}
                    />
                </div>
            </div>
        </div>
    );
};

const PersonnelForm = ({ sites, setPersonnelMode }) => {
    const dispatch = useDispatch()
    const clearDriver = {
        vehicleRegPlate: '',
        employmentStatus: 'Sole Trader',
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
        bankNameCompany: '',
        sortCodeCompany: '',
        bankAccountNumberCompany: '',
        accountNameCompany: '',
        bankChoice: 'Personal',
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
        siteSelection: '',
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
        insuranceProvider: '',
        policyNumber: '',
        policyStartDate: '',
        policyEndDate: '',
        insuranceProviderG: '',
        policyNumberG: '',
        policyStartDateG: '',
        policyEndDateG: '',
        insuranceProviderP: '',
        policyNumberP: '',
        policyStartDateP: '',
        policyEndDateP: '',
        MotorVehicleInsuranceCertificate: '',
        GoodsInTransitInsurance: '',
        PublicLiablity: '',
        vatNo: '',
        vatEffectiveDate: '',
        ninoDocument: '',
        companyRegistrationCertificate: ''
    };

    const [newDriver, setNewDriver] = useState(clearDriver);
    const [errors, setErrors] = useState({});
    const [age, setAge] = useState(null);
    const [selectedTab, setSelectedTab] = useState('personnelInfo');
    const [success, setSuccess] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [ownVehicleInsuranceNA, setOwnVehicleInsuranceNA] = useState({
        mvi: false,
        goods: false,
        public: false
    });

    let tabsInfo = [
        { id: 'personnelInfo', label: 'Personnel Info', component: PersonnelInfoTab },
        { id: 'vehicleInsuranceDetails', label: 'Vehicle Insurance Details', component: VehicleInsuranceDetails },
        { id: 'bankDetails', label: 'Bank Details', component: BankDetails },
        { id: 'drivingLicense', label: 'Driving License', component: DrivingLicenseTab },
        { id: 'passport', label: 'Passport', component: PassportTab },
        { id: 'rightToWork', label: 'Right to Work', component: RightToWorkTab },
        { id: 'ecs', label: 'ECS', component: ECSTab },
        { id: 'documents', label: 'Documents', component: DocumentsTab },
    ];

    const [tabs, setTabs] = useState(tabsInfo);

    const requiredFields = {
        personnelInfo: [
            'firstName',
            'lastName',
            'dateOfBirth',
            'nationality',
            'nationalInsuranceNumber',
            'PhoneNo',
            'Email',
            'typeOfDriver',
            'vehicleSize',
            'siteSelection',
            ...(newDriver.typeOfDriver === 'Own Vehicle' ? ['vehicleRegPlate'] : [])
        ],
        bankDetails: newDriver.bankChoice === 'Personal' ? [
            'bankName',
            'sortCode',
            'bankAccountNumber',
            'accountName'
        ] : [
            'bankNameCompany',
            'sortCodeCompany',
            'bankAccountNumberCompany',
            'accountNameCompany'
        ],
        drivingLicense: [
            'drivingLicenseNumber',
            'dlValidity',
            'dlExpiry'
        ],
        passport: [
            'passportIssuedFrom',
            'passportNumber',
            'passportValidity',
            'passportExpiry'
        ],
        rightToWork: newDriver.passportIssuedFrom !== "United Kingdom" ? [
            'rightToWorkValidity',
            'rightToWorkExpiry'
        ] : [],
        ecs: newDriver.ecsInformation ? [
            'ecsValidity',
            'ecsExpiry'
        ] : [],
        vehicleInsuranceDetails: newDriver.typeOfDriver === 'Own Vehicle' ? [
            ...(!ownVehicleInsuranceNA.mvi ? [
                'insuranceProvider',
                'policyNumber',
                'policyStartDate',
                'policyEndDate',
                'MotorVehicleInsuranceCertificate'
            ] : []),
            ...(!ownVehicleInsuranceNA.goods ? [
                'insuranceProviderG',
                'policyNumberG',
                'policyStartDateG',
                'policyEndDateG',
                'GoodsInTransitInsurance'
            ] : []),
            ...(!ownVehicleInsuranceNA.public ? [
                'insuranceProviderP',
                'policyNumberP',
                'policyStartDateP',
                'policyEndDateP',
                'PublicLiablity'
            ] : [])
        ] : [],
        selfEmploymentDetails: newDriver.employmentStatus === 'Limited Company' ? [
            'companyName',
            'companyRegAddress',
            'companyRegNo',
            'companyRegExpiry'
        ] : []
    };

    const fileFields = [
        'profilePicture',
        'ninoDocument',
        'signature',
        'drivingLicenseFrontImage',
        'drivingLicenseBackImage',
        'passportDocument',
        'ecsCard',
        'rightToWorkCard',
        'companyRegistrationCertificate',
        'MotorVehicleInsuranceCertificate',
        'GoodsInTransitInsurance',
        'PublicLiablity',
        'insuranceDocument'
    ];

    const validateFields = () => {
        const newErrors = {};
        const currentTabFields = requiredFields[selectedTab] || [];

        currentTabFields.forEach((key) => {
            if (String(newDriver[key]).trim() === "") {
                newErrors[key] = true;
            }
        });

        // Validate email format
        if (selectedTab === 'personnelInfo' && newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(newDriver.Email)) {
            newErrors.Email = true;
        }

        // Validate sort code format
        if (selectedTab === 'bankDetails') {
            const sortCodeRegex = /^[0-9]{6}$/;
            if (newDriver.bankChoice === 'Personal' && newDriver.sortCode && !sortCodeRegex.test(newDriver.sortCode)) {
                newErrors.sortCode = true;
            }
            if (newDriver.bankChoice === 'Company' && newDriver.sortCodeCompany && !sortCodeRegex.test(newDriver.sortCodeCompany)) {
                newErrors.sortCodeCompany = true;
            }
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
        const newErrors = {};

        Object.keys(requiredFields).forEach(tab => {
            requiredFields[tab].forEach((key) => {
                if (String(newDriver[key]).trim() === "") {
                    newErrors[key] = true;
                }
            });
        });

        // Validate email format
        if (newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(newDriver.Email)) {
            newErrors.Email = true;
        }

        // Validate sort code format
        const sortCodeRegex = /^[0-9]{6}$/;
        if (newDriver.bankChoice === 'Personal' && newDriver.sortCode && !sortCodeRegex.test(newDriver.sortCode)) {
            newErrors.sortCode = true;
        }
        if (newDriver.bankChoice === 'Company' && newDriver.sortCodeCompany && !sortCodeRegex.test(newDriver.sortCodeCompany)) {
            newErrors.sortCodeCompany = true;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        let updatedTabs = [...tabsInfo];

        // Add or remove Self Employment Details tab based on employment status
        if (newDriver.employmentStatus === 'Limited Company') {
            if (!updatedTabs.some(tab => tab.id === 'selfEmploymentDetails')) {
                updatedTabs.splice(1, 0, { id: 'selfEmploymentDetails', label: 'Self Employment Details', component: SelfEmploymentDetails });
            }
        } else {
            updatedTabs = updatedTabs.filter(tab => tab.id !== 'selfEmploymentDetails');
        }

        // Add or remove Vehicle Insurance Details tab based on vehicle type
        if (newDriver.typeOfDriver !== 'Own Vehicle') {
            updatedTabs = updatedTabs.filter(tab => tab.id !== 'vehicleInsuranceDetails');
        }

        setTabs(updatedTabs);
    }, [newDriver.employmentStatus, newDriver.typeOfDriver]);

    const onInputChange = (e, inputValue, inputName) => {
        let name, value;

        if (e) {
            if (e.target.type === 'checkbox') {
                value = e.target.checked;
                name = e.target.name;
            } else if (e.target.type === 'file') {
                value = e.target.files[0] || ''; // Store the file or empty string
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

    const handleSubmit = async (e) => {
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

        // Create FormData object
        const formData = new FormData();

        // Append all non-file fields
        Object.keys(newDriver).forEach(key => {
            if (!fileFields.includes(key)) {
                // Handle boolean and other non-file values
                formData.append(key, newDriver[key] !== undefined && newDriver[key] !== null ? newDriver[key].toString() : '');
            }
        });

        // Append file fields
        fileFields.forEach(key => {
            if (newDriver[key] instanceof File) {
                formData.append(key, newDriver[key]);
            }
        });

        // Append ownVehicleInsuranceNA state
        formData.append('ownVehicleInsuranceNA_mvi', ownVehicleInsuranceNA.mvi.toString());
        formData.append('ownVehicleInsuranceNA_goods', ownVehicleInsuranceNA.goods.toString());
        formData.append('ownVehicleInsuranceNA_public', ownVehicleInsuranceNA.public.toString());

        // Log FormData entries for debugging (replace with API call)
        console.log('FormData contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }

        // Example API call (uncomment and configure as needed)
        /*
        fetch('/api/personnel', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setPersonnelMode('view');
            }, 2000);
        })
        .catch(error => {
            console.error('Error:', error);
        });
        */
        let userID = 0;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/idcounter/Driver`);
            userID = response.data[0].counterValue;
        }
        catch (error) {
            console.error('Error Fetching ID Counter', error.response ? error.response.data : error.message);
        }
        const formattedUserID = userID.toString().padStart(6, '0');
        formData.append('user_ID', formattedUserID);

        try {
            const response = dispatch(addDriver(formData))
            console.log(response)
        }
        catch (error) {
            alert('error adding driver')
        }


        // For now, simulate success
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
                        ownVehicleInsuranceNA={ownVehicleInsuranceNA}
                        setOwnVehicleInsuranceNA={setOwnVehicleInsuranceNA}
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