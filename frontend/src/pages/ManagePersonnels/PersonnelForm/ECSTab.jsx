import React from 'react';
import InputGroup from '../../../components/InputGroup/InputGroup';
import DatePicker from '../../../components/Datepicker/Datepicker';

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

export default ECSTab;