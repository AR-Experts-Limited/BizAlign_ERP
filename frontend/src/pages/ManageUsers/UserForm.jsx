import React, { useState, useEffect } from 'react';
import InputGroup from '../../components/InputGroup/InputGroup';
import { useSelector } from 'react-redux';
import SuccessTick from '../../components/UIElements/SuccessTick';
import TrashBin from '../../components/UIElements/TrashBin';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_URL;


const menuItems = [
    "Manage Personnels",
    "Rate Cards",
    "Notifications",
    "Approvals",
    "Schedule Planner",
    "Live Operations",
    "Rota",
    "Working Hours",
    "Installments",
    "Deductions",
    "Incentives",
    "Manage Summary",
    "Manage Payments",
    "Additional Charges",
    "Print Invoices",
    "Profit / Loss",
    "Application Settings"
];

const userHierarchy = {
    'super-admin': { rank: 1, display: 'Super Admin', restrictAccess: [] },
    'Admin': { rank: 2, display: 'Admin', restrictAccess: [] },
    'Compliance': { rank: 3, display: 'Compliance', restrictAccess: ['Approvals', 'Manage Payments', , 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings'] },
    'Head of Operations': { rank: 4, display: 'Head of Operations', restrictAccess: [] },
    'Operational Manager': { rank: 4, display: 'Operational Manager', restrictAccess: [] },
    'OSM': { rank: 5, display: 'On-site Manager', restrictAccess: ['Rate Cards', 'Approvals', 'Manage Personnels', 'Manage Payments', 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings'] },
};

const isPrivileged = (userA_Role, userB_Role) => {
    if (userA_Role === 'super-admin')
        return true
    return userHierarchy[userA_Role]?.rank < userHierarchy[userB_Role]?.rank
}

export const UserForm = ({ clearUser, states, setters }) => {
    const { user, userMode, allUsers, sites } = states
    const { userDetails: currentUser } = useSelector((state) => state.auth);

    const { setUser, setUserMode, setAllUsers, setToastOpen } = setters
    const [errors, setErrors] = useState({})


    const validateFields = () => {
        const fieldsToValidate = ['firstName', 'lastName', 'email', 'role'];
        const newErrors = {};

        fieldsToValidate.forEach(field => {
            if (!user[field] || user[field].trim() === '') newErrors[field] = true;
            if (field === 'email' && !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(user[field]))
                newErrors[field] = true
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return true
        }
        else
            return false

    }

    const handleAddUser = async () => {

        if (validateFields())
            return
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
                ...user, password: user.email.split('@')[0]
            })
            setAllUsers(prev => [...prev, res.data.user])
            setUser(clearUser)
            setUserMode('view')
            setToastOpen({
                content: <>
                    <SuccessTick width={16} height={16} />
                    <p className='text-sm font-bold text-green-600'> User added Successfully</p>
                </>
            })
        }
        catch (error) {
            setToastOpen({
                content: <>
                    <TrashBin type={'error'} width={18} height={18} />
                    <p className='text-sm font-bold text-red-600'>Error creating user</p>
                </>
            })
        }
        setTimeout(() => setToastOpen(null), 3000)
    }

    const handleUpdateUser = async () => {
        if (validateFields())
            return
        try {
            const updatedUser = await axios.put(`${API_BASE_URL}/api/auth/${encodeURIComponent(user._id)}`, user)
            setAllUsers(prev => (prev.map((u) => {
                if (u._id === user._id)
                    return user
                else
                    return u
            })))
            setUser(clearUser)
            setUserMode('view')
            setToastOpen({
                content: <>
                    <SuccessTick width={16} height={16} />
                    <p className='text-sm font-bold text-green-600'> User updated Successfully</p>
                </>
            })
        }
        catch (error) {
            setToastOpen({
                content: <>
                    <TrashBin type={'error'} width={18} height={18} />
                    <p className='text-sm font-bold text-red-600'>Error Updating user</p>
                </>
            })
        }
        setTimeout(() => setToastOpen(null), 2000)
    }



    return (<>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 p-4'>
            <div className='h-full flex flex-col gap-3'>
                <div>
                    <InputGroup required={true} value={user.firstName} error={errors.firstName} onChange={(e) => { setErrors(prev => ({ ...prev, firstName: false })); setUser(prev => ({ ...prev, firstName: e.target.value })) }} type='text' label='First Name' />
                    {errors.firstName && <div className='text-sm text-red-400'>*please enter first name</div>}
                </div>
                <div>
                    <InputGroup required={true} value={user.lastName} error={errors.lastName} onChange={(e) => { setErrors(prev => ({ ...prev, lastName: false })); setUser(prev => ({ ...prev, lastName: e.target.value })) }} type='text' label='Last Name' />
                    {errors.lastName && <div className='text-sm text-red-400'>*please enter last name</div>}
                </div>
                <div>
                    <InputGroup required={true} value={user.email} error={errors.email} onChange={(e) => { setErrors(prev => ({ ...prev, email: false })); setUser(prev => ({ ...prev, email: e.target.value })) }} type='email' label='Email' />
                    {errors.email && <div className='text-sm text-red-400'>*please enter a valid email</div>}
                </div>
                <div>
                    <InputGroup className={`${user.role === '' && 'text-gray-400'}`} required={true} value={user.role} error={errors.role} type='dropdown' label='Select Role' onChange={(e) => setUser(prev => ({ ...prev, role: e.target.value, access: ["Dashboard", ...menuItems.filter((item) => !(userHierarchy[e.target.value]?.restrictAccess.includes(item)))] }))}>
                        <option disabled value=''>Select Role</option>
                        {Object.keys(userHierarchy).map((userRole) => {
                            return isPrivileged(currentUser.role, userRole)
                                && <option value={userRole}>{userHierarchy[userRole].display}</option>
                        })}
                    </InputGroup>
                    {errors.role && <div className='text-sm text-red-400'>*please select a role</div>}
                </div>
                {user.role === 'OSM' && <div>
                    <InputGroup required={true} value={user.site} type='dropdown' label='Select Site' onChange={(e) => setUser(prev => ({ ...prev, site: e.target.value }))}>
                        {sites.map((site) => (
                            <option value={site.siteKeyword}>{site.siteName}</option>
                        ))}
                    </InputGroup>
                </div>}
            </div>
            <div className='h-full md:px-10'>
                <div className='border border-neutral-200 rounded-lg overflow-hidden md:overflow-auto md:max-h-[33rem]'>
                    <table className='table-general'>
                        <thead>
                            <tr className='md:sticky md:top-0  bg-primary-800 text-white'>
                                <th>Pages</th>
                                <th>Access</th>
                            </tr>
                        </thead>
                        <tbody>
                            {menuItems.map((item) => (
                                <tr>
                                    <td>{item}</td>
                                    <td>
                                        <input type='checkbox'
                                            onChange={(e) => {
                                                if (e.target.checked)
                                                    setUser(prev => ({ ...prev, access: [...prev.access, item] }))
                                                else
                                                    setUser(prev => ({ ...prev, access: prev.access.filter((accessItem) => !(accessItem === item)) }))
                                            }
                                            }
                                            disabled={userHierarchy[user.role]?.restrictAccess.includes(item)}
                                            checked={user.access.includes(item)}
                                            className='h-4 w-4 accent-primary-400 rounded focus:ring-primary-400'
                                        />
                                    </td>
                                </tr>))}

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className='flex flex-1 justify-end items-center p-5 border-t border-neutral-200'>
            <div className='flex gap-3 text-sm'>
                <button onClick={() => { userMode === ('create') ? handleAddUser() : handleUpdateUser() }} className='bg-green-500 rounded-md px-2 py-1 text-white'>{userMode === 'create' ? 'Add User' : 'Update User'}</button>
                <button onClick={() => { setUserMode('view'); setUser(clearUser) }} className='bg-red-500 rounded-md  px-2 py-1 text-white'>Cancel</button>
            </div>
        </div>
    </>)
}