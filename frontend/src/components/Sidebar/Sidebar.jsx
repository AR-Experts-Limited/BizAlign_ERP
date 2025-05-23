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
        { path: "/dashboard", name: "Dashboard", icon: <i className="fi fi-rr-dashboard-panel hover:text-primary-800 text-[1.6rem]"></i> },
        { path: "/manage-personnels", name: "Manage Personnels", icon: <i class="fi fi-rr-users-alt hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/rate-card", name: "Rate Cards", icon: <i class="fi fi-rr-calculator hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/notifications", name: "Notifications", icon: <i class="fi fi-rr-bell-notification-social-media hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/planner", name: "Schedule Planner", icon: <i class="fi fi-rr-calendar-clock hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/live-operations", name: "Live Operations", icon: <BiStation className='hover:text-primary-800' size={25} /> },
        { path: "/rota", name: "Rota", icon: <i class="fi fi-rr-payroll-calendar hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/working-hours", name: "Working Hours", icon: <i class="fi fi-rr-time-half-past hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/installments", name: "Installments", icon: <i class="fi fi-rr-money-check-edit hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/deductions", name: "Deductions", icon: <i class="fi fi-rs-cheap-dollar hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/incentives", name: "Incentives", icon: <i class="fi fi-rr-handshake-deal-loan hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/manage-summary", name: "Manage Summary", icon: <i class="fi fi-rr-clip-file hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/manage-payments", name: "Manage Payments", icon: <i class="fi fi-rr-money-bill-wave hover:text-primary-800 text-[1.5rem]" ></i> },
        { path: "/print-invoices", name: "Print Invoices", icon: <i class="fi fi-rr-print hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/profit-loss", name: "Profit / Loss", icon: <i class="fi fi-rr-chart-histogram hover:text-primary-800 text-[1.5rem]"></i> },
        { path: "/manage-users", name: "Manage users", icon: <i class="fi fi-rr-id-card-clip-alt hover:text-primary-800 text-[1.5rem]"></i> },
    ];

    return (
        <div
            className={`h-full bg-neutral-300/60 dark:bg-dark-3 border-r border-white overflow-auto transition-all duration-300 origin-left
        ${sidebarIsOpen ? 'w-40 md:w-60' : 'w-0 md:w-18'}
      ${delayedPointerEnabled ? 'pointer-events-none' : ''}`}
        >
            <div className='mb-12'>
                <div className="flex flex-col h-full gap-5 m-2">
                    <Tooltip.Provider delayDuration={500}>
                        {menuItems.map((item) => (
                            <Tooltip.Root key={item.path}>
                                <Tooltip.Trigger asChild>
                                    <div>
                                        <NavLink
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `relative p-1 text-base md:p-2 md:px-4 flex items-center gap-1 rounded-md overflow-hidden
                       text-black dark:hover:bg-dark-5 hover:text-primary-500 hover:bg-primary-300/30 hover:shadow-md dark:text-white whitespace-nowrap group
                       ${isActive ? "bg-primary-300/30   border-l-3 border-primary-400 text-primary-800 rounded-l-none" : ""}`
                                            }
                                        >
                                            <div className='flex gap-1 md:gap-4 items-center'>
                                                <div className='w-7 h-7'>{item.icon}</div>
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
