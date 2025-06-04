import React, { useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import InputGroup from '../../components/InputGroup/InputGroup';
import { MdOutlineDelete } from "react-icons/md";
import { FaPoundSign } from 'react-icons/fa';

const Incentives = () => {
    const [newIncentive, setNewIncentive] = useState({
        site: '',
        service: '',
        month: '',
        type: '',
        rate: 0,
    });
    const [errors, setErrors] = useState({
        site: false,
        service: false,
        month: false,
        type: false,
        rate: false,
    });

    // Sample data for dropdowns and table
    const sites = [
        { siteKeyword: 'DPR1', siteName: 'Leyland (DPR1)' },
        { siteKeyword: 'DXM3', siteName: 'DXM3 - Rochdale' },
        { siteKeyword: 'DXM2', siteName: 'DXM2 - Manchester' },
        { siteKeyword: 'DXM5', siteName: 'DXM5 - Bolton' },
    ];
    const services = [
        { _id: '1', title: 'Service A' },
        { _id: '2', title: 'Service B' },
        { _id: '3', title: 'Service C' },
    ];
    const incentiveTypes = ['Normal', 'Prime', 'Peak'];

    // Sample data for the table
    const incentives = [
        {
            _id: '1',
            site: 'DPR1',
            service: 'Service A',
            month: '2025-01',
            type: 'Normal',
            rate: 100,
            addedBy: { name: 'John Doe', email: 'john@example.com', addedOn: '2025-01-01T12:00:00Z' },
        },
        {
            _id: '2',
            site: 'DXM3',
            service: 'Service B',
            month: '2025-02',
            type: 'Prime',
            rate: 150,
            addedBy: { name: 'Jane Smith', email: 'jane@example.com', addedOn: '2025-02-01T12:00:00Z' },
        },
    ];

    const validateFields = () => {
        const newErrors = {
            site: !newIncentive.site,
            service: !newIncentive.service,
            month: !newIncentive.month,
            type: !newIncentive.type,
            rate: !newIncentive.rate || newIncentive.rate <= 0,
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error);
    };

    const handleAddIncentive = () => {
        if (!validateFields()) return;
        // Placeholder for adding incentive logic
    };

    return (
        <div className="relative w-full p-4 overflow-auto">
            <h2 className="text-xl mb-3 font-bold dark:text-white">Incentives</h2>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                <div className="h-full md:col-span-2 w-full bg-white dark:bg-dark shadow-lg border border-neutral-300 dark:border-dark-3 rounded-lg">
                    <div className="relative overflow-auto max-h-[40rem]">
                        <div className="sticky top-0 z-5 rounded-t-lg w-full p-3 bg-white/30 dark:bg-dark/30 backdrop-blur-md border-b dark:border-dark-3 border-neutral-200 dark:text-white">
                            <h3>Add new incentive</h3>
                        </div>
                        <div className="p-4 pb-8 flex flex-col gap-3">
                            <div>
                                <InputGroup
                                    type="dropdown"
                                    label="Select Site"
                                    required={true}
                                    className={`${newIncentive.site === '' && 'text-gray-400'}`}
                                    onChange={(e) => {
                                        setNewIncentive({ ...newIncentive, site: e.target.value });
                                        setErrors({ ...errors, site: false });
                                    }}
                                    error={errors.site}
                                    value={newIncentive.site}
                                >
                                    <option value="">-- Select Site --</option>
                                    {sites.map((site) => (
                                        <option key={site.siteKeyword} value={site.siteKeyword}>
                                            {site.siteName}
                                        </option>
                                    ))}
                                </InputGroup>
                                {errors.site && <p className="text-red-400 text-sm mt-1">* Site is required</p>}
                            </div>

                            <div>
                                <InputGroup
                                    type="dropdown"
                                    label="Select Service"
                                    required={true}
                                    className={`${newIncentive.service === '' && 'text-gray-400'}`}
                                    onChange={(e) => {
                                        setNewIncentive({ ...newIncentive, service: e.target.value });
                                        setErrors({ ...errors, service: false });
                                    }}
                                    error={errors.service}
                                    value={newIncentive.service}
                                >
                                    <option value="">-- Select Service --</option>
                                    {services.map((service) => (
                                        <option key={service._id} value={service.title}>
                                            {service.title}
                                        </option>
                                    ))}
                                </InputGroup>
                                {errors.service && <p className="text-red-400 text-sm mt-1">* Service is required</p>}
                            </div>

                            <div>
                                <label className="text-sm font-medium">Month <span className="text-red-400">*</span></label>
                                <Flatpickr
                                    value={newIncentive.month}
                                    onChange={([date]) => {
                                        setNewIncentive({ ...newIncentive, month: date.toISOString().slice(0, 7) });
                                        setErrors({ ...errors, month: false });
                                    }}
                                    options={{
                                        mode: 'single',
                                        dateFormat: 'Y-m',
                                        altInput: true,
                                        altFormat: 'F Y',
                                    }}
                                    className={`w-full p-2 border rounded-md ${errors.month ? 'border-red-400' : 'border-neutral-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
                                />
                                {errors.month && <p className="text-red-400 text-sm mt-1">* Month is required</p>}
                            </div>

                            <div>
                                <InputGroup
                                    type="dropdown"
                                    label="Incentive Type"
                                    required={true}
                                    className={`${newIncentive.type === '' && 'text-gray-400'}`}
                                    onChange={(e) => {
                                        setNewIncentive({ ...newIncentive, type: e.target.value });
                                        setErrors({ ...errors, type: false });
                                    }}
                                    error={errors.type}
                                    value={newIncentive.type}
                                >
                                    <option value="">-- Select Type --</option>
                                    {incentiveTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </InputGroup>
                                {errors.type && <p className="text-red-400 text-sm mt-1">* Incentive type is required</p>}
                            </div>

                            <div>
                                <InputGroup
                                    type="number"
                                    label="Incentive Amount (£)"
                                    required={true}
                                    min={0}
                                    step="any"
                                    iconPosition="left"
                                    icon={<FaPoundSign className="text-neutral-300" />}
                                    onChange={(e) => {
                                        setNewIncentive({ ...newIncentive, rate: e.target.value });
                                        setErrors({ ...errors, rate: false });
                                    }}
                                    error={errors.rate}
                                    value={newIncentive.rate}
                                />
                                {errors.rate && <p className="text-red-400 text-sm mt-1">* Valid incentive amount is required</p>}
                            </div>

                            <button
                                onClick={handleAddIncentive}
                                disabled={Object.values(errors).some((error) => error)}
                                className="ml-auto border w-fit h-fit border-primary-500 bg-primary-500 text-white rounded-md py-1 px-2 hover:text-primary-500 hover:bg-white disabled:bg-gray-200 disabled:border-gray-200 disabled:hover:text-white"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-h-[40rem] relative md:col-span-5 w-full bg-white dark:bg-dark dark:border-dark-3 shadow-lg border border-neutral-300 rounded-lg">
                    <div className="z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white">
                        <h3>Incentives list</h3>
                    </div>
                    <div className="p-4">
                        <table className="table-general">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Site</th>
                                    <th>Service Title</th>
                                    <th>Month</th>
                                    <th>Incentive Type</th>
                                    <th>Rate</th>
                                    <th>Options</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incentives.map((incentive) => (
                                    <tr key={incentive._id}>
                                        <td>{String(incentive._id).slice(-4)}</td>
                                        <td>{incentive.site}</td>
                                        <td>{incentive.service}</td>
                                        <td>{new Date(incentive.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                                        <td>{incentive.type}</td>
                                        <td>£ {incentive.rate}</td>
                                        <td>
                                            <button className="p-2 rounded-md hover:bg-neutral-200 text-red-400">
                                                <MdOutlineDelete size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Incentives;