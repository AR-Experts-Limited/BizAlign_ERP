import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'

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
                        <div className='col-span-3 grid grid-cols-1 md:grid-cols-3'>
                            <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                            <div className='col-span-1'>
                                <InputGroup
                                    type="file"
                                    fileStyleVariant="style1"
                                    label="ECS Card"
                                    name="ecsCard"
                                    onChange={(e) => onInputChange(e)}
                                />
                            </div>
                            {newDriver.ecsCardArray?.length > 0 &&
                                <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of ECS card
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Version</th>
                                                <th>Actions</th>
                                                <th>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...(newDriver.ecsCardArray || [])]
                                                .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                                    <tr>
                                                        <td>{newDriver.ecsCardArray.length - index}</td>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default ECSTab;