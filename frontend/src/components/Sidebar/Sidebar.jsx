import React from 'react';
import { NavLink } from "react-router-dom";
import { FcSurvey } from "react-icons/fc";
import { FcBusinessman } from "react-icons/fc";
import { FcCalculator } from "react-icons/fc";
import { FcSms } from "react-icons/fc";
import { FcClock } from "react-icons/fc";
import { FcPrint } from "react-icons/fc";
import { FcRules } from "react-icons/fc";
import { FcSalesPerformance } from "react-icons/fc";
import { FcLineChart } from "react-icons/fc";



import { IoIosNotificationsOutline } from "react-icons/io";
import { TbLayoutDashboard } from "react-icons/tb";
import { IoFileTrayFullOutline } from "react-icons/io5";
import { PiClockClockwiseLight } from "react-icons/pi";
import { CiCircleMinus } from "react-icons/ci";
import { BsCalendarDate } from "react-icons/bs";
import { FiUsers, FiX, FiMenu } from "react-icons/fi";
import { HiOutlineListBullet } from "react-icons/hi2";
import { CiCirclePlus } from "react-icons/ci";
import { MdAccessTime } from "react-icons/md";
import { BiMoneyWithdraw } from "react-icons/bi";
import { BiPrinter } from "react-icons/bi";
import { BiLineChart } from "react-icons/bi";
import { BiStation } from "react-icons/bi";

const Sidebar = ({ sidebarIsOpen }) => {

    const menuItems = [
        { path: "/dashboard", name: "Dashboard", icon: <FcSurvey size={20} /> },
        { path: "/manage-drivers", name: "Manage Drivers", icon: <FcBusinessman size={20} /> },
        { path: "/rate-card", name: "Rate Cards", icon: <FcCalculator size={20} /> },
        { path: "/notifications", name: "Notifications", icon: <FcSms size={20} /> },
        { path: "/planner", name: "Schedule Planner", icon: <img src='/sidebar_icons/schedule.png' className='h-5 w-5' /> },
        { path: "/live-operations", name: "Live Operations", icon: <BiStation className='text-blue-500' size={20} /> },
        { path: "/rota", name: "Rota", icon: <img src='/sidebar_icons/clipboard.png' className='h-5 w-5' /> },
        { path: "/working-hours", name: "Working Hours", icon: <FcClock size={20} /> },
        { path: "/installments", name: "Installments", icon: <img src='/sidebar_icons/loan.png' className='h-5 w-5' /> },
        { path: "/deductions", name: "Deductions", icon: <img src='/sidebar_icons/tax.png' className='h-5 w-5' /> },
        { path: "/incentives", name: "Incentives", icon: <img src='/sidebar_icons/benefit.png' className='h-5 w-5' /> },
        { path: "/manage-summary", name: "Manage Summary", icon: <FcRules size={20} /> },
        { path: "/manage-payments", name: "Manage Payments", icon: <FcSalesPerformance size={20} /> },
        { path: "/print-invoices", name: "Print Invoices", icon: <FcPrint size={20} /> },
        { path: "/profit-loss", name: "Profit / Loss", icon: <FcLineChart size={20} /> },
    ];

    return (
        <div className={`h-full bg-neutral-300/80 dark:bg-dark-3 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)]  overflow-auto w-60  transition duration-300 origin-left ${sidebarIsOpen ? '' : '-translate-x-60'} `}>
            <div className='mb-12'>
                <div className="flex flex-col h-full flex-nowrap gap-3 m-4 justify-around  dark:bg-dark-3 dark:border-dark-4 ">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `p-1 px-2 text-sm md:p-3 md:px-4 flex items-center  gap-3 rounded-md 
                    text-black dark:hover:bg-dark-5  hover:text-primary-500 hover:bg-primary-300/30 hover:shadow-md dark:text-white whitespace-nowrap
                    ${isActive ? "bg-primary-700 border border-primary-500  text-white shadow-lg" : ""}`
                            }
                        >
                            {item.icon} {item.name}
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;