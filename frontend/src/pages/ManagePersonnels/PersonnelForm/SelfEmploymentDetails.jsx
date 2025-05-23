import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import { FaHouseUser, FaIdCard } from 'react-icons/fa';
import { FaBuildingUser } from "react-icons/fa6";
import { GoNumber } from 'react-icons/go';

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

export default SelfEmploymentDetails;