import React, { useState } from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import { FaUniversity, FaSortAmountUp, FaCreditCard, FaUser } from 'react-icons/fa';
import { IoEye, IoEyeOff } from 'react-icons/io5';

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
                <div className='col-span-3 flex gap-1 items-center mb-2'>
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
                                placeholder="Bank Name"
                                value={newDriver.bankName}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.bankName}
                            />
                            <p className={`${errors.bankName ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide bank name</p>
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showSortCode ? 'text' : 'password'}
                                label="Sort Code"
                                name="sortCode"
                                placeholder="Sort Code"
                                value={newDriver.sortCode}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaSortAmountUp className='text-neutral-300' />}
                                required={true}
                                error={errors.sortCode}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[48%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showSortCode: !prev.showSortCode }))}
                            >
                                {showDetails.showSortCode ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            <p className={`${errors.sortCode ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide a valid sort code</p>
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showAccountNumber ? 'text' : 'password'}
                                label="Account Number"
                                name="bankAccountNumber"
                                placeholder="Account Number"
                                value={newDriver.bankAccountNumber}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaCreditCard className='text-neutral-300' />}
                                required={true}
                                error={errors.bankAccountNumber}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[48%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showAccountNumber: !prev.showAccountNumber }))}
                            >
                                {showDetails.showAccountNumber ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            <p className={`${errors.bankAccountNumber ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide account number</p>
                        </div>
                        <div>
                            <InputGroup
                                type='text'
                                label="Account Name"
                                name="accountName"
                                placeholder="Account Name"
                                value={newDriver.accountName}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUser className='text-neutral-300' />}
                                required={true}
                                error={errors.accountName}
                            />
                            <p className={`${errors.accountName ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide account name</p>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <InputGroup
                                type='text'
                                label="Company Bank Name"
                                name="bankNameCompany"
                                placeholder="Company Bank Name"
                                value={newDriver.bankNameCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUniversity className='text-neutral-300' />}
                                required={true}
                                error={errors.bankNameCompany}
                            />
                            <p className={`${errors.bankNameCompany ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide company bank name</p>
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showSortCodeCompany ? 'text' : 'password'}
                                label="Company Sort Code"
                                name="sortCodeCompany"
                                placeholder="Company Sort Code"
                                value={newDriver.sortCodeCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaSortAmountUp className='text-neutral-300' />}
                                required={true}
                                error={errors.sortCodeCompany}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[48%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showSortCodeCompany: !prev.showSortCodeCompany }))}
                            >
                                {showDetails.showSortCodeCompany ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            <p className={`${errors.sortCodeCompany ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide a valid company sort code</p>
                        </div>
                        <div className='relative'>
                            <InputGroup
                                type={showDetails.showAccountNumberCompany ? 'text' : 'password'}
                                label="Company Account Number"
                                name="bankAccountNumberCompany"
                                placeholder="Company Account Number"
                                value={newDriver.bankAccountNumberCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaCreditCard className='text-neutral-300' />}
                                required={true}
                                error={errors.bankAccountNumberCompany}
                            />
                            <div
                                className='cursor-pointer absolute text-stone-300 top-[48%] right-5'
                                onClick={() => setShowDetails(prev => ({ ...prev, showAccountNumberCompany: !prev.showAccountNumberCompany }))}
                            >
                                {showDetails.showAccountNumberCompany ? <IoEyeOff size={20} /> : <IoEye size={20} />}
                            </div>
                            <p className={`${errors.bankAccountNumberCompany ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide company account number</p>
                        </div>
                        <div>
                            <InputGroup
                                type='text'
                                label="Company Account Name"
                                name="accountNameCompany"
                                placeholder="Company Account Name"
                                value={newDriver.accountNameCompany}
                                onChange={onInputChange}
                                iconPosition="left"
                                icon={<FaUser className='text-neutral-300' />}
                                required={true}
                                error={errors.accountNameCompany}
                            />
                            <p className={`${errors.accountNameCompany ? 'visible' : 'invisible'} text-sm font-light text-red`}>* Please provide company account name</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default BankDetails;