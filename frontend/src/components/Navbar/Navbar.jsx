import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice'

import { IoChevronDown } from "react-icons/io5";
import { PiBell } from "react-icons/pi";
import { IoIosNotificationsOutline } from "react-icons/io";
import { TbLayoutDashboard } from "react-icons/tb";
import { IoFileTrayFullOutline } from "react-icons/io5";
import { PiClockClockwiseLight } from "react-icons/pi";
import { CiCircleMinus } from "react-icons/ci";
import { BsCalendarDate } from "react-icons/bs";
import { FiSettings, FiLock, FiLogOut, FiUsers } from 'react-icons/fi';
import { HiOutlineListBullet } from "react-icons/hi2";
import { CiCirclePlus } from "react-icons/ci";
import { MdAccessTime } from "react-icons/md";
import { BiMoneyWithdraw } from "react-icons/bi";
import { BiPrinter } from "react-icons/bi";
import { BiLineChart } from "react-icons/bi";
import { IoChevronForward } from "react-icons/io5";
import { BiStation } from "react-icons/bi";
import { FaCalendarDays } from "react-icons/fa6";


const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: <TbLayoutDashboard size={20} /> },
    { path: "/manage-drivers", name: "Manage Drivers", icon: <FiUsers size={20} /> },
    { path: "/rate-card", name: "Rate Cards", icon: <IoFileTrayFullOutline size={20} /> },
    { path: "/notifications", name: "Notifications", icon: <IoIosNotificationsOutline size={20} /> },
    { path: "/planner", name: "Schedule Planner", icon: <BsCalendarDate size={20} /> },
    { path: "/live-operations", name: "Live Operations", icon: <BiStation size={20} /> },
    { path: "/rota", name: "Rota", icon: <PiClockClockwiseLight size={20} /> },
    { path: "/working-hours", name: "Working Hours", icon: <MdAccessTime size={20} /> },
    { path: "/installments", name: "Installments", icon: <BiMoneyWithdraw size={20} /> },
    { path: "/deductions", name: "Deductions", icon: <CiCircleMinus size={20} /> },
    { path: "/incentives", name: "Incentives", icon: <CiCirclePlus size={20} /> },
    { path: "/manage-summary", name: "Manage Summary", icon: <HiOutlineListBullet size={20} /> },
    { path: "/manage-payments", name: "Manage Payments", icon: <span className='manage-payments-symbol'>£</span> },
    { path: "/print-invoices", name: "Print Invoices", icon: <BiPrinter size={20} /> },
    { path: "/profit-loss", name: "Profit / Loss", icon: <BiLineChart size={20} /> },
];




const Navbar = ({ sidebarIsOpen, setSidebarIsOpen }) => {
    const [userOptionsOpen, setUserOptionsOpen] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { userDetails } = useSelector((state) => state.auth);

    return (
        <div className="navbar z-20 p-2 md:p-5 flex items-center justify-between h-18 bg-white w-screen border-b border-primary-300/60 dark:bg-dark dark:text-white">
            <div className="flex-1 "><button className={`rounded-lg p-2 hover:bg-neutral-200 hover:text-white`} onClick={() => setSidebarIsOpen(prev => !prev)} ><IoChevronForward
                className={`transform transition duration-500 ${sidebarIsOpen ? 'rotate-180' : ''}`}
                size={20}
            /></button></div>
            <div>
                <img className="h-5 w-10 md:h-9 md:w-18" src="/Asset_4.png" />
            </div>

            <div className="relative flex-1 flex gap-3 items-center justify-end">
                <div className="text-xs md:text-lg h-8 w-8 md:h-11 md:w-11 flex justify-center items-center bg-neutral-100 text-black border border-neutral-200 rounded-full hover:text-primary-500 dark:text-white dark:bg-dark-3 dark:border-dark-4">
                    <FaCalendarDays size={15} />
                </div>
                <div className="text-xs md:text-lg h-8 w-8 md:h-11 md:w-11 flex justify-center items-center bg-neutral-100 text-black border border-neutral-200 rounded-full hover:text-primary-500 dark:text-white dark:bg-dark-3 dark:border-dark-4">
                    <PiBell size={16} />
                </div>
                <div className="text-xs md:text-lg h-8 w-8 md:h-11 md:w-11 flex justify-center items-center rounded-full bg-black text-white">
                    SR
                </div>

                <div className="flex flex-col gap-1 group">
                    <p className="text-xs hidden md:block">{userDetails?.userName}</p>
                    <div className="flex gap-1 items-center justify-between">
                        <span className="hidden md:block text-xs bg-primary-300 text-white rounded-md px-1.5 py-0.5">{userDetails?.role}</span>
                        <button onClick={() => setUserOptionsOpen(prev => !prev)} className={`rounded-md p-1 hover:bg-neutral-200 hover:text-white`}>
                            <IoChevronDown className={`transform transition duration-500 ${userOptionsOpen ? 'rotate-180' : ''}`} size={15} />
                        </button>
                    </div>

                    <div id="userOptions" className={`flex flex-col absolute top-9 md:top-12 right-0 bg-white/80 shadow-lg backdrop-blur-sm rounded-lg border-2 border-neutral-200 transition-all duration-300 origin-top-right transform ${userOptionsOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                        <div className="flex flex-col p-1 md:p-2">
                            <button onClick={() => navigate('/my-profile')} className={`hover:bg-zinc-300/70 rounded-md p-2 text-xs md:text-sm w-full flex  items-center gap-2`}>
                                <FiUsers size={15} /> View Profile
                            </button>
                            <button onClick={() => navigate('/update-password')} className={`hover:bg-zinc-300/70 rounded-md p-2 text-xs md:text-sm w-full flex  items-center gap-2`}>
                                <FiLock size={15} /> Update Password
                            </button>
                            <button onClick={() => navigate('/settings')} className={`hover:bg-zinc-300/70 rounded-md p-2 text-xs md:text-sm w-full flex  items-center gap-2`}>
                                <FiSettings size={15} /> Account Settings
                            </button>
                        </div>
                        <div className="p-1 md:p-2 border-t border-neutral-300">
                            <button onClick={() => dispatch(logout())} className={`hover:text-red-500 hover:bg-zinc-300/70 rounded-md p-2 text-xs md:text-sm w-full flex  items-center gap-2`}>
                                <FiLogOut size={15} /> Log out
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default Navbar;
