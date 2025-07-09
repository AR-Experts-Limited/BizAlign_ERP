import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TableFilters from '../TableFilters/TableFilters';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import moment from 'moment';
import { MultiGrid, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css";
import { FcApproval, FcClock, FcTodoList, FcHighPriority, FcCheckmark } from "react-icons/fc";
import { FaChevronLeft, FaChevronRight, FaEye } from "react-icons/fa";
import { BsCheckCircleFill } from "react-icons/bs";


const TableStructure = ({ title, state, setters, tableData, invoiceMap, handleFileChange, selectedInvoices, handleSelectAll, updateInvoiceApprovalStatus, visionIds, setVisionIds, visionTracker, setVisionTracker, manageSummaryLoading }) => {
    const dispatch = useDispatch();
    const gridRef = useRef(null);
    const { driverStatus } = useSelector((state) => state.drivers);
    const driversBySite = useSelector((state) => state.drivers.bySite);
    const [isFilterOpen, setIsFilterOpen] = useState(true)
    const [scroll, setScroll] = useState({ row: 0, col: 0 })

    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);

    const { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList } = state
    const { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList } = setters

    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());

    }, [driverStatus, standbyDriverStatus, dispatch]);

    useEffect(() => {
        if (Object.keys(driversBySite).length > 0 && selectedSite !== '') {
            let driversList = driversBySite[selectedSite]?.filter((driver) => !driver.disabled) || [];
            let standbydriversList = []
            // Get start and end dates from days array
            const startDate = new Date(days[0]?.date.split(',')[1]);
            const endDate = new Date(days[days.length - 1]?.date.split(',')[1]);

            if (!['Daily Invoice'].includes(title)) {
                // Filter standby drivers to only include those whose day is within the date range
                standbydriversList = Object.values(driversBySite)
                    .flat()
                    ?.filter((driver) =>
                        standbydrivers
                            .filter((sdriver) => {
                                const driverDate = new Date(sdriver.day);
                                return sdriver.site !== selectedSite &&
                                    driverDate >= startDate &&
                                    driverDate <= endDate;
                            })
                            .some((sId) => sId.driverId === driver._id)
                    );
            }

            driversList = [...driversList, ...standbydriversList]
            if (searchDriver !== '') {
                driversList = driversList.filter((driver) =>
                    String(driver.firstName + ' ' + driver.lastName)
                        .toLowerCase()
                        .includes(searchDriver.toLowerCase())
                );
            }
            setDriversList(driversList);
            setStandbydriversList(standbydriversList);
        }
    }, [driversBySite, selectedSite, searchDriver, standbydrivers, days]);

    const GridComponent = () => {
        const rowCount = driversList.length + 1;
        const columnCount = days?.length + 1;
        const topLeftRowHeight = 50
        const defaultRowHeight = 120;

        // Provide variable rowHeight as function
        const getRowHeight = ({ index }) => {
            if (index === 0) {
                return topLeftRowHeight;
            }
            return defaultRowHeight;
        };

        const cellRenderer = ({ columnIndex, rowIndex, key, style }) => {
            const isHeader = rowIndex === 0;
            const isFirstCol = columnIndex === 0;
            const isTopLeft = isHeader && isFirstCol;
            const driver = driversList[rowIndex - 1];
            const day = days[columnIndex - 1];
            const disabledDriver = driver?.activeStatus != 'Active' ? driver?.activeStatus : null
            const standbyDriver = standbydriversList.some((sdriver) => sdriver._id == driver?._id)
            const isToday = new Date(day?.date).toDateString() === new Date().toDateString();



            let classNames = `flex items-center justify-center border-[0.5px] border-gray-300 text-sm p-4 h-full `;

            if (isTopLeft) {
                classNames += " bg-primary-800 text-white  font-bold";
            } else if (isHeader) {
                classNames += " bg-primary-800 text-white font-light ";
            } else if (isFirstCol) {
                classNames += ` font-medium p-4 `;
            } else {
                classNames += ` bg-white ${isToday ? '!bg-amber-100/20 relative' : 'relative'}`;
            }

            return (
                <div key={key} className={classNames} style={style}>
                    {isTopLeft
                        ? "Personnels List"
                        : isHeader
                            ? <div className='flex flex-col gap-1 items-center p-2'>
                                <div>{day.date}</div>
                                {(rangeType === 'biweekly' || rangeType === 'monthly') && <div className='font-medium text-gray-600 w-fit px-1 py-0.5 text-[0.55rem] bg-stone-100 rounded-sm'>
                                    {day.week}
                                </div>}
                            </div>
                            : isFirstCol
                                ? <div className='flex justify-center flex-col gap-1 h-full w-full'>
                                    <p>{driver.firstName + ' ' + driver.lastName}</p>
                                    {title === 'Manage Summary' && driver.transporterName && ((driver.firstName + ' ' + driver.lastName) !== driver.transporterName) && <p className='text-normal text-xs'>({driver.transporterName})</p>}
                                    <div className='flex flex-col justify-left gap-1'>
                                        {disabledDriver && <div className='text-xs  text-center text-stone-600 bg-stone-400/40 shadow-sm border-[1.5px] border-stone-400/10 p-0.5 rounded-sm w-fit'>{disabledDriver}</div>}
                                        {standbyDriver && <div className='text-left bg-amber-200 text-amber-700 rounded-md p-1 text-xs w-fit'>Stand by driver from {driver.siteSelection}</div>}
                                    </div>
                                </div>
                                : tableData(driver, day, disabledDriver, standbyDriver)}
                </div>
            );
        };

        return (
            <div className="rounded-md flex-1 h-full overflow-hidden w-full">
                <AutoSizer>
                    {({ width, height }) => {
                        const columnWidth = ({ index }) => {
                            if (rangeType === 'daily') {
                                return Math.floor(width / 2);
                            }
                            else if (rangeType === 'weekly') {
                                return Math.max(200, Math.floor(width / 7));
                            }
                            else if (rangeType === 'biweekly') {
                                return Math.max(200, Math.floor(width / 14));
                            }
                            else {
                                return 200
                            }
                        };
                        return (
                            <MultiGrid
                                ref={gridRef}
                                key={`${JSON.stringify(visionTracker)}-${selectedSite}-${JSON.stringify(days.map(d => d.date))}-${JSON.stringify(standbydrivers.map(sd => sd._id))}-${JSON.stringify(standbydriversList.map(sd => sd._id))}-${width}-${height}`}
                                fixedRowCount={1}
                                fixedColumnCount={1}
                                rowCount={rowCount}
                                columnCount={columnCount}
                                rowHeight={getRowHeight}
                                columnWidth={columnWidth}
                                height={height}
                                width={width}
                                cellRenderer={cellRenderer}
                                scrollToRow={scroll?.row + 1}
                                scrollToColumn={scroll?.col + 1}
                                scrollToAlignment={'center'}
                                classNameTopLeftGrid="z-30"
                                classNameTopRightGrid="z-25"
                                classNameBottomLeftGrid="z-20"
                                classNameBottomRightGrid="z-15"
                            />
                        )
                    }
                    }
                </AutoSizer>
            </div>
        );
    };

    const handleNavigation = (direction) => {
        // Find the index of the current visionTracker in visionIds
        const currentIndex = visionIds.findIndex(
            (item) => item.invoice._id === visionTracker?.invoice._id
        );

        let newIndex;
        if (direction === 'previous') {
            // Move to the previous item, wrap around to the last item if at the start
            newIndex = currentIndex <= 0 ? visionIds.length - 1 : currentIndex - 1;
        } else {
            // Move to the next item, wrap around to the first item if at the end
            newIndex = currentIndex >= visionIds.length - 1 ? 0 : currentIndex + 1;
        }
        // Update visionTracker to the invoice at the new index
        setVisionTracker(visionIds[newIndex]);
    };

    useEffect(() => {
        if (visionTracker)
            setScroll({
                row: driversList.findIndex((driver) => driver._id === visionTracker?.invoice?.driverId), col: moment(visionTracker?.invoice?.date).day()
            })

        else {
            setScroll({ row: 0, col: 0 })
        }
    }, [visionTracker])

    return (
        <div className='w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden dark:text-white'>
            {/* <h2 className='self-start text-xl mb-1 font-bold dark:text-white'>{title}</h2> */}
            <div className='flex flex-col w-full h-full bg-white dark:bg-dark-3 rounded-xl shadow overflow-hidden'>
                <div className='flex font-bold text-lg justify-between items-center z-5 rounded-t-lg w-full px-3 py-1.5 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                    <h3>{title}</h3>
                    <button onClick={() => setIsFilterOpen(prev => !prev)} className={`rounded-lg p-2 hover:bg-gray-200 hover:text-primary-500 ${isFilterOpen && 'bg-gray-200 text-primary-500'}`}><i class="flex items-center text-[1rem] fi fi-rr-filter-list"></i></button>
                </div >
                <div className='flex-1 flex flex-col h-full p-2'>
                    <div className={`transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-40 pb-2 opacity-100 visibility-visible' : 'max-h-0 opacity-0 visibility-hidden'} `}>
                        <TableFilters
                            title={title}
                            state={state}
                            setters={setters}
                            manageSummaryLoading={manageSummaryLoading}
                            invoiceMap={invoiceMap}
                            handleFileChange={handleFileChange}
                            selectedInvoices={selectedInvoices}
                            handleSelectAll={handleSelectAll}
                            updateInvoiceApprovalStatus={updateInvoiceApprovalStatus}
                        />
                    </div>
                    {title === 'Manage Summary' &&
                        <div className="flex p-2 gap-2 md:gap-5 justify-around bg-neutral-100/90 dark:bg-dark-2 shadow border-[1.5px] border-neutral-300/80 dark:border-dark-5 rounded-lg overflow-visible dark:!text-white mb-2">
                            {/* No Matched CSV */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'Access Requested' && !visionTracker?.matchedCsv && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || (visionTracker?.invoice?.approvalStatus !== 'Access Requested' && !visionTracker?.invoice?.csvData)) {
                                            setVisionIds(Object.values(invoiceMap).filter((inv) => !inv.matchedCsv));
                                            setVisionTracker(Object.values(invoiceMap).filter((inv) => !inv.matchedCsv)[0] || null);
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${(visionTracker?.invoice?.approvalStatus === 'Access Requested' && !visionTracker?.matchedCsv) && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <div className="bg-gray-200 h-4 w-4 rounded border border-dashed border-gray-500"></div>
                                    No Matched CSV ({Object.values(invoiceMap).filter((inv) => !inv.matchedCsv).length})
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'Access Requested' && !visionTracker?.matchedCsv && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Access Requested */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'Access Requested' && visionTracker?.matchedCsv && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || (visionTracker?.invoice?.approvalStatus !== 'Access Requested' && visionTracker?.invoice?.csvData)) {
                                            setVisionIds(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice.approvalStatus === 'Access Requested'
                                                )
                                            );
                                            setVisionTracker(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice.approvalStatus === 'Access Requested'
                                                )[0] || null
                                            );
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${(visionTracker?.invoice?.approvalStatus === 'Access Requested' && visionTracker?.matchedCsv) && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <FcHighPriority size={20} />
                                    Access Requested (
                                    {Object.values(invoiceMap).filter(
                                        (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Access Requested'
                                    ).length || 0}
                                    )
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'Access Requested' && visionTracker?.matchedCsv && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Under Edit */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'Under Edit' && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || visionTracker?.invoice?.approvalStatus !== 'Under Edit') {
                                            setVisionIds(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Edit'
                                                )
                                            );
                                            setVisionTracker(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Edit'
                                                )[0] || null
                                            );
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${visionTracker?.invoice?.approvalStatus === 'Under Edit' && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <i className="flex items-center text-[1rem] text-amber-500 fi fi-rr-pen-square"></i>
                                    Under Edit (
                                    {Object.values(invoiceMap).filter(
                                        (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Edit'
                                    ).length || 0}
                                    )
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'Under Edit' && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Under Approval */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'Under Approval' && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || visionTracker?.invoice?.approvalStatus !== 'Under Approval') {
                                            setVisionIds(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Approval'
                                                )
                                            );
                                            setVisionTracker(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Approval'
                                                )[0] || null
                                            );
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${visionTracker?.invoice?.approvalStatus === 'Under Approval' && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <i className="flex items-center text-[1rem] text-sky-500 fi fi-rs-memo-circle-check"></i>
                                    Under Approval (
                                    {Object.values(invoiceMap).filter(
                                        (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Under Approval'
                                    ).length}
                                    )
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'Under Approval' && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Waiting for Invoice Generation */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'Invoice Generation' && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || visionTracker?.invoice?.approvalStatus !== 'Invoice Generation') {
                                            setVisionIds(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Invoice Generation'
                                                )
                                            );
                                            setVisionTracker(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Invoice Generation'
                                                )[0] || null
                                            );
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${visionTracker?.invoice?.approvalStatus === 'Invoice Generation' && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <FcClock className="!text-primary-500" size={22} />
                                    Waiting for Invoice Generation (
                                    {Object.values(invoiceMap).filter(
                                        (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'Invoice Generation'
                                    ).length}
                                    )
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'Invoice Generation' && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Invoice Generated */}
                            <div className="flex items-center gap-1">
                                {visionTracker?.invoice?.approvalStatus === 'completed' && (
                                    <button
                                        name="previous"
                                        onClick={() => handleNavigation('previous')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronLeft size={12} />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (visionIds.length < 1 || visionTracker?.invoice?.approvalStatus !== 'completed') {
                                            setVisionIds(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'completed'
                                                )
                                            );
                                            setVisionTracker(
                                                Object.values(invoiceMap).filter(
                                                    (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'completed'
                                                )[0] || null
                                            );
                                        } else {
                                            setVisionIds([]);
                                            setVisionTracker(null);
                                        }
                                    }}
                                    className={`flex gap-1 items-center text-xs hover:bg-neutral-300 p-1 rounded ${visionTracker?.invoice?.approvalStatus === 'completed' && 'bg-neutral-300 shadow-md'
                                        } `}
                                >
                                    <BsCheckCircleFill className="text-green-600 text-xl" />
                                    Invoice Generated (
                                    {Object.values(invoiceMap).filter(
                                        (inv) => inv.matchedCsv && inv?.invoice?.approvalStatus === 'completed'
                                    ).length}
                                    )
                                </button>
                                {visionTracker?.invoice?.approvalStatus === 'completed' && (
                                    <button
                                        name="next"
                                        onClick={() => handleNavigation('next')}
                                        className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-5 h-5 shadow-sm border border-neutral-200 dark:border-dark-5"
                                    >
                                        <FaChevronRight size={12} />
                                    </button>
                                )}
                            </div>
                        </div>}

                    {GridComponent()}

                </div >
            </div>
        </div >

    );
};

export default TableStructure;