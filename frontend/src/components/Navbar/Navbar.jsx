import React from "react";
import { NavLink } from "react-router-dom";
import { IoChevronDown } from "react-icons/io5";
import { PiBell } from "react-icons/pi";
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
    return (
        <div className="navbar z-20 p-2 md:p-5 flex items-center justify-between h-18 bg-neutral-50 w-screen border-b-2 border-primary-400/30 dark:bg-dark dark:text-white">
            <div><button className={`rounded-lg p-2 hover:bg-neutral-200 hover:text-white`} onClick={() => setSidebarIsOpen(prev => !prev)} ><IoChevronForward
                className={`transform transition duration-500 ${sidebarIsOpen ? 'rotate-180' : ''}`}
                size={20}
            /></button></div>
            <div>
                <img className="h-5 w-40 md:h-8 md:w-60" src="/Asset_8.png" />
            </div>
            {/* <div className="navmenu flex flex-nowrap gap-2 overflow-auto justify-around p-1 mx-12 bg-neutral-100 border border-neutral-200 rounded-3xl dark:bg-dark-3 dark:border-dark-4 ">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `p-1 px-2 text-sm md:p-2 md:px-4 flex items-center gap-1 rounded-3xl 
                    text-black dark:hover:bg-dark-5 hover:bg-white hover:text-primary-500 hover:shadow-lg transition-all dark:text-white whitespace-nowrap
                    ${isActive ? "bg-primary-500 text-white shadow-lg" : ""}`
                        }
                    >
                        {item.icon} {item.name}
                    </NavLink>
                ))}
            </div> */}
            <div className="flex gap-3 items-center">
                <div className="text-xs md:text-lg h-8 w-8 md:h-12 md:w-12 flex justify-center items-center bg-neutral-100 text-black border border-neutral-200 rounded-full hover:text-primary-500 dark:text-white dark:bg-dark-3 dark:border-dark-4">
                    <FaCalendarDays size={17} />
                </div>
                <div className="text-xs md:text-lg h-8 w-8 md:h-12 md:w-12 flex justify-center items-center bg-neutral-100 text-black border border-neutral-200 rounded-full hover:text-primary-500 dark:text-white dark:bg-dark-3 dark:border-dark-4">
                    <PiBell size={18} />
                </div>
                <div className="text-xs md:text-lg h-8 w-8 md:h-12 md:w-12 flex justify-center items-center rounded-full bg-black text-white">
                    SR
                </div>
                <p className="hidden md:block">Sanjaykumar</p>
                <IoChevronDown className="hidden md:block" size={18} />
            </div>
        </div>
    );
};

export default Navbar;
