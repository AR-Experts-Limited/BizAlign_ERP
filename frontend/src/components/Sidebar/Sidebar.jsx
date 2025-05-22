import React, { useState, useEffect } from 'react';
import { NavLink } from "react-router-dom";
import * as Tooltip from '@radix-ui/react-tooltip';
import { FcSurvey, FcBusinessman, FcCalculator, FcSms, FcClock, FcPrint, FcRules, FcSalesPerformance, FcLineChart, FcBusinessContact } from "react-icons/fc";
import { BiStation } from "react-icons/bi";

const Sidebar = ({ sidebarIsOpen }) => {
    const [delayedPointerEnabled, setDelayedPointerEnabled] = useState(false);

    useEffect(() => {
        let timeout;
        setDelayedPointerEnabled(true);
        timeout = setTimeout(() => {
            setDelayedPointerEnabled(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [sidebarIsOpen]);

    const menuItems = [
        { path: "/dashboard", name: "Dashboard", icon: <FcSurvey size={22} /> },
        { path: "/manage-personnels", name: "Manage Personnels", icon: <FcBusinessman size={20} /> },
        { path: "/rate-card", name: "Rate Cards", icon: <FcCalculator size={22} /> },
        { path: "/notifications", name: "Notifications", icon: <FcSms size={20} /> },
        { path: "/planner", name: "Schedule Planner", icon: <img src='/sidebar_icons/schedule.png' className='h-5 w-5' alt="schedule" /> },
        { path: "/live-operations", name: "Live Operations", icon: <BiStation className='text-blue-500' size={20} /> },
        { path: "/rota", name: "Rota", icon: <img src='/sidebar_icons/clipboard.png' className='h-5 w-5' alt="rota" /> },
        { path: "/working-hours", name: "Working Hours", icon: <FcClock size={20} /> },
        { path: "/installments", name: "Installments", icon: <img src='/sidebar_icons/loan.png' className='h-5 w-5' alt="installments" /> },
        { path: "/deductions", name: "Deductions", icon: <img src='/sidebar_icons/tax.png' className='h-5 w-5' alt="deductions" /> },
        { path: "/incentives", name: "Incentives", icon: <img src='/sidebar_icons/benefit.png' className='h-5 w-5' alt="incentives" /> },
        { path: "/manage-summary", name: "Manage Summary", icon: <FcRules size={20} /> },
        { path: "/manage-payments", name: "Manage Payments", icon: <FcSalesPerformance size={20} /> },
        { path: "/print-invoices", name: "Print Invoices", icon: <FcPrint size={20} /> },
        { path: "/profit-loss", name: "Profit / Loss", icon: <FcLineChart size={20} /> },
        { path: "/manage-users", name: "Manage users", icon: <FcBusinessContact size={20} /> },

    ];

    return (
        <div
            className={`h-full bg-neutral-300/80 dark:bg-dark-3 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.1)] overflow-auto transition-all duration-300 origin-left
        ${sidebarIsOpen ? 'w-40 md:w-60' : 'w-0 md:w-17'}
      ${delayedPointerEnabled ? 'pointer-events-none' : ''}`}
        >
            <div className='mb-12'>
                <div className="flex flex-col h-full gap-5 md:gap-3 m-2">
                    <Tooltip.Provider delayDuration={500}>
                        {menuItems.map((item) => (
                            <Tooltip.Root key={item.path}>
                                <Tooltip.Trigger asChild>
                                    <div>
                                        <NavLink
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `relative p-1 text-sm md:p-3 md:px-4 flex items-center gap-1 rounded-md overflow-hidden
                       text-black dark:hover:bg-dark-5 hover:text-primary-500 hover:bg-primary-300/30 hover:shadow-md dark:text-white whitespace-nowrap group
                       ${isActive ? "bg-primary-200/50 border border-primary-500 text-white shadow-lg" : ""}`
                                            }
                                        >
                                            <div className='flex gap-1 md:gap-4 items-center'>
                                                <div className='w-5 h-5'>{item.icon}</div>
                                                <div >{item.name}</div>
                                            </div>
                                        </NavLink>
                                    </div>
                                </Tooltip.Trigger>
                                {!sidebarIsOpen && !delayedPointerEnabled && (
                                    <Tooltip.Portal>
                                        <Tooltip.Content
                                            side="right"
                                            sideOffset={0}
                                            className="hidden md:block z-50 rounded bg-gray-600 text-white text-xs px-2 py-1 animate-fade-in"
                                        >
                                            {item.name}
                                            <Tooltip.Arrow className="fill-gray-600" />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                )}
                            </Tooltip.Root>
                        ))}
                    </Tooltip.Provider>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
