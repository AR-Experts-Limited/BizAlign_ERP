import React, { useState, useEffect } from 'react';
import PersonnelsTable from './PersonnelsTable';
import { fetchDrivers, deleteDriver, disableDriver } from '../../features/drivers/driverSlice';
import { useSelector, useDispatch } from 'react-redux';
import PersonnelForm from './PersonnelForm/PersonnelForm';
import { fetchSites } from '../../features/sites/siteSlice';
import TableFeatures from '../../components/TableFeatures/TableFeatures';
import { useCallback } from 'react';
import Spinner from '../../components/UIElements/Spinner';

const ManagePersonnels = () => {
    const [personnelMode, setPersonnelMode] = useState('view')
    const dispatch = useDispatch();
    const clearDriver = {
        vehicleRegPlate: '',
        employmentStatus: 'Sole Trader',
        firstName: '',
        lastName: '',
        postcode: '',
        nationalInsuranceNumber: '',
        dateOfBirth: '',
        nationality: '',
        typeOfDriver: '',
        vehicleSize: '',
        siteSelection: '',
        Email: '',
        PhoneNo: '',
        bankChoice: 'Personal',
        drivingLicenseNumber: '',
        dlValidity: '',
        dlExpiry: '',
        passportIssuedFrom: '',
        passportNumber: '',
        passportValidity: '',
        passportExpiry: '',
        rightToWorkValidity: '',
        rightToWorkExpiry: '',
        ecsInformation: false,
        ownVehicleInsuranceNA: {
            mvi: false,
            goods: false,
            public: false
        },
        typeOfDriverTrace: [],
        customTypeOfDriver: {}
    };

    const [newDriver, setNewDriver] = useState(clearDriver);
    const { driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const { bySite: driversBySite, error } = useSelector((state) => state.drivers);
    const { userDetails } = useSelector((state) => state.auth);
    const [driversList, setDriversList] = useState(Object.values(driversBySite).flat())
    const colList = { 'First Name': 'firstName', 'Last Name': 'lastName', 'Vehicle Size': 'vehicleSize', 'Transport Id': 'transportId', 'Site': 'siteSelection' }
    const [columns, setColumns] = useState(colList)
    const [toastOpen, setToastOpen] = useState(null)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        setDriversList(Object.values(driversBySite).flat())
    }, [driversBySite])

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, siteStatus, dispatch]);

    const handleEditDriver = (driver) => {
        setNewDriver({
            ...driver,
            passportDocument: '',
            passportDocumentArray: driver.passportDocument,
            drivingLicenseFrontImage: '',
            drivingLicenseBackImage: '',
            drivingLicenseFrontImageArray: driver.drivingLicenseFrontImage,
            drivingLicenseBackImageArray: driver.drivingLicenseBackImage,
            rightToWorkCard: '',
            rightToWorkCardArray: driver.rightToWorkCard,
            profilePicture: '',
            profilePictureArray: driver.profilePicture,
            companyRegistrationCertificate: '',
            companyRegistrationCertificateArray: driver.companyRegistrationCertificate,
            ecsCard: '',
            ecsCardArray: driver.ecsCard,
            MotorVehicleInsuranceCertificate: '',
            MotorVehicleInsuranceCertificateArray: driver.MotorVehicleInsuranceCertificate,
            GoodsInTransitInsurance: '',
            GoodsInTransitInsuranceArray: driver.GoodsInTransitInsurance,
            PublicLiablity: '',
            PublicLiablityArray: driver.PublicLiablity,
            profilePicture: '',
            profilePictureArray: driver.profilePicture,
            signature: '',
            signatureArray: driver.signature,

        })
        setPersonnelMode('edit')
    }

    const handleDeleteDriver = useCallback(async (id, siteSelection, user_ID) => {
        try {
            await dispatch(deleteDriver({ id, siteSelection })).unwrap();
            setToastOpen({ content: 'Driver deleted successfully' });
        } catch (err) {
            console.error('Delete driver failed:', err);
            setToastOpen({ content: 'Failed to delete driver' });
        }
        setTimeout(() => setToastOpen(null), 2000)
        //await axios.delete(`${API_BASE_URL}/api/auth/deleteByUserID/${user_ID}`);
    }, [dispatch, setToastOpen]);

    const handleDisableDriver = useCallback(async ({ driver, email, disabled }) => {
        try {
            await dispatch(disableDriver({ driver, email, disabled })).unwrap();
            setToastOpen({ content: `Driver ${disabled ? 'disabled' : 'enabled'} successfully` });
        } catch (err) {
            console.error('Disable driver failed:', err);
            setToastOpen({ content: 'Failed to disable driver' });
        }
        setTimeout(() => setToastOpen(null), 2000)
        //await axios.delete(`${API_BASE_URL}/api/auth/deleteByUserID/${user_ID}`);
    }, [dispatch, setToastOpen]);

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>

            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-stone-200  fixed flex justify-center items-center top-4 z-800 left-1/2 -translate-x-1/2 bg-stone-50/30 dark:bg-dark/20 px-3 py-2 rounded-xl shadow-lg`}>
                <div className='flex gap-2 items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <div className={`${processing ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-800 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 text-gray-500 justify-around items-center'>
                    <Spinner /> Processing...
                </div>
            </div>

            <h2 className='text-sm md:text-xl mb-2 font-bold dark:text-white'>Manage Personnels</h2>
            <div className='flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='z-15 sticky top-0 flex items-center justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-t-lg border-b border-neutral-200'>
                    <div className='text-sm md:text-base'>{personnelMode === 'create' ? 'Add Personnel' : 'Personnels List'}</div>
                    {personnelMode === 'view' && ['Admin', 'super-admin', 'compliance'].includes(userDetails.role) &&
                        <div className='flex h-full flex-col md:flex-row gap-2'>
                            <div className='justify-self-start md:justify-self-end'><TableFeatures columns={colList} setColumns={setColumns} content={driversList} setContent={setDriversList} /></div>
                            <button onClick={() => setPersonnelMode('create')} className='w-fit h-full self-end text-white bg-green-500 hover:bg-green-600  rounded-lg text-xs md:text-sm px-2 py-1'>Add Personnel</button>
                        </div>
                    }
                </div>
                {personnelMode === 'view' ? <PersonnelsTable userDetails={userDetails} handleEditDriver={handleEditDriver} handleDeleteDriver={handleDeleteDriver} columns={columns} driversList={driversList} onDisableDriver={handleDisableDriver} /> :
                    <PersonnelForm
                        userDetails={userDetails}
                        clearDriver={clearDriver}
                        newDriver={newDriver}
                        error={error}
                        setNewDriver={setNewDriver}
                        personnelMode={personnelMode}
                        setPersonnelMode={setPersonnelMode}
                        sites={sites}
                        setToastOpen={setToastOpen}
                        setProcessing={setProcessing}
                        driversList={driversList}
                    />}
            </div>
        </div>
    );
};

export default ManagePersonnels;