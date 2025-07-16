import React, { useMemo, useEffect, useState } from 'react';
import { FixedSizeList } from 'react-window';
import TableFeatures from '../../components/TableFeatures/TableFeatures';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDrivers, updateDriverDoc } from '../../features/drivers/driverSlice';
import moment from 'moment';
import Modal from '../../components/Modal/Modal';
import DatePicker from '../../components/Datepicker/Datepicker';
import { AutoSizer } from "react-virtualized";

const Notifications = () => {
    const dispatch = useDispatch();
    const [modalContent, setModalContent] = useState(null);
    const [toastOpen, setToastOpen] = useState(null);
    const [newExpiry, setNewExpiry] = useState('');
    const [notificationsList, setNotificationsList] = useState([])
    const [repopulate, setRepopulate] = useState(false)
    const driversBySite = useSelector((state) => state.drivers.bySite);
    const { driverStatus } = useSelector((state) => state.drivers);
    const { userDetails: currentUser } = useSelector((state) => state.auth);

    const sortLatestDocument = (docs) => {
        if (!docs) return null;
        return Array.isArray(docs)
            ? [...docs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
            : docs;
    };

    useEffect(() => {
        setNotificationsList(Object.values(driversBySite).flat().map(driver => ({
            _id: driver._id,
            driver,
            siteSelection: driver.siteSelection,
            typeOfDriver: driver.typeOfDriver,
            driverName: `${driver.firstName} ${driver.lastName}`,
            dlExpiry: driver.dlExpiry?.$date || driver.dlExpiry,
            ecsExpiry: driver.ecsExpiry?.$date || driver.ecsExpiry,
            passportExpiry: driver.passportExpiry?.$date || driver.passportExpiry,
            rightToWorkExpiry: driver.rightToWorkExpiry?.$date || driver.rightToWorkExpiry,
            policyEndDate: driver.policyEndDate?.$date || driver.policyEndDate,
            activeStatus: driver.activeStatus === 'Archived' ? 'Archived' : 'Active',
            suspended: driver.suspended === 'Suspended' ? 'Suspended' : 'Active',
            disabled: driver.disabled,
            passportIssuedFrom: driver.passportIssuedFrom,
            drivingLicenseFrontImage: sortLatestDocument(driver.drivingLicenseFrontImage),
            drivingLicenseBackImage: sortLatestDocument(driver.drivingLicenseBackImage),
            passportDocument: sortLatestDocument(driver.passportDocument),
            rightToWorkCard: sortLatestDocument(driver.rightToWorkCard),
            expiredReasons: driver.expiredReasons || [],
        })));
        setRepopulate(true)
    }, [driversBySite]);

    const columns = {
        'Site': 'siteSelection',
        'Vehicle Type': 'typeOfDriver',
        'Personnel Name': 'driverName',
        "Driver's License Expiry": 'dlExpiry',
        'Passport Expiry': 'passportExpiry',
        'Right to Work Expiry': 'rightToWorkExpiry',
        'ECS Expiry': 'ecsExpiry',
        'Active Status': 'activeStatus',
        'Suspension Status': 'suspended'
    };

    const docVariableMap = {
        'passportExpiry': 'passportDocument',
        'dlExpiry': 'drivingLicenseFrontImage',
        'rightToWorkExpiry': 'rightToWorkCard'
    };

    const docTypeMap = {
        'passportExpiry': 'Passport Document',
        'dlExpiry': 'Driving License',
        'rightToWorkExpiry': 'Right to Work Card',
        'ecsExpiry': 'ECS Card',
    };


    const [displayColumns, setDisplayColumns] = useState(columns);

    useEffect(() => {
        if (driverStatus === 'idle') {
            dispatch(fetchDrivers());
        }
    }, [driverStatus, dispatch]);

    const getExpiryColor = (expiryDate) => {
        if (!expiryDate) return 'text-gray-500';
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return diffDays < 0 ? 'text-red-500 font-bold' :
            diffDays <= 30 ? 'text-orange-500' :
                'text-green-500';
    };

    const isExpired = (expiryDate) => {
        if (!expiryDate) return false;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return diffDays < 0;
    };

    const formatDate = (date) => date ? moment(date).format('DD MMMM YYYY') : 'N/A';

    const handleUnarchiveDriver = async (driver, updates) => {
        try {
            await dispatch(updateDriverDoc({ driver, updates })).unwrap();
            setToastOpen({ content: `Driver ${modalContent?.type === 'unarchive' ? 'unarchived' : 'unsuspended'} successfully` });
        } catch (err) {
            console.error('Operation failed:', err);
            setToastOpen({ content: 'Failed to process driver' });
        }
        setModalContent(null);
        setTimeout(() => setToastOpen(null), 2000);
    };

    const approveDocUpdate = async () => {
        if (!newExpiry || !modalContent?.notification) return;

        const driver = modalContent.notification.driver;
        const docName = modalContent.expiredDoc.name;
        // const docTypeCode = docTypeCodeMap[docName];
        let updates = {};
        let expiredReasons = modalContent.notification.expiredReasons || [];

        const expiryDate = new Date(newExpiry);

        if (docName === 'dlExpiry') {
            expiredReasons = expiredReasons.filter(item => item !== "Driver's License");
            updates = {
                dlExpiry: expiryDate,
                expiredReasons,
                drivingLicenseBackImage: {
                    original: driver.drivingLicenseBackImage?.temp,
                    temp: driver.drivingLicenseBackImage?.temp,
                    timestamp: new Date(driver.drivingLicenseBackImage?.timestamp),
                    docApproval: true,
                    approvedBy: {
                        name: `${currentUser.userName}`,
                        email: currentUser.email,
                        role: currentUser.role,
                        addedOn: new Date()
                    },
                },
                drivingLicenseFrontImage: {
                    original: driver.drivingLicenseFrontImage?.temp,
                    temp: driver.drivingLicenseFrontImage?.temp,
                    timestamp: new Date(driver.drivingLicenseFrontImage?.timestamp),
                    docApproval: true,
                    approvedBy: {
                        name: `${currentUser.userName}`,
                        email: currentUser.email,
                        role: currentUser.role,
                        addedOn: new Date()
                    },
                }
            };
        } else {
            const docType = docTypeMap[docName];
            expiredReasons = expiredReasons.filter(item => item !== docType);
            updates = {
                [docName]: expiryDate,
                expiredReasons,
                [docVariableMap[docName]]: {
                    original: driver[docVariableMap[docName]]?.temp,
                    temp: driver[docVariableMap[docName]]?.temp,
                    timestamp: new Date(driver[docVariableMap[docName]]?.timestamp),
                    docApproval: true,
                    approvedBy: {
                        name: `${currentUser.userName}`,
                        email: currentUser.email,
                        role: currentUser.role,
                        addedOn: new Date()
                    },
                }
            };
        }

        if (expiredReasons.length === 0) {
            updates.activeStatus = 'Active';
        }

        try {
            await dispatch(updateDriverDoc({ driver, updates })).unwrap();
            setToastOpen({ content: 'Document updated successfully' });
            setModalContent(null);
            setNewExpiry('');
        } catch (err) {
            console.error('Document update failed:', err);
            setToastOpen({ content: 'Failed to update document' });
        }
        setTimeout(() => setToastOpen(null), 2000);
    };

    const denyDocUpdate = () => {
        setModalContent(null);
        setNewExpiry('');
        setToastOpen({ content: 'Document update denied' });
        setTimeout(() => setToastOpen(null), 2000);
    };

    const Row = ({ index, style }) => {
        const notification = notificationsList[index];

        return (
            <div style={{ ...style, display: 'flex', alignItems: 'center', padding: '5px' }} key={notification._id}>
                <div className="flex w-full">
                    <div className="flex justify-center items-center p-3 text-center w-8 max-w-8 text-sm border-b border-gray-300">
                        {index + 1}
                    </div>
                    {Object.values(displayColumns).map((col, i) => (
                        <div
                            key={`${notification._id}-${i}`}
                            className={`flex-1 flex items-center justify-center p-3 text-center min-w-32 text-sm border-b border-gray-300 ${['dlExpiry', 'ecsExpiry', 'passportExpiry', 'rightToWorkExpiry', 'policyEndDate'].includes(col)
                                ? getExpiryColor(notification[col])
                                : ''}`}
                        >
                            {col === 'rightToWorkExpiry' && notification.passportIssuedFrom === 'United Kingdom' ? (
                                'UK citizen'
                            ) : col === 'activeStatus' && notification.activeStatus === 'Archived' ? (
                                <div
                                    className="cursor-pointer hover:text-blue-500 bg-gray-300/50 rounded-md px-2 py-1 shadow"
                                    onClick={() => setModalContent({
                                        type: 'unarchive',
                                        notification
                                    })}
                                >
                                    Archived
                                </div>
                            ) : col === 'suspended' && notification.suspended === 'Suspended' ? (
                                <div
                                    className="cursor-pointer hover:text-blue-500 bg-gray-300/50 rounded-md px-2 py-1 shadow"
                                    onClick={() => setModalContent({
                                        type: 'unsuspend',
                                        notification
                                    })}
                                >
                                    Suspended
                                </div>
                            ) : ['dlExpiry', 'ecsExpiry', 'passportExpiry', 'rightToWorkExpiry', 'policyEndDate'].includes(col) && isExpired(notification[col]) ? (
                                <div
                                    className="relative cursor-pointer hover:text-blue-500 bg-gray-300/50 rounded-md px-2 py-1 shadow"
                                    onClick={() => setModalContent({
                                        type: 'expired_doc',
                                        notification,
                                        expiredDoc: { name: col, expiredOn: formatDate(notification[col]) }
                                    })}
                                >
                                    {formatDate(notification[col])}
                                    {(notification[docVariableMap[col]]?.temp && !notification[docVariableMap[col]]?.docApproval) && (
                                        <div className="absolute -top-1 -right-1">
                                            <span className="relative flex size-2.5">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                                                <span className="relative inline-flex size-2.5 rounded-full bg-sky-500"></span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                ['dlExpiry', 'ecsExpiry', 'passportExpiry', 'rightToWorkExpiry', 'policyEndDate'].includes(col)
                                    ? formatDate(notification[col])
                                    : notification[col] || 'N/A'
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderDocumentButtons = (docName, notification) => {
        if (docName !== 'dlExpiry') {
            const doc = notification[docVariableMap[docName]];
            return doc?.temp ? (
                <a href={doc.temp} target="_blank" rel="noopener noreferrer">
                    <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition">
                        View
                    </button>
                </a>
            ) : (
                <button className="bg-gray-300 text-gray-600 px-4 py-1 rounded cursor-not-allowed" disabled>
                    No Document
                </button>
            );
        }

        const frontDoc = notification.drivingLicenseFrontImage;
        const backDoc = notification.drivingLicenseBackImage;
        return (
            <div className="flex space-x-4">
                <div>
                    {frontDoc?.temp ? (
                        <a href={frontDoc.temp} target="_blank" rel="noopener noreferrer">
                            <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition">
                                Front
                            </button>
                        </a>
                    ) : (
                        <button className="bg-gray-300 text-gray-600 px-4 py-1 rounded cursor-not-allowed" disabled>
                            No Front
                        </button>
                    )}
                </div>
                <div>
                    {backDoc?.temp ? (
                        <a href={backDoc.temp} target="_blank" rel="noopener noreferrer">
                            <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition">
                                Back
                            </button>
                        </a>
                    ) : (
                        <button className="bg-gray-300 text-gray-600 px-4 py-1 rounded cursor-not-allowed" disabled>
                            No Back
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderDocumentTimestamps = (docName, notification) => {
        if (docName !== 'dlExpiry') {
            const doc = notification[docVariableMap[docName]];
            return (
                <span className="text-gray-900">
                    {doc?.timestamp ? new Date(doc.timestamp).toLocaleString() : "No Document Uploaded"}
                </span>
            );
        }

        const frontDoc = notification.drivingLicenseFrontImage;
        const backDoc = notification.drivingLicenseBackImage;
        return (
            <div className="text-gray-900 space-y-1">
                <div>
                    <span className="font-medium text-gray-700">Front: </span>
                    {frontDoc?.timestamp ? new Date(frontDoc.timestamp).toLocaleString() : "No Front Uploaded"}
                </div>
                <div>
                    <span className="font-medium text-gray-700">Back: </span>
                    {backDoc?.timestamp ? new Date(backDoc.timestamp).toLocaleString() : "No Back Uploaded"}
                </div>
            </div>
        );
    };

    const isDatePickerDisabled = (docName, notification) => {
        if (docName !== 'dlExpiry') {
            return !notification[docVariableMap[docName]]?.temp;
        }
        return !(notification.drivingLicenseFrontImage?.temp && notification.drivingLicenseBackImage?.temp);
    };

    return (
        <div className="w-full h-full flex flex-col p-1.5 md:p-3.5">
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-stone-200 fixed flex justify-center items-center top-4 left-1/2 -translate-x-1/2 bg-stone-50/30 dark:bg-dark/20 px-3 py-2 rounded-xl shadow-lg`}>
                <div className="flex gap-2 items-center">{toastOpen?.content}</div>
            </div>

            <h2 className="text-sm md:text-xl mb-2 font-bold dark:text-white">Notifications</h2>
            <div className="flex-1 flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-hidden">
                <div className="z-15 sticky top-0 flex items-center justify-between bg-white backdrop-blur-md p-2 rounded-t-lg border-b border-neutral-200">
                    <div className="text-sm md:text-base">Notifications List</div>
                    <TableFeatures
                        repopulate={repopulate}
                        setRepopulate={setRepopulate}
                        columns={columns}
                        setColumns={setDisplayColumns}
                        content={notificationsList}
                        setContent={setNotificationsList}
                    />
                </div>

                <div className="flex-1 flex flex-col h-full w-full">
                    <div className="flex w-full text-sm md:text-base sticky top-0 bg-white z-8 text-gray-400 border-b border-gray-300">
                        <div className="font-light py-2 px-0 text-center w-8 max-w-8">#</div>
                        {Object.keys(displayColumns).map((col) => (
                            <div key={col} className="flex-1 font-light py-2 px-0 text-center min-w-32">{col}</div>
                        ))}
                    </div>
                    <div className="rounded-md flex-1 h-full  w-full">
                        <AutoSizer>
                            {({ width, height }) => {
                                return (<FixedSizeList
                                    height={height}
                                    width={width}
                                    itemCount={notificationsList.length}
                                    itemSize={75}
                                >
                                    {Row}
                                </FixedSizeList>)
                            }}
                        </AutoSizer>
                    </div>
                </div>
            </div>

            <Modal isOpen={!!modalContent}>
                <div className="flex flex-col">
                    {modalContent?.type === 'unarchive' && (
                        <>
                            <div className="border-b border-neutral-300 p-3">Driver Unarchival</div>
                            <div className="p-4 py-10">
                                <p>The Driver: <b>{modalContent?.notification?.driverName}</b> has not had any schedules for the past 5 days or more.<br />Are you sure you want to Un-Archive said driver?</p>
                            </div>
                            <div className="flex gap-3 justify-end p-3 border-t border-neutral-300">
                                <button
                                    className="px-2 py-1 bg-primary-700 text-white text-sm rounded-md"
                                    onClick={() => handleUnarchiveDriver(modalContent.notification.driver, { activeStatus: 'Active' })}
                                >
                                    Unarchive
                                </button>
                                <button
                                    className="px-2 py-1 bg-gray-700 text-white text-sm rounded-md"
                                    onClick={() => setModalContent(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                    {modalContent?.type === 'unsuspend' && (
                        <>
                            <div className="border-b border-neutral-300 p-3">Driver Unsuspend</div>
                            <div className="p-4 py-10">
                                <p>The Driver: <b>{modalContent?.notification?.driverName}</b> has been suspended because of pending shifts.<br />Are you sure you want to Unsuspend said driver?</p>
                            </div>
                            <div className="flex gap-3 justify-end p-3 border-t border-neutral-300">
                                <button
                                    className="px-2 py-1 bg-primary-700 text-white text-sm rounded-md"
                                    onClick={() => handleUnarchiveDriver(modalContent.notification.driver, { suspended: 'Active' })}
                                >
                                    Unsuspend
                                </button>
                                <button
                                    className="px-2 py-1 bg-gray-700 text-white text-sm rounded-md"
                                    onClick={() => setModalContent(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </>
                    )}
                    {modalContent?.type === 'expired_doc' && (
                        <div className="w-120">
                            <div className="border-b border-neutral-300 p-3">Document Details</div>
                            <div className="space-y-4 p-5">
                                <div className="flex justify-between pb-2">
                                    <span className="font-medium text-gray-700">Document</span>
                                    <span className="text-gray-900">{docTypeMap[modalContent.expiredDoc.name]}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="font-medium text-gray-700">Expired On</span>
                                    <span className="text-gray-900">{modalContent.expiredDoc.expiredOn}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4">
                                    <div className="font-medium text-gray-700 mb-2">Updated Document</div>
                                    {renderDocumentButtons(modalContent.expiredDoc.name, modalContent.notification)}
                                </div>
                                <div className="flex justify-between pb-4">
                                    <span className="font-medium text-gray-700 block">Uploaded On</span>
                                    {renderDocumentTimestamps(modalContent.expiredDoc.name, modalContent.notification)}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-700">New Expiry Date</span>
                                    <div className="w-42">
                                        <DatePicker
                                            iconPosition="left"
                                            disabled={isDatePickerDisabled(modalContent.expiredDoc.name, modalContent.notification)}
                                            onChange={(date) => setNewExpiry(date)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end p-3 border-t border-neutral-300">
                                <button
                                    className="px-2 py-1 bg-green-700 text-white text-sm rounded-md disabled:bg-gray-400 "
                                    disabled={!newExpiry}
                                    onClick={approveDocUpdate}
                                >
                                    Approve
                                </button>
                                <button
                                    disabled={!newExpiry}
                                    className="px-2 py-1 bg-red-700 text-white text-sm rounded-md disabled:bg-gray-400"
                                    onClick={denyDocUpdate}
                                >
                                    Deny
                                </button>
                                <button
                                    className="px-2 py-1 bg-gray-700 text-white text-sm rounded-md"
                                    onClick={() => setModalContent(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Notifications;