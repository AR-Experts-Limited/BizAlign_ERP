import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';

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

export default RightToWorkTab;