import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from 'react-redux';
import * as Tooltip from '@radix-ui/react-tooltip';
import { BiStation } from "react-icons/bi";

const Sidebar = ({ sidebarIsOpen, setSidebarIsOpen }) => {
    const location = useLocation();
    const itemRefs = useRef({});
    const containerRef = useRef(null);
    const timeoutRef = useRef(null);

    const { accessDetails } = useSelector((state) => state.auth);


    useEffect(() => {
        const activeItem = itemRefs.current[location.pathname];
        const container = containerRef.current;

        if (activeItem && container) {
            const itemRect = activeItem.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const isFullyVisible =
                itemRect.top >= containerRect.top &&
                itemRect.bottom <= containerRect.bottom;

            if (!isFullyVisible) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, [location.pathname, sidebarIsOpen]);

    const handleMouseLeave = () => {
        if (sidebarIsOpen !== 2) { // Only close if not over opener
            timeoutRef.current = setTimeout(() => {
                setSidebarIsOpen(false);
            }, 500);
        }
    };


    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };



    const menuItems = [
        { path: "/dashboard", name: "Dashboard", icon: <i className="fi fi-rr-dashboard-panel text-[1.6rem]"></i> },
        { path: "/manage-personnels", name: "Manage Personnels", icon: <i className="fi fi-rr-users-alt text-[1.5rem]"></i> },
        { path: "/rate-card", name: "Rate Cards", icon: <i className="fi fi-rr-calculator text-[1.5rem]"></i> },
        { path: "/notifications", name: "Notifications", icon: <i className="fi fi-rr-bell-notification-social-media text-[1.5rem]"></i> },
        { path: "/approvals", name: "Approvals", icon: <i className="fi fi-rr-checkbox text-[1.5rem]"></i> },
        { path: "/planner", name: "Schedule Planner", icon: <i className="fi fi-rr-calendar-clock text-[1.5rem]"></i> },
        { path: "/live-operations", name: "Live Operations", icon: <BiStation className="text-[1.5rem]" /> },
        { path: "/rota", name: "Rota", icon: <i className="fi fi-rr-payroll-calendar text-[1.5rem]"></i> },
        // { path: "/working-hours", name: "Working Hours", icon: <i className="fi fi-rr-time-half-past text-[1.5rem]"></i> },
        { path: "/installments", name: "Installments", icon: <i className="fi fi-rr-money-check-edit text-[1.5rem]"></i> },
        { path: "/deductions", name: "Deductions", icon: <i className="fi fi-rs-cheap-dollar text-[1.5rem]"></i> },
        { path: "/incentives", name: "Incentives", icon: <i className="fi fi-rr-handshake-deal-loan text-[1.5rem]"></i> },
        { path: "/manage-summary", name: "Manage Summary", icon: <i className="fi fi-rr-clip-file text-[1.5rem]"></i> },
        { path: "/manage-payments", name: "Manage Payments", icon: <i className="fi fi-rr-money-bill-wave text-[1.5rem]"></i> },
        { path: "/add-ons", name: "Additional Charges", icon: <i className="fi fi-rr-plus-hexagon text-[1.5rem]"></i> },
        { path: "/print-invoices", name: "Print Invoices", icon: <i className="fi fi-rr-print text-[1.5rem]"></i> },
        { path: "/manage-users", name: "Manage Users", icon: <i className="fi fi-rr-id-card-clip-alt text-[1.5rem]"></i> },
    ];

    return (
        <div
            ref={containerRef}
            className={`
                relative sidebar h-full bg-neutral-200/50 dark:bg-dark-3 border-r border-stone-400/40 overflow-auto
                scrollbar-none hover:scrollbar  scrollbar-thin scrollbar-thumb-gray-600/40 scrollbar-track-transparent
                transition-all duration-300 origin-left
                ${sidebarIsOpen ? 'w-45 md:w-60' : 'w-0 md:w-18'}
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >

            <div className="mb-12">
                <div className="flex flex-col justify-center gap-5 m-2">
                    <Tooltip.Provider delayDuration={500}>
                        {menuItems
                            .filter(item => accessDetails?.includes(item.name))
                            .map((item) => {
                                const navLink = (
                                    <div
                                        key={item.path}
                                        ref={(el) => (itemRefs.current[item.path] = el)}
                                    >
                                        <NavLink
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `relative p-1 text-base md:p-2 md:px-4 flex items-center gap-1 rounded-lg overflow-hidden
                                                text-black dark:hover:bg-dark-5 hover:text-primary-500 hover:bg-primary-300/30 hover:shadow-md dark:text-white whitespace-nowrap group
                                                ${isActive ? "bg-primary-300/30 text-primary-800 shadow-md" : ""}`
                                            }
                                        >
                                            <div className="flex gap-2 md:gap-4 items-center">
                                                <div className="w-7 h-7">{item.icon}</div>
                                                <div>{item.name}</div>
                                            </div>
                                        </NavLink>
                                    </div>
                                );

                                if (sidebarIsOpen) {
                                    return navLink;
                                }

                                return (
                                    <Tooltip.Root key={item.path}>
                                        <Tooltip.Trigger asChild>{navLink}</Tooltip.Trigger>
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
                                    </Tooltip.Root>
                                );
                            })}
                    </Tooltip.Provider>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;