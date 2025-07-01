import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/DatePicker';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'


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
                    {/* VIC SAYS: The disabled attribute is set based on passportIssuedFrom, which could lead to the field being disabled even if previously filled. Consider adding a warning or clearing the field when disabled to avoid sending stale data in FormData. */}
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
                <div className='col-span-3 grid grid-cols-1 md:grid-cols-3'>
                    <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                    <div className='col-span-1'>
                        <InputGroup
                            type="file"
                            fileStyleVariant="style1"
                            label="Right to Work"
                            name="rightToWorkCard"
                            onChange={(e) => onInputChange(e)}
                        />
                    </div>
                    {newDriver.rightToWorkCardArray?.length > 0 &&
                        <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                            <table className='table-general'>
                                <thead className='sticky top-0 bg-white'>
                                    <tr>
                                        <th colSpan={3}>
                                            History of Right to work card
                                        </th>
                                    </tr>
                                    <tr>
                                        <th>Version</th>
                                        <th>Actions</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...(newDriver.rightToWorkCardArray || [])]
                                        .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                            <tr>
                                                <td>{newDriver.rightToWorkCardArray.length - index}</td>
                                                <td>
                                                    <div className='flex justify-around'>
                                                        <div onClick={() => handleFileView(doc.original)}
                                                            className='rounded-md p-2 hover:bg-neutral-200'><FaEye size={15} /></div>
                                                    </div>
                                                </td>
                                                <td>{new Date(doc.timestamp).toLocaleString()}</td>
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

export default RightToWorkTab;