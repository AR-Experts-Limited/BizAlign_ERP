import React, { useState } from 'react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { UserForm } from './UserForm';
import { UsersTable } from './UsersTable';
import { fetchSites } from '../../features/sites/siteSlice';
import SuccessTick from '../../components/UIElements/SuccessTick';
import Modal from '../../components/Modal/Modal'
import InputGroup from '../../components/InputGroup/InputGroup';
import TrashBin from '../../components/UIElements/TrashBin';


const API_BASE_URL = import.meta.env.VITE_API_URL;

const userHierarchy = {
    'super-admin': { rank: 1, display: 'Super Admin', restrictAccess: [] },
    'Admin': { rank: 2, display: 'Admin', restrictAccess: [] },
    'Compliance': { rank: 3, display: 'Compliance', restrictAccess: ['Approvals', 'Manage Payments', 'Deductions', 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings', 'Manage Users'] },
    'Head of Operations': { rank: 4, display: 'Head of Operations', restrictAccess: ['Manage Payments', 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings', 'Manage Users'] },
    'Operational Manager': { rank: 4, display: 'Operational Manager', restrictAccess: ['Manage Payments', 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings', 'Manage Users'] },
    'OSM': { rank: 5, display: 'On-site Manager', restrictAccess: ['Rate Cards', 'Approvals', 'Manage Personnels', 'Manage Payments', 'Additional Charges', 'Print Invoices', 'Profit / Loss', 'Application Settings', 'Manage Users'] },
};

const isPrivileged = (userA_Role, userB_Role) => {
    if (userA_Role === 'super-admin')
        return true
    return userHierarchy[userA_Role]?.rank < userHierarchy[userB_Role]?.rank
}

const ManageUsers = () => {
    const { userDetails: currentUser } = useSelector((state) => state.auth);
    const [userMode, setUserMode] = useState('view')
    const clearUser = {
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        access: ['Dashboard']
    }
    const dispatch = useDispatch()
    const [user, setUser] = useState(clearUser)
    const { list: sites, siteStatus } = useSelector((state) => state.sites)
    const [allUsers, setAllUsers] = useState([])
    const [toastOpen, setToastOpen] = useState(null)
    const [deleteInput, setDeleteInput] = useState('')
    const [deleteUserDetails, setDeleteUserDetails] = useState(null)

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [siteStatus, dispatch])

    useEffect(() => {
        const getUsers = async () => {
            var users;
            try {
                users = await axios.get(`${API_BASE_URL}/api/auth/`)
                setAllUsers([users.data.find((user) => user._id === currentUser.id), ...users.data.filter((user) => user._id !== currentUser.id)])
            }
            catch (error) {
                console.error('error fetching users')
            }
        }
        getUsers()
    }, [])

    const handleDeleteUser = async (user) => {

        try {
            await axios.delete(`${API_BASE_URL}/api/auth/${encodeURIComponent(user._id)}`)
            setAllUsers(prev => prev.filter((u) => (u._id !== user._id)))
            setDeleteUserDetails(null)
            setDeleteInput('')
            setToastOpen({
                content: <>
                    <TrashBin width={22} height={22} />
                    <p className='text-sm font-bold text-red-600'> User deleted successfully</p>
                </>
            })
        }
        catch (error) {
            setDeleteUserDetails(null)
            setToastOpen({
                content: <>
                    <p> error deleting user</p>
                </>
            })
        }
        setTimeout(() => setToastOpen(null), 3000)

    }

    const handleDeleteReq = async (delReqOSM) => {
        const updatedOSM = { ...delReqOSM, delReqStatus: "Requested" };
        try {
            const response = await axios.put(`${API_BASE_URL}/api/auth/${delReqOSM._id}`, updatedOSM);
            setAllUsers(prev => prev.map(user => user._id == updatedOSM._id ? { ...user, delReqStatus: 'Requested' } : user));
            const approvalResponse = await axios.post(`${API_BASE_URL}/api/approvals`, {
                type: "osmDelete",
                reqData: { userID: delReqOSM._id, details: "OSM deletion requested for: \n" + delReqOSM.firstName + ' ' + delReqOSM.lastName + ',Email Id:' + delReqOSM.email + ' by ' + currentUser.userName },
            })
            setDeleteUserDetails(null)
            setToastOpen({
                content: <>
                    <SuccessTick width={16} height={16} />
                    <p className='text-sm font-bold text-green-600'> OSM delete access request has been sent</p>
                </>
            })
        }
        catch (error) {
            console.error(error);
        }
        setTimeout(() => setToastOpen(null), 3000)
    }

    const handleEditUser = (user) => {
        setUser(user);
        setUserMode('edit')
    }

    const canEditUser = (user) => {
        return currentUser?.id !== user?._id && isPrivileged(currentUser?.role, user?.role)
    }

    const initiateDeleteUser = (user) => {
        setDeleteUserDetails(user)
    }


    return (
        <div className='flex flex-col w-full h-full p-3.5'>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <h2 className='text-xl mb-3 font-bold dark:text-white'>Manage Users</h2>
            <div className='flex flex-col w-full h-full bg-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='z-15 sticky top-0 flex justify-between items-center bg-white/60 backdrop-blur-md p-3 rounded-t-lg border-b border-neutral-200'>
                    <div>{userMode === 'create' ? 'Add User' : 'Users List'}</div>
                    {userMode === 'view' &&
                        <div>
                            <button onClick={() => setUserMode('create')} className='text-white bg-green-500 rounded-md text-sm px-2 py-1'>Add User</button>
                        </div>
                    }
                </div>
                {userMode === 'create' || userMode === 'edit' ?
                    <UserForm
                        clearUser={clearUser}
                        userHierarchy={userHierarchy}
                        isPrivileged={isPrivileged}
                        states={{ user, userMode, allUsers, sites }}
                        setters={{ setUserMode, setUser, setAllUsers, setToastOpen }}
                    />
                    : <UsersTable
                        allUsers={allUsers}
                        handleEditUser={handleEditUser}
                        initiateDeleteUser={initiateDeleteUser}
                        canEditUser={canEditUser} />}
            </div>
            <Modal isOpen={deleteUserDetails}>
                <div className='max-w-120 max-h-75 p-6'>
                    {(() => {
                        if (deleteUserDetails?.delReqStatus === '' && currentUser.role !== 'super-admin') {
                            return (
                                <>
                                    <p>Delete User?</p>
                                    <p className='text-sm italic'>You need additional permission to delete an OSM. Request for delete access below:</p>
                                    <div className='flex gap-2 justify-end m-2'>
                                        <button onClick={() => setDeleteUserDetails(null)} className='bg-amber-500 text-white text-xs border-1 border-amber-500 rounded-lg p-1 hover:bg-white hover:text-amber-500 dark:hover:bg-dark-4'>Cancel</button>
                                        <button onClick={() => handleDeleteReq(deleteUserDetails)} className='disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-neutral-100 bg-red border-1 border-red-500 p-1 rounded-md text-white text-sm hover:bg-white hover:text-red-500'>Request Access</button>
                                    </div>
                                </>
                            )
                        }
                        else if (deleteUserDetails?.delReqStatus === 'Requested' && currentUser.role !== 'super-admin') {
                            return (<>
                                <p>Delete User?</p>
                                <p className='my-3 text-sm italic'>Deletion Request has been sent and is waiting for approval</p>
                                <div className='flex gap-2 justify-end'>
                                    <button onClick={() => setDeleteUserDetails(null)} className='bg-amber-500 text-white text-xs border-1 border-amber-500 rounded-lg p-1 hover:bg-white hover:text-amber-500 dark:hover:bg-dark-4'>Close</button>
                                </div>
                            </>)
                        }
                        else
                            return (<>
                                <p>Delete User?</p>
                                <p className='text-sm italic'>Warning, user deletion cannot be undone. Type "Permanently delete" to proceed.</p>
                                <InputGroup type='text' onChange={(e) => setDeleteInput(e.target.value)} />
                                <div className='flex gap-2 justify-end m-2'>
                                    <button onClick={() => setDeleteUserDetails(null)} className='bg-amber-500 text-white text-xs border-1 border-amber-500 rounded-lg p-1 hover:bg-white hover:text-amber-500 dark:hover:bg-dark-4'>Cancel</button>
                                    <button onClick={() => handleDeleteUser(deleteUserDetails)} disabled={deleteInput !== "Permanently delete"} className='disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-neutral-100 bg-red border-1 border-red-500 p-1 rounded-md text-white text-sm hover:bg-white hover:text-red-500'>Delete</button>
                                </div>
                            </>
                            )
                    })()}
                </div>
            </Modal >
        </div >
    );
};

export default ManageUsers;