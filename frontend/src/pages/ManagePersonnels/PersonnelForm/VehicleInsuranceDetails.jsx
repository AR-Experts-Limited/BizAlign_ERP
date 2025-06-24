import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';
import { FaUniversity, FaIdCard } from 'react-icons/fa';
import { FaEye } from "react-icons/fa";
import { handleFileView } from '../supportFunctions'

const VehicleInsuranceDetails = ({ newDriver, setNewDriver, onInputChange, errors }) => {
    const handleNAChange = (type) => (e) => {
        setNewDriver(prev => ({
            ...prev,
            ownVehicleInsuranceNA: { ...prev.ownVehicleInsuranceNA, [type]: e.target.checked }
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
                            checked={newDriver.ownVehicleInsuranceNA?.mvi}
                            onChange={handleNAChange('mvi')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!newDriver.ownVehicleInsuranceNA?.mvi && (
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
                            <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Motor Vehicle Insurance Certificate"
                                name="MotorVehicleInsuranceCertificate"
                                onChange={(e) => onInputChange(e)}
                            // required={true}
                            // error={errors.MotorVehicleInsuranceCertificate}
                            />
                            {errors.MotorVehicleInsuranceCertificate && <p className='text-sm font-light text-red'>* Please provide motor vehicle insurance certificate</p>}

                            {newDriver.MotorVehicleInsuranceCertificateArray?.length > 0 &&
                                <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of Motor Vehicle Insurance Certificate
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Version</th>
                                                <th>Actions</th>
                                                <th>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(newDriver.MotorVehicleInsuranceCertificateArray || [])
                                                .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                                    <tr>
                                                        <td>{newDriver.MotorVehicleInsuranceCertificateArray.length - index}</td>
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
                )}
            </div>

            {/* Goods In Transit Insurance */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Goods In Transit Insurance</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={newDriver.ownVehicleInsuranceNA?.goods}
                            onChange={handleNAChange('goods')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!newDriver.ownVehicleInsuranceNA?.goods && (
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
                            <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Goods In Transit Insurance"
                                name="GoodsInTransitInsurance"
                                onChange={(e) => onInputChange(e)}
                            // required={true}
                            // error={errors.GoodsInTransitInsurance}
                            />
                            {errors.GoodsInTransitInsurance && <p className='text-sm font-light text-red'>* Please provide goods in transit insurance</p>}
                            {newDriver.GoodsInTransitInsuranceArray?.length > 0 &&
                                <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of Goods In Transit Insurance
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Version</th>
                                                <th>Actions</th>
                                                <th>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(newDriver.GoodsInTransitInsuranceArray || [])
                                                .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                                    <tr>
                                                        <td>{newDriver.GoodsInTransitInsuranceArray.length - index}</td>
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
                )}
            </div>

            {/* Public Liability Insurance */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Public Liability Insurance</h2>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={newDriver.ownVehicleInsuranceNA?.public}
                            onChange={handleNAChange('public')}
                        />
                        Not Applicable
                    </label>
                </div>

                {!newDriver.ownVehicleInsuranceNA?.public && (
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
                            <div className='text-amber-500 cols-span-1 md:col-span-3'>*Maximum file size - 5MB, Allowed Formats: jpeg, pdf, png.</div>
                            <InputGroup
                                type="file"
                                fileStyleVariant="style1"
                                label="Public Liability Insurance"
                                name="PublicLiablity"
                                onChange={(e) => onInputChange(e)}
                            // required={true}
                            // error={errors.PublicLiablity}
                            />
                            {errors.PublicLiablity && <p className='text-sm font-light text-red'>* Please provide public liability insurance</p>}
                            {newDriver.PublicLiablityArray?.length > 0 &&
                                <div className='col-span-3 mt-2 rounded-md max-h-60 w-full border-2 border-neutral-200'>
                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of Public Liablity
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Version</th>
                                                <th>Actions</th>
                                                <th>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(newDriver.PublicLiablityArray || [])
                                                .sort((a, b) => (new Date(b.timestamp) - new Date(a.timestamp))).map((doc, index) => (
                                                    <tr>
                                                        <td>{newDriver.PublicLiablityArray.length - index}</td>
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
                )}
            </div>
        </div>
    );
};

export default VehicleInsuranceDetails;