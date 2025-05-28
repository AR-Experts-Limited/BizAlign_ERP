import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import { FaGlobe } from 'react-icons/fa';
import { GoNumber } from 'react-icons/go';
import countries from '../../../lib/countries';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'


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

                {/* Passport Number */}
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
                    <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
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
                    {newDriver.passportDocumentArray &&
                        <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                            <table className='table-general'>
                                <thead className='sticky top-0 bg-white'>
                                    <tr>
                                        <th colSpan={3}>
                                            History of Passport Document
                                        </th>
                                    </tr>
                                    <tr>
                                        <th>Version</th>
                                        <th>Actions</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(newDriver.passportDocumentArray || [])
                                        .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((passDoc, index) => (
                                            <tr>
                                                <td>{newDriver.passportDocumentArray.length - index}</td>
                                                <td>
                                                    <div className='flex justify-around'>
                                                        <div onClick={() => handleFileView(passDoc.original)} className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                    </div>
                                                </td>
                                                <td>{new Date(passDoc.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>}
                </div>
            </div>
        </div>
    );
};

export default PassportTab;