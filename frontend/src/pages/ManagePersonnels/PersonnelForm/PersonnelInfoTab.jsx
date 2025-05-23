import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import { FaHouseUser, FaUser, FaEnvelope, FaIdCard, FaGlobe, FaCar, FaPhone, FaTruck } from 'react-icons/fa';
import { FaBuildingUser } from "react-icons/fa6";
import { GoNumber } from 'react-icons/go';
import countries from '../../../lib/countries';

const PersonnelInfoTab = ({ sites, newDriver, onInputChange, errors, age, setAge }) => {
    return (
        <div className='p-6'>
            <h1 className='text-center font-bold'>Personnel Information</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
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
                    <p className={`${errors.firstName ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide first name</p>
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
                    <p className={`${errors.lastName ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide last name</p>
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
                    <p className={`${errors.address ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid address</p>
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
                    <p className={`${errors.postcode ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid postal code</p>
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
                    {age !== null && <div className='absolute top-[40%] right-3 text-xs bg-stone-100 border border-stone-200 shadow-sm rounded-md p-2'>Age: {age}</div>}
                    <p className={`${errors.dateOfBirth ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide date of birth</p>
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
                    <p className={`${errors.nationality ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide nationality</p>
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
                    <p className={`${errors.nationalInsuranceNumber ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid NI number</p>
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
                    <p className={`${errors.PhoneNo ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid phone number</p>
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
                    <p className={`${errors.Email ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid email address</p>
                </div>

                {/* Vehicle Type */}
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
                    <p className={`${errors.typeOfDriver ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide vehicle type</p>
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
                        error={errors.employmentStatus}
                    />
                    <p className={`${errors.employmentStatus ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide employment status</p>
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
                    <p className={`${errors.vehicleRegPlate ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid vehicle registration plate</p>
                </div>

                {/* Vehicle Size */}
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
                    <p className={`${errors.vehicleSize ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide vehicle size</p>
                </div>

                {/* Sites */}
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
                    <p className={`${errors.siteSelection ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please select a valid site</p>
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
                        error={errors.transportId}
                    />
                    <p className={`${errors.transportId ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid transport ID</p>
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
                        error={errors.transporterName}
                    />
                    <p className={`${errors.transporterName ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid transporter name</p>
                </div>

                {/* UTR No. */}
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
                        error={errors.utrNo}
                    />
                    <p className={`${errors.utrNo ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid UTR number</p>
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
                        error={errors.vatNo}
                    />
                    <p className={`${errors.vatNo ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid VAT number</p>
                </div>

                <div>
                    <DatePicker
                        label="VAT Effective Date"
                        value={newDriver.vatEffectiveDate}
                        name="vatEffectiveDate"
                        iconPosition="left"
                        onChange={(value) => onInputChange(null, value, "vatEffectiveDate")}
                        disabled={!newDriver.vatNo}
                        error={errors.vatEffectiveDate}
                    />
                    <p className={`${errors.vatEffectiveDate ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid VAT effective date</p>
                </div>

                <div>
                    <DatePicker
                        label="Date of Joining"
                        value={newDriver.dateOfJoining}
                        name="dateOfJoining"
                        iconPosition="left"
                        onChange={(value) => onInputChange(null, value, "dateOfJoining")}
                        error={errors.dateOfJoining}
                    />
                    <p className={`${errors.dateOfJoining ? 'visible' : 'invisible'} my-1 text-sm font-light text-red`}>* Please provide a valid date of joining</p>
                </div>
            </div>
        </div>
    );
};

export default PersonnelInfoTab;