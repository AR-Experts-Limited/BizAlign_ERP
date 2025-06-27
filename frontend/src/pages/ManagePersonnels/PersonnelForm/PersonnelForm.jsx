import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import PersonnelInfoTab from './PersonnelInfoTab';
import BankDetails from './BankDetails';
import DrivingLicenseTab from './DrivingLicenseTab';
import PassportTab from './PassportTab';
import RightToWorkTab from './RightToWorkTab';
import ECSTab from './ECSTab';
import DocumentsTab from './DocumentsTab';
import VehicleInsuranceDetails from './VehicleInsuranceDetails';
import SelfEmploymentDetails from './SelfEmploymentDetails';
import SuccessTick from '../../../components/UIElements/SuccessTick';
import { addDriver, updateDriver } from '../../../features/drivers/driverSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const PersonnelForm = ({ clearDriver, userDetails, newDriver, setNewDriver, sites, personnelMode, setPersonnelMode, setToastOpen }) => {
    const dispatch = useDispatch();

    const [errors, setErrors] = useState({});
    const [age, setAge] = useState(null);
    const [selectedTab, setSelectedTab] = useState('personnelInfo');
    const [success, setSuccess] = useState(false);

    let tabsInfo = [
        { id: 'personnelInfo', label: 'Personnel Info', component: PersonnelInfoTab },
        { id: 'vehicleInsuranceDetails', label: 'Vehicle Insurance Details', component: VehicleInsuranceDetails },
        { id: 'bankDetails', label: 'Bank Details', component: BankDetails },
        { id: 'drivingLicense', label: 'Driving License', component: DrivingLicenseTab },
        { id: 'passport', label: 'Passport', component: PassportTab },
        { id: 'rightToWork', label: 'Right to Work', component: RightToWorkTab },
        { id: 'ecs', label: 'ECS', component: ECSTab },
        { id: 'documents', label: 'Documents', component: DocumentsTab },
    ];

    const [tabs, setTabs] = useState(tabsInfo);

    const requiredFields = {
        personnelInfo: [
            'firstName',
            'lastName',
            'dateOfBirth',
            'postcode',
            'nationality',
            'nationalInsuranceNumber',
            'PhoneNo',
            'Email',
            'typeOfDriver',
            'vehicleSize',
            'siteSelection',
            ...(newDriver.typeOfDriver === 'Own Vehicle' ? ['vehicleRegPlate'] : []),
            ...(newDriver.vatDetails && newDriver.vatDetails?.vatNo !== '' ? ['vatEffectiveDate'] : [])
        ],
        bankDetails: newDriver.bankChoice === 'Personal' ? [
            'bankName',
            'sortCode',
            'bankAccountNumber',
            'accountName'
        ] : [
            'bankNameCompany',
            'sortCodeCompany',
            'bankAccountNumberCompany',
            'accountNameCompany'
        ],
        drivingLicense: [
            'drivingLicenseNumber',
            'dlValidity',
            'dlExpiry'
        ],
        passport: [
            'passportIssuedFrom',
            'passportNumber',
            'passportValidity',
            'passportExpiry'
        ],
        rightToWork: newDriver.passportIssuedFrom !== "United Kingdom" ? [
            'rightToWorkValidity',
            'rightToWorkExpiry'
        ] : [],
        ecs: newDriver.ecsInformation ? [
            'ecsValidity',
            'ecsExpiry'
        ] : [],
        vehicleInsuranceDetails: newDriver.typeOfDriver === 'Own Vehicle' ? [
            ...(!newDriver.ownVehicleInsuranceNA?.mvi ? [
                'insuranceProvider',
                'policyNumber',
                'policyStartDate',
                'policyEndDate',
            ] : []),
            ...(!newDriver.ownVehicleInsuranceNA?.goods ? [
                'insuranceProviderG',
                'policyNumberG',
                'policyStartDateG',
                'policyEndDateG',
            ] : []),
            ...(!newDriver.ownVehicleInsuranceNA?.public ? [
                'insuranceProviderP',
                'policyNumberP',
                'policyStartDateP',
                'policyEndDateP',
            ] : [])
        ] : [],
        selfEmploymentDetails: newDriver.employmentStatus === 'Limited Company' ? [
            'companyName',
            'companyRegAddress',
            'companyRegNo',
            'companyRegExpiry',
            ...(newDriver.companyVatDetails || newDriver.companytVatDetails?.compantVatNo !== '' ? ['companyVatEffectiveDate'] : [])

        ] : []
    };

    const fileFields = [
        'profilePicture',
        'ninoDocument',
        'signature',
        'drivingLicenseFrontImage',
        'drivingLicenseBackImage',
        'passportDocument',
        'ecsCard',
        'rightToWorkCard',
        'companyRegistrationCertificate',
        'MotorVehicleInsuranceCertificate',
        'GoodsInTransitInsurance',
        'PublicLiablity',
        'insuranceDocument'
    ];

    const objectFields = [
        "ownVehicleInsuranceNA",
        "vatDetails",
        "companyVatDetails",
        "customTypeOfDriver",
        "typeOfDriverTrace"
    ]


    const validateFields = () => {
        const newErrors = {};
        const currentTabFields = requiredFields[selectedTab] || [];

        currentTabFields.forEach((key) => {
            if (key === 'vatEffectiveDate') {
                if (!newDriver.vatDetails?.vatEffectiveDate) {
                    newErrors.vatEffectiveDate = true;
                }
            }
            else if (key === 'companyVatEffectiveDate') {
                if (!newDriver.companyVatDetails?.companyVatEffectiveDate) {
                    newErrors.companyVatEffectiveDate = true;
                }

            } else {
                const value = newDriver[key];
                if (typeof value === 'string' ? value.trim() === '' : !value) {
                    newErrors[key] = true;
                }
            }
        });


        // Validate email format
        if (selectedTab === 'personnelInfo' && newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(newDriver.Email)) {
            newErrors.Email = true;
        }

        if (selectedTab === 'personnelInfo' && newDriver.vatDetails?.vatNo !== '' && newDriver.vatDetails?.vatEffectiveDate === '') {
            newErrors.vatEffectiveDate = true
        }

        if (selectedTab === 'selfEmploymentDetails' && newDriver.companyVatDetails?.companyVatNo !== '' && newDriver.companyVatDetails?.companyVatEffectiveDate === '') {
            newErrors.companyVatEffectiveDate = true
        }

        // Validate sort code format
        if (selectedTab === 'bankDetails') {
            const sortCodeRegex = /^[0-9]{6}$/;
            if (newDriver.bankChoice === 'Personal' && newDriver.sortCode && !sortCodeRegex.test(newDriver.sortCode)) {
                newErrors.sortCode = true;
            }
            if (newDriver.bankChoice === 'Company' && newDriver.sortCodeCompany && !sortCodeRegex.test(newDriver.sortCodeCompany)) {
                newErrors.sortCodeCompany = true;
            }
        }

        setErrors(newErrors);

        // Scroll to the first error input
        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }

        return Object.keys(newErrors).length === 0;
    };

    const validateAllFields = () => {
        const newErrors = {};

        Object.keys(requiredFields).forEach(tab => {
            requiredFields[tab].forEach((key) => {
                if (key === 'vatEffectiveDate') {
                    if (!newDriver.vatDetails?.vatEffectiveDate) {
                        newErrors.vatEffectiveDate = true;
                    }
                }
                else if (key === 'companyVatEffectiveDate') {
                    if (!newDriver.companyVatDetails?.companyVatEffectiveDate) {
                        newErrors.companyVatEffectiveDate = true;
                    }

                } else {
                    const value = newDriver[key];
                    if (typeof value === 'string' ? value.trim() === '' : !value) {
                        newErrors[key] = true;
                    }
                }
            });
        });

        // Validate email format
        if (newDriver.Email && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(newDriver.Email)) {
            newErrors.Email = true;
        }

        // Validate sort code format
        const sortCodeRegex = /^[0-9]{6}$/;
        if (newDriver.bankChoice === 'Personal' && newDriver.sortCode && !sortCodeRegex.test(newDriver.sortCode)) {
            newErrors.sortCode = true;
        }
        if (newDriver.bankChoice === 'Company' && newDriver.sortCodeCompany && !sortCodeRegex.test(newDriver.sortCodeCompany)) {
            newErrors.sortCodeCompany = true;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    useEffect(() => {
        let updatedTabs = [...tabsInfo];

        // Add or remove Self Employment Details tab based on employment status
        if (newDriver.employmentStatus === 'Limited Company' && newDriver.typeOfDriver === 'Company Vehicle') {
            if (!updatedTabs.some(tab => tab.id === 'selfEmploymentDetails')) {
                updatedTabs.splice(1, 0, { id: 'selfEmploymentDetails', label: 'Self Employment Details', component: SelfEmploymentDetails });
            }
        } else {
            updatedTabs = updatedTabs.filter(tab => tab.id !== 'selfEmploymentDetails');
        }

        // Add or remove Vehicle Insurance Details tab based on vehicle type
        if (newDriver.typeOfDriver !== 'Own Vehicle') {
            updatedTabs = updatedTabs.filter(tab => tab.id !== 'vehicleInsuranceDetails');
        }
        else if (newDriver.typeOfDriver === 'Own Vehicle' && personnelMode === 'create') {
            setNewDriver(prev => ({ ...prev, employmentStatus: 'Sole Trader' }))
        }


        setTabs(updatedTabs);
    }, [newDriver.employmentStatus, newDriver.typeOfDriver]);

    const onInputChange = (e, inputValue, inputName) => {
        let name, value;

        if (e) {
            if (e.target.type === 'checkbox') {
                value = e.target.checked;
                name = e.target.name;
            } else if (e.target.type === 'file') {
                value = e.target.files[0] || '';
                name = e.target.name;
            } else {
                value = e.target.value;
                name = e.target.name;
            }
        } else {
            name = inputName;
            value = inputValue;
        }

        setErrors((prevErrors) => ({ ...prevErrors, [name]: false }));
        setNewDriver((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e, personnelMode) => {
        e.preventDefault();

        if (!validateAllFields()) {
            // Find the first tab with errors
            for (const tab of tabs) {
                const tabHasError = requiredFields[tab.id]?.some(field => errors[field]);
                if (tabHasError) {
                    setSelectedTab(tab.id);
                    break;
                }
            }
            return;
        }

        // Create FormData object
        const formData = new FormData();

        // Append all non-file fields
        Object.keys(newDriver).forEach(key => {
            if (!fileFields.includes(key) && !objectFields.includes(key)) {
                formData.append(key, newDriver[key] !== undefined && newDriver[key] !== null ? newDriver[key].toString() : '');
            }
        });

        // Append file fields
        fileFields.forEach(key => {
            if (newDriver[key] instanceof File) {
                formData.append(key, newDriver[key]);
            }
        });

        // Append ownVehicleInsuranceNA state
        if (newDriver.typeOfDriver === 'Own Vehicle') {
            formData.append('ownVehicleInsuranceNA', JSON.stringify(newDriver.ownVehicleInsuranceNA));
        }
        else if (newDriver.typeOfDriver === 'Company Vehicle' && newDriver.employmentStatus === 'Limited Company')
            formData.append('companyVatDetails', JSON.stringify(newDriver.companyVatDetails));

        formData.append('vatDetails', JSON.stringify(newDriver.vatDetails));
        formData.append(
            'customTypeOfDriver',
            JSON.stringify(newDriver.customTypeOfDriver || {})
        );

        formData.append(
            'typeOfDriverTrace',
            JSON.stringify(newDriver.typeOfDriverTrace || [])
        );


        if (personnelMode === 'create') {
            let userID = 0;
            try {
                const response = await axios.get(`${API_BASE_URL}/api/idcounter/Driver`);
                userID = response.data[0].counterValue;
            } catch (error) {
                console.error('Error Fetching ID Counter', error.response ? error.response.data : error.message);
            }
            const formattedUserID = userID.toString().padStart(6, '0');
            formData.append('user_ID', formattedUserID);
            try {
                const response = await dispatch(addDriver(formData));
                setPersonnelMode('view');
                setToastOpen({
                    content: <>
                        <SuccessTick width={17} height={17} />
                        <p className='text-sm font-bold text-green-600'>Personnel Added Successfully</p>
                    </>
                })
                setTimeout(() => {
                    setToastOpen(null)
                }, 2000);
                setNewDriver(clearDriver)
            } catch (error) {
                alert('Error adding driver');
            }
        }
        else if (personnelMode === 'edit') {
            try {
                await dispatch(updateDriver(formData)).unwrap();
                setPersonnelMode('view');
                setToastOpen({
                    content: <>
                        <SuccessTick width={17} height={17} />
                        <p className='text-sm font-bold text-green-600'>Personnel Updated Successfully</p>
                    </>
                })
                setTimeout(() => {
                    setToastOpen(null)
                }, 2000);
            } catch (error) {
                console.log(error)
                alert('Error updating driver', error);
            }
        }
    };

    const SelectedTabComponent = tabs.find(tab => tab.id === selectedTab)?.component;

    if (success) {
        return (
            <div className='flex flex-col h-full w-full items-center justify-center align-center'>
                <SuccessTick width='5rem' height='5rem' />
                <p className='flex mt-8 justify-center w-full text-green font-bold'>Personnel added successfully</p>
            </div>
        );
    }

    return (
        <>

            <div className='flex-1 p-2'>
                {/* Tabs Navigation */}
                <div className='flex justify-between overflow-x-auto snap-x snap-mandatory scrollbar-hide h-12 bg-primary-200/30 py-1 rounded-t-lg backdrop-blur-xl border border-primary-500'>
                    {tabs.filter((tab) => !['Admin', 'super-admin'].includes(userDetails.role) ? tab.id !== 'bankDetails' : true).map((tab, index) => (
                        <div
                            key={tab.id}
                            className={`flex justify-center m-1 w-full min-w-max dark:text-white snap-start ${index !== tabs.filter((tab) => !['Admin', 'super-admin'].includes(userDetails.role) ? tab.id !== 'bankDetails' : true).length - 1 ? 'border-r-2 border-primary-400' : ''}`}
                        >
                            <button
                                className={`${selectedTab === tab.id
                                    ? 'bg-white border-1 border-primary-400 shadow-lg dark:bg-primary-400'
                                    : 'hover:bg-primary-400/30 hover:rounded-md'
                                    } text-xs px-4 rounded-md transition mx-3`}
                                onClick={() => setSelectedTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Tab Content */}
                <div className='border-b border-x border-primary-300 rounded-b-lg'>
                    <SelectedTabComponent
                        newDriver={newDriver}
                        setNewDriver={setNewDriver}
                        onInputChange={onInputChange}
                        errors={errors}
                        setErrors={setErrors}
                        age={age}
                        setAge={setAge}
                        sites={sites}
                    />
                </div>
            </div>

            {/* Form Actions */}
            <div className='sticky bottom-0 bg-white flex justify-end items-center z-5 p-3 border-t border-neutral-200'>
                <div className='flex gap-3 text-sm'>
                    <button
                        onClick={() => {
                            if (validateFields()) {
                                // Find the next tab that's not the current one
                                const currentIndex = tabs.findIndex(tab => tab.id === selectedTab);
                                if (currentIndex < tabs.length - 1) {
                                    setSelectedTab(tabs[currentIndex + 1].id);
                                }
                            }
                        }}
                        className='bg-blue-500 rounded-md px-2 py-1 text-white'
                    >
                        Next
                    </button>
                    <button
                        onClick={(e) => handleSubmit(e, personnelMode)}
                        className='bg-green-500 rounded-md px-2 py-1 text-white'
                    >
                        {personnelMode === 'create' ? 'Add Personnel' : 'Update Personnel'}
                    </button>
                    <button
                        onClick={() => { setPersonnelMode('view'); setNewDriver(clearDriver) }}
                        className='bg-red-500 rounded-md px-2 py-1 text-white'
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
};

export default PersonnelForm;