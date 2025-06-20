import React, { useState, useEffect } from 'react';
import PersonnelsTable from './PersonnelsTable';
import { fetchDrivers, deleteDriver, disableDriver } from '../../features/drivers/driverSlice';
import { useSelector, useDispatch } from 'react-redux';
import PersonnelForm from './PersonnelForm/PersonnelForm';
import { fetchSites } from '../../features/sites/siteSlice';
import TableFeatures from '../../components/TableFeatures/TableFeatures';

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
        typeOfDriverTrace: []
    };

    const [newDriver, setNewDriver] = useState(clearDriver);
    const { driverStatus } = useSelector((state) => state.drivers);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const driversBySite = useSelector((state) => state.drivers.bySite);

    const [driversList, setDriversList] = useState(Object.values(driversBySite).flat())
    const colList = { 'First Name': 'firstName', 'Last Name': 'lastName', 'Vehicle Size': 'vehicleSize', 'Transport Id': 'transportId', 'Site': 'siteSelection' }
    const [columns, setColumns] = useState(colList)
    const [toastOpen, setToastOpen] = useState(null)

    useEffect(() => {
        setDriversList(Object.values(driversBySite).flat())
    }, [driversBySite])

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, siteStatus, dispatch]);

    const handleEditDriver = (driver) => {
        console.log('selectedDriver:', driver)
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

    const handleDeleteDriver = async (id, siteSelection, user_ID) => {
        dispatch(deleteDriver({ id, siteSelection }))
        //await axios.delete(`${API_BASE_URL}/api/auth/deleteByUserID/${user_ID}`);

    }

    const handleDisableDriver = async ({ driver, email, disabled }) => {
        try {
            dispatch(disableDriver({ driver, email, disabled })).unwrap()
        }
        catch (err) {
            console.log(err)
        }
        //await axios.delete(`${API_BASE_URL}/api/auth/deleteByUserID/${user_ID}`);

    }

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <h2 className='text-sm md:text-xl mb-2 font-bold dark:text-white'>Manage Personnels</h2>
            <div className='flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='z-15 sticky top-0 flex items-center justify-between items-center bg-white/60 backdrop-blur-md p-2 rounded-t-lg border-b border-neutral-200'>
                    <div className='text-sm md:text-base'>{personnelMode === 'create' ? 'Add Personnel' : 'Personnels List'}</div>
                    {personnelMode === 'view' &&
                        <div className='flex h-full flex-col md:flex-row gap-2'>
                            <div className='justify-self-start md:justify-self-end'><TableFeatures columns={colList} setColumns={setColumns} content={driversList} setContent={setDriversList} /></div>
                            <button onClick={() => setPersonnelMode('create')} className='w-fit h-full self-end text-white bg-green-500 hover:bg-green-600  rounded-md text-xs md:text-sm px-2 py-1'>Add Personnel</button>
                        </div>
                    }
                </div>
                {personnelMode === 'view' ? <PersonnelsTable handleEditDriver={handleEditDriver} handleDeleteDriver={handleDeleteDriver} columns={columns} driversList={driversList} onDisableDriver={handleDisableDriver} /> :
                    <PersonnelForm clearDriver={clearDriver}
                        newDriver={newDriver}
                        setNewDriver={setNewDriver}
                        personnelMode={personnelMode}
                        setPersonnelMode={setPersonnelMode}
                        sites={sites}
                        setToastOpen={setToastOpen}
                    />}
            </div>
        </div>
    );
};

export default ManagePersonnels;