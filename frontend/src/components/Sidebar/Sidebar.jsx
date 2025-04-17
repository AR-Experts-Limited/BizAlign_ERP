import React from 'react';
import { NavLink } from "react-router-dom";
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

    return (
        <div className={`h-full bg-neutral-200/60 overflow-auto w-60  border-r-2 border-primary-100/30  dark:bg-dark-3 dark:border-dark-4 transition duration-300 origin-left ${sidebarIsOpen ? '' : '-translate-x-60'} `}>
            <div className='mb-12'>
                <div className="flex flex-col h-full flex-nowrap gap-5 m-4 justify-around  dark:bg-dark-3 dark:border-dark-4 ">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `p-1 px-2 text-sm md:p-3 md:px-4 flex items-center  gap-2 rounded-md 
                    text-black dark:hover:bg-dark-5  hover:text-primary-500 hover:bg-primary-300/30 hover:shadow-md dark:text-white whitespace-nowrap
                    ${isActive ? "bg-primary-300 border border-primary-500  text-white shadow-lg" : ""}`
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