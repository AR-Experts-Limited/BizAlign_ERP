import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios'
import Spinner from '../../components/UIElements/Spinner'
import InputGroup from '../../components/InputGroup/InputGroup';
const API_BASE_URL = import.meta.env.VITE_API_URL;
import { IoEye } from "react-icons/io5";
import { IoEyeOff } from "react-icons/io5";
import SuccessTick from '../../components/UIElements/SuccessTick';

const UpdatePassword = () => {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [checkPassword, setCheckPassword] = useState('')
    const [showPass, setShowPass] = useState({ oldPass: false, newPass: false, confirmPass: false })
    const [toastOpen, setToastOpen] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setErrors] = useState({})
    const { userDetails } = useSelector((state) => state.auth);

    const validateFields = () => {
        let newErrors = {}

        if (!oldPassword)
            newErrors['oldPassword'] = 'Please enter your old password'
        if (!newPassword)
            newErrors['newPassword'] = true

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const checkOldPassword = async () => {
        if (!validateFields())
            return
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/updatepassword`, {
                email: userDetails.email,
                oldPassword: oldPassword,
                newPassword: newPassword
            })
            setToastOpen({
                content: <>
                    <SuccessTick width={22} height={22} />
                    <p className='text-sm font-bold text-green-500'>Password updated successfully</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);

        }
        catch (error) {
            if (error.status == 400) {
                setErrors(prev => ({ ...prev, oldPassword: 'wrong password entered' }))
            }
            else {
                setErrors(prev => ({ ...prev, oldPassword: false }))
                setToastOpen({
                    content: <>
                        <p className='text-sm font-bold text-red-500'>Error updating successfully</p>
                    </>
                })
            }
        }
        finally {
            setOldPassword('')
            setNewPassword('')
            setCheckPassword('')
        }
    }
    useEffect(() => {
        const checkNewPassword = () => {
            setErrors(prev => ({ ...prev, checkPassword: (checkPassword !== newPassword) ? "password doesn't match" : false }))
        }
        checkNewPassword()
    }, [newPassword, checkPassword])

    return (
        <div className="flex p-6 h-full w-full">
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-4 justify-around items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <div className={`${loading ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 text-gray-500 justify-around items-center'>
                    <Spinner /> Processing...
                </div>
            </div>
            <div className='flex flex-col bg-white rounded-lg border border-neutral-300 shadow h-fit w-200'>
                <div className='p-3 border-b border-neutral-300'><h1 className='text-lg font-bold'>Update Password</h1></div>
                <div className='flex flex-col gap-8 p-6'>
                    <div>
                        <div className='relative'>
                            <InputGroup label='Old password' value={oldPassword} error={error?.oldPassword} required={true} type={`${showPass.oldPass ? 'text' : 'password'}`} onChange={(e) => { setOldPassword(e.target.value); setErrors(prev => ({ ...prev, oldPassword: false })) }} />
                            <div className='cursor-pointer absolute text-stone-400 bottom-[1rem] right-5' onClick={() => setShowPass(prev => ({ ...prev, oldPass: !prev.oldPass }))}>{showPass.oldPass ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
                        </div>
                        {error?.oldPassword && <div className='text-sm text-red-400'>*{error?.oldPassword}</div>}
                    </div>
                    <div>
                        <div className='relative'>
                            <InputGroup label='New password' value={newPassword} error={error?.newPassword} required={true} type={`${showPass.newPass ? 'text' : 'password'}`} onChange={(e) => { setNewPassword(e.target.value); setErrors(prev => ({ ...prev, newPassword: false })) }} />
                            <div className='cursor-pointer absolute text-stone-400 bottom-[1rem] right-5' onClick={() => setShowPass(prev => ({ ...prev, newPass: !prev.newPass }))}>{showPass.newPass ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
                        </div>
                        {error?.newPassword && <div className='text-sm text-red-400'>*please enter your new password</div>}
                    </div>
                    <div>
                        <div className='relative'>
                            <InputGroup label='Confirm New password' value={checkPassword} error={error?.checkPassword} required={true} type={`${showPass.checkPass ? 'text' : 'password'}`} onChange={(e) => { setCheckPassword(e.target.value); }} />
                            <div className='cursor-pointer absolute text-stone-400 bottom-[1rem] right-5' onClick={() => setShowPass(prev => ({ ...prev, checkPass: !prev.checkPass }))}>{showPass.checkPass ? <IoEyeOff size={20} /> : <IoEye size={20} />}</div>
                        </div>
                        {error?.checkPassword && <div className='text-sm text-red-400'>*{error?.checkPassword}</div>}
                    </div>
                </div>

                <div className='flex justify-end border-t border-neutral-300 p-3 mt-3'>
                    <button className='bg-primary-500 text-white rounded px-2 py-1 disabled:bg-gray-300' disabled={Object.values(error).some((err) => err)} type='button' onClick={() => checkOldPassword()}>Update Password</button>
                </div>
            </div >
        </div >


    )
}

export default UpdatePassword;