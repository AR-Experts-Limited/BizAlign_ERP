import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import DatePicker from '../../components/Datepicker/Datepicker';
import InputWrapper from '../../components/InputGroup/InputWrapper';
import countries from '../../lib/countries';
import SuccessTick from '../../components/UIElements/SuccessTick';
import { FaHouseUser, FaUser, FaEnvelope, FaIdCard, FaGlobe, FaCar } from 'react-icons/fa';
import { FaBuildingUser, FaHouse } from "react-icons/fa6";
import { GoNumber } from "react-icons/go";

const PersonnelForm = ({ sites, setPersonnelMode }) => {
    const clearDriver = {
        firstName: '',
        lastName: '',
        address: '',
        postcode: '',
        dateOfBirth: '',
        nationality: '',
        nationalInsuranceNumber: '',
        phoneNo: '',
        Email: '',
        typeOfDriver: '',
        vehicleSize: '',
        siteSelection: '',
        drivingLicenseNumber: '',
        dlValidity: '',
        dlExpiry: '',
    }
    const [newDriver, setNewDriver] = useState(clearDriver)
    const [errors, setErrors] = useState({})
    const [age, setAge] = useState(null)

    const requiredFields = [
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
        'drivingLicenseNumber',
        'dlValidity',
        'dlExpiry',
    ]

    const validateFields = () => {
        const newErrors = {};
        requiredFields.forEach((key) => {
            if (String(newDriver[key]).trim() === "") {
                newErrors[key] = true;
            }
        });

        // Validate email fields
        if (newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(newDriver.Email)) {
            newDriver.Email = true;
        }

        setErrors(newErrors);

        // Scroll to the first error input
        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return Object.keys(newErrors).length === 0;
    };

    const onInputChange = (e, inputValue, inputName) => {
        let name, value;
        if (e) {
            ({ name, value } = e.target);
        } else {
            name = inputName;
            value = inputValue;
        }
        setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
        setNewDriver((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <>
            <div className="flex flex-col gap-2 px-4 py-1">
                <InputWrapper title={'Personnel Info'} colspan={3} gridCols={3} >
                    {/* First Name */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('firstName', customerData.firstName, originalData) && (
            <button onClick={() => onInputChange(null, originalData.firstName, 'firstName')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* Last Name */}
                    <div className='relative'>
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
                        {/* {mode === 'edit' && isFieldChanged('lastName', customerData.lastName, originalData) && (
            <button onClick={() => onInputChange(null, originalData.lastName, 'lastName')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600 ">Reset</button>
        )} */}
                    </div>

                    {/* Address */}
                    <div className="relative">
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
                    <div className="relative">
                        <InputGroup
                            label="Postal Code"
                            placeholder="Enter postal code"
                            type="text"
                            name="postalCode"
                            error={errors.postcode}
                            value={newDriver.postcode}
                            iconPosition="left"
                            icon={<FaHouseUser className='text-neutral-300' />}
                            onChange={(e) => onInputChange(e)}
                        />
                    </div>

                    {/* Date of Birth */}
                    <div className="relative">
                        <DatePicker
                            label="Date of Birth"
                            required={true}
                            className='relative'
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
                        {age !== null && <div className='absolute right-2 top-1/2 text-xs bg-stone-100 border border-stone-200 shadow-sm rounded-md p-2'>Age: {age}</div>}
                        {errors.dateOfBirth && <p className='text-sm font-light text-red'>* Please provide date of birth</p>}
                        {/* {mode === 'edit' && isFieldChanged('dateOfBirth', customerData.dateOfBirth, originalData) && (
            <button onClick={() => {
                onInputChange(null, originalData.dateOfBirth, 'dateOfBirth');
                if (originalData.dateOfBirth) {
                    const birthDate = new Date(originalData.dateOfBirth);
                    const today = new Date();
                    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                    const hasBirthdayPassed =
                        today.getMonth() > birthDate.getMonth() ||
                        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
                    if (!hasBirthdayPassed) calculatedAge--;
                    setAge(calculatedAge);
                } else {
                    setAge(null);
                }
            }} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* Nationality */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('licenseIssuedBy', customerData.licenseIssuedBy, originalData) && (
            <button onClick={() => onInputChange(null, originalData.licenseIssuedBy, 'licenseIssuedBy')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* National Insurance Number */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('nationalInsuranceNum', customerData.nationalInsuranceNum, originalData) && (
            <button onClick={() => onInputChange(null, originalData.nationalInsuranceNum, 'nationalInsuranceNum')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* Phone Number */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('primaryPhoneNum', customerData.primaryPhoneNum, originalData) && (
            <button onClick={() => onInputChange(null, originalData.primaryPhoneNum, 'primaryPhoneNum')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>


                    {/* Email */}
                    <div className="relative">
                        <InputGroup
                            label="Email Address"
                            placeholder="Enter  email address"
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
                        {/* {mode === 'edit' && isFieldChanged('primaryEmail', customerData.primaryEmail, originalData) && (
            <button onClick={() => onInputChange(null, originalData.primaryEmail, 'primaryEmail')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/*Vehicle Type */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('licenseIssuedBy', customerData.licenseIssuedBy, originalData) && (
            <button onClick={() => onInputChange(null, originalData.licenseIssuedBy, 'licenseIssuedBy')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* Vehicle Registration Plate */}
                    <div className="relative">
                        <InputGroup
                            label="Vehicle Registration Plate"
                            placeholder="Enter vehicle registration number"
                            type="text"
                            name="vehicleRegPlate"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {/* {error.vatNo && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/*Vehicle Size */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('licenseIssuedBy', customerData.licenseIssuedBy, originalData) && (
            <button onClick={() => onInputChange(null, originalData.licenseIssuedBy, 'licenseIssuedBy')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/*Sites */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('licenseIssuedBy', customerData.licenseIssuedBy, originalData) && (
            <button onClick={() => onInputChange(null, originalData.licenseIssuedBy, 'licenseIssuedBy')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* TransportId */}
                    <div className="relative">
                        <InputGroup
                            label="Transport Id"
                            placeholder="Enter transport id"
                            type="text"
                            name="transportId"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {/* {error.vatNo && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* TransportId */}
                    <div className="relative">
                        <InputGroup
                            label="Transporter Name"
                            placeholder="Enter Transporter Name"
                            type="text"
                            name="transporterName"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {/* {error.vatNo && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* UTR No.*/}
                    <div className="relative">
                        <InputGroup
                            label="UTR Number"
                            placeholder="Enter UTR number"
                            type="text"
                            name="utrNo"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {/* {error.vatNo && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>



                    {/* VAT Number */}
                    <div className="relative">
                        <InputGroup
                            label="Vat Number"
                            placeholder="Enter VAT No."
                            type="text"
                            name="vatNo"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {/* {error.vatNo && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    <div className="relative">
                        <DatePicker
                            label="VAT Effective Date"
                            // value={customerData.dateOfBirth}
                            name="dateOfJoining"
                            iconPosition="left"
                            // error={error.dateOfBirth}
                            minDate={new Date()}
                        />
                    </div>


                    <div className="relative">
                        <DatePicker
                            label="Date of Joining"
                            // value={customerData.dateOfBirth}
                            name="dateOfJoining"
                            iconPosition="left"
                            // error={error.dateOfBirth}
                            minDate={new Date()}
                        />
                    </div>

                </InputWrapper>


                <InputWrapper title={'Driving License'} colspan={3} gridCols={3} >

                    {/* Driving License Number */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('dlNumber', customerData.dlNumber, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlNumber, 'dlNumber')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>


                    {/* DL Issue Date */}
                    <div className="relative">
                        <DatePicker
                            label="Driving Licence Issue Date"
                            required={true}
                            value={newDriver.issueDrivingLicense}
                            maxDate={new Date()}
                            error={errors.issueDrivingLicense}
                            iconPosition="left"
                            onChange={(value) => onInputChange(null, value, "issueDrivingLicense")}
                        />
                        {errors.issueDrivingLicense && <p className='text-sm font-light text-red'>* please provide your DL issue date</p>}
                        {/* {mode === 'edit' && isFieldChanged('dlIssueDate', customerData.dlIssueDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlIssueDate, 'dlIssueDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* DL Test Pass Date */}
                    <div className="relative">
                        <DatePicker
                            label="Driving Licence Test Pass Date"
                            // value={customerData.dlPassDate}
                            maxDate={new Date()}
                            iconPosition="left"
                        // onChange={(value) => {
                        //     value !== '' ? setTestPassAge(calculateTestPassedAge(value)) : setTestPassAge(null)
                        //     onInputChange(null, value, "dlPassDate")
                        // }}
                        />
                        {/* {testPassAge && <div className='text-xs bg-neutral-200 border border-neutral-400 rounded-md p-2 mt-1'>{testPassAge}</div>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlPassDate', customerData.dlPassDate, originalData) && (
            <button onClick={() => {
                onInputChange(null, originalData.dlPassDate, 'dlPassDate');
                if (originalData.dlPassDate) {
                    setTestPassAge(calculateTestPassedAge(originalData.dlPassDate));
                } else {
                    setTestPassAge(null);
                }
            }} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* DL Expiry Date */}
                    <div className="relative">
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
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                    {/* Driving License Images */}
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Driving license Front Image"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Driving license Back Image"
                    />
                </InputWrapper>
                <InputWrapper title={'Passport'} gridCols={3} colspan={3}>
                    {/* Passport Issued From */}
                    <div className="relative">
                        <InputGroup type='dropdown'
                            name='passportIssuedFrom'
                            label='Passport Issued From'
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
                        {/* {mode === 'edit' && isFieldChanged('licenseIssuedBy', customerData.licenseIssuedBy, originalData) && (
            <button onClick={() => onInputChange(null, originalData.licenseIssuedBy, 'licenseIssuedBy')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                    {/*Passport Number*/}
                    <div className="relative">
                        <InputGroup
                            label="Passport Number"
                            placeholder="Enter passport number"
                            type="text"
                            name="passportNumber"
                            iconPosition='left'
                            icon={<GoNumber className='text-neutral-300' />}
                        // error={error.vatNo}
                        // value={customerData.vatNo}
                        // onChange={(e) => { if (e.target.value.length <= 11) onInputChange(e) }}
                        />
                        {errors.passportNumber && <p className='text-sm font-light text-red'>* please provide a valid VAT Number</p>}
                        {/* {mode === 'edit' && isFieldChanged('vatNo', customerData.vatNo, originalData) && (
            <button onClick={() => onInputChange(null, originalData.vatNo, 'vatNo')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                    <div className="relative">
                        <DatePicker
                            label="Passport Issue Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            maxDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                    <div className="relative">
                        <DatePicker
                            label="Passport Expiry Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            minDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                </InputWrapper>

                <InputWrapper title={'Right to Work'} gridCols={3} colspan={3}>
                    <div className="relative">
                        <DatePicker
                            label="Right to Work Issue Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            maxDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                    <div className="relative">
                        <DatePicker
                            label="Right to Work Expiry Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            minDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>

                </InputWrapper>
                <InputWrapper title={'ECS'} gridCols={3} colspan={3}>
                    <InputGroup type='toggleswitch' label='ECS Information'
                    />
                    <div className="relative">
                        <DatePicker
                            label="ECS Issue Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            maxDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                    <div className="relative">
                        <DatePicker
                            label="ECS Expiry Date"
                            required={true}
                            iconPosition="left"
                            // value={customerData.dlExpiryDate}
                            minDate={new Date()}
                        // error={error.dlExpiryDate}
                        // onChange={(value) => onInputChange(null, value, "dlExpiryDate")}
                        />
                        {/* {error.dlExpiryDate && <p className='text-sm font-light text-red'>* please provide your DL expiry date</p>} */}
                        {/* {mode === 'edit' && isFieldChanged('dlExpiryDate', customerData.dlExpiryDate, originalData) && (
            <button onClick={() => onInputChange(null, originalData.dlExpiryDate, 'dlExpiryDate')} className="absolute top-4 right-0 text-xs bg-red-300/50 px-1 rounded-sm border border-red-500 font-light text-red-600">Reset</button>
        )} */}
                    </div>
                </InputWrapper>
                <InputWrapper title={'Documents'} gridCols={3} colspan={3} >
                    <div className='text-amber-500 col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Profile Picture"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="NINO"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Passport Document"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Right to work"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="ECS card"
                    />
                    <InputGroup
                        type="file"
                        fileStyleVariant="style1"
                        label="Signature"
                    />
                </InputWrapper>
            </div>
            <div className='sticky bottom-0 bg-white flex justify-end items-center p-3 border-t border-neutral-200'>
                <div className='flex gap-3 text-sm'>
                    <button onClick={validateFields} className='bg-green-500 rounded-md px-2 py-1 text-white'>Add Personnel</button>
                    <button onClick={() => setPersonnelMode('view')} className='bg-red-500 rounded-md  px-2 py-1 text-white'>Cancel</button>
                </div>
            </div>
        </>
    );
};

export default PersonnelForm;