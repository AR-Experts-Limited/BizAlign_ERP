import React from 'react';
import { FaTrashAlt } from "react-icons/fa";
import TableFeatures from '../../components/TableFeatures/TableFeatures';

const Notifications = () => {
    // Sample data structure - replace with actual data
    const notificationsList = [
        {
            _id: '1',
            siteSelection: 'Site A',
            firstName: 'John',
            lastName: 'Doe',
            dlExpiry: '2023-12-31',
            ecsExpiry: '2023-11-30',
            passportExpiry: '2024-01-15',
            rightToWorkExpiry: '2024-02-28',
            policyEndDate: '2023-12-15',
            activeStatus: 'Active',
            suspended: 'Active'
        },
        // Add more sample data as needed
    ];

    // Columns configuration
    const columns = {
        'Site': 'siteSelection',
        'Personnel Name': 'driverName',
        'Driver\'s License Expiry': 'dlExpiry',
        'ECS Expiry': 'ecsExpiry',
        'Passport Expiry': 'passportExpiry',
        'Right to Work Expiry': 'rightToWorkExpiry',
        'Vehicle Insurance Expiry': 'policyEndDate',
        'Active Status': 'activeStatus',
        'Suspension Status': 'suspended'
    };

    // Placeholder functions - replace with actual implementations
    const handleEditNotification = (notification) => {
        console.log('Edit:', notification);
    };

    const handleDeleteNotification = (id) => {
        console.log('Delete:', id);
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>
            <h2 className='text-sm md:text-xl mb-2 font-bold dark:text-white'>Notifications</h2>
            <div className='flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='z-15 sticky top-0 flex items-center justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-t-lg border-b border-neutral-200'>
                    <div className='text-sm md:text-base'>Notifications List</div>
                    <div className='flex h-full flex-col md:flex-row gap-2'>
                        <div className='justify-self-start md:justify-self-end'>
                            <TableFeatures
                                columns={columns}
                                setColumns={() => { }}
                                content={notificationsList}
                                setContent={() => { }}
                            />
                        </div>
                    </div>
                </div>

                <div className='overflow-auto'>
                    <table className='table-general'>
                        <thead>
                            <tr className='text-sm md:text-base sticky top-0 bg-white text-neutral-400'>
                                <th>#</th>
                                {Object.keys(columns).map((col) => (
                                    <th key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {notificationsList.map((notification, index) => (
                                <tr
                                    key={notification._id}
                                    onClick={() => handleEditNotification(notification)}
                                    className='cursor-pointer hover:bg-neutral-50'
                                >
                                    <td>{index + 1}</td>
                                    <td>{notification.siteSelection}</td>
                                    <td>{`${notification.firstName} ${notification.lastName}`}</td>
                                    <td>{notification.dlExpiry}</td>
                                    <td>{notification.ecsExpiry}</td>
                                    <td>{notification.passportExpiry}</td>
                                    <td>{notification.rightToWorkExpiry}</td>
                                    <td>{notification.policyEndDate}</td>
                                    <td>{notification.activeStatus}</td>
                                    <td>{notification.suspended}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Notifications;