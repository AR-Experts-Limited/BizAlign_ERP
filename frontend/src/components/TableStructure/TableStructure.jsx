import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TableFilters from '../TableFilters/TableFilters';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import moment from 'moment';
import { MultiGrid, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css";

const TableStructure = ({ title, state, setters, tableData, invoiceMap, handleFileChange, selectedInvoices, handleSelectAll, updateInvoiceApprovalStatus }) => {
    const dispatch = useDispatch();
    const { driverStatus } = useSelector((state) => state.drivers);
    const driversBySite = useSelector((state) => state.drivers.bySite);
    const [isFilterOpen, setIsFilterOpen] = useState(true)

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
        // const columnWidth = rangeType === 'daily' ? 675 : 200;


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
                            ? `${day?.date}`
                            : isFirstCol
                                ? <div className='flex flex-col gap-1 h-full w-full'>
                                    <p>{driver.firstName + ' ' + driver.lastName}</p>
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
                            } else {
                                return 200;
                            }
                        };
                        return (
                            <MultiGrid
                                key={`${selectedSite}-${JSON.stringify(days.map(d => d.date))}-${JSON.stringify(standbydrivers.map(sd => sd._id))}-${JSON.stringify(standbydriversList.map(sd => sd._id))}`}
                                fixedRowCount={1}
                                fixedColumnCount={1}
                                rowCount={rowCount}
                                columnCount={columnCount}
                                rowHeight={getRowHeight}
                                columnWidth={columnWidth}
                                height={height}
                                width={width}
                                cellRenderer={cellRenderer}
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

    return (
        <div className='w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden dark:text-white'>
            {/* <h2 className='self-start text-xl mb-1 font-bold dark:text-white'>{title}</h2> */}
            <div className='flex flex-col w-full h-full bg-white dark:bg-dark-3 rounded-xl shadow overflow-hidden'>
                <div className='flex font-bold text-lg justify-between items-center z-5 rounded-t-lg w-full px-3 py-1.5 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                    <h3>{title}</h3>
                    <button onClick={() => setIsFilterOpen(prev => !prev)} className={`rounded-lg p-2 hover:bg-gray-200 hover:text-primary-500 ${isFilterOpen && 'bg-gray-200 text-primary-500'}`}><i class="flex items-center text-[1rem] fi fi-rr-filter-list"></i></button>
                </div >
                <div className='flex-1 flex flex-col h-full p-2'>
                    <div className={`transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-40 pb-2 opacity-100 visibility-visible' : 'max-h-0 opacity-0 visibility-hidden'}`}>
                        <TableFilters
                            title={title}
                            state={state}
                            setters={setters}
                            invoiceMap={invoiceMap}
                            handleFileChange={handleFileChange}
                            selectedInvoices={selectedInvoices}
                            handleSelectAll={handleSelectAll}
                            updateInvoiceApprovalStatus={updateInvoiceApprovalStatus}
                        />
                    </div>
                    {/* <table className='calendar-table text-xs md:text-base w-full  border border-neutral-200 dark:border-dark-4'>
                            <thead>
                                <tr className='text-white'>
                                    <th className='sticky top-0 left-0 z-20 bg-primary-800 border-r-[1.5px] border-primary-500 font-medium max-sm:!max-w-20 max-sm:!whitespace-normal'>
                                        Personnels List
                                    </th>
                                    {days.map((day) => (
                                        <th className={`sticky top-0 z-10  bg-primary-800 border-r-[1.5px] border-primary-500 font-light ${rangeType === 'daily' ? '!max-w-35' : ''}`} key={day.date}>
                                            <div className='flex flex-col gap-1 items-center '>
                                                <div>{day.date}</div>
                                                {rangeType === 'biweekly' && <div className='font-medium text-gray-600 w-fit px-1 py-0.5 text-[0.55rem] bg-stone-100 rounded-sm'>
                                                    {day.week}
                                                </div>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {driversList.map((driver) => {
                                    const disableDriver = driver.activeStatus != 'Active' ? driver.activeStatus : null
                                    const standbydriver = standbydriversList.some((sdriver) => sdriver._id == driver._id)
                                    return (
                                        <tr>
                                            <td className='z-10 sticky left-0 bg-white dark:bg-dark-3'>
                                                <div className='flex flex-col gap-1 '>
                                                    <p>{driver.firstName + ' ' + driver.lastName}</p>
                                                    <div className='flex flex-col gap-1'>
                                                        {disableDriver && title !== 'Daily Invoice' && <div className='text-xs md:text-sm text-center text-stone-600 bg-stone-400/40 shadow-sm border-[1.5px] border-stone-400/10 p-0.5 rounded-sm w-fit'>{disableDriver}</div>}
                                                        {standbydriver && <div className='text-left bg-amber-200 text-amber-700 rounded-md p-1 text-xs w-fit'>Stand by driver from {driver.siteSelection}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            {tableData(driver, disableDriver, standbydriver)}
                                        </tr>)
                                })}
                            </tbody>
                        </table> */}
                    {GridComponent()}

                </div >
            </div>
        </div >

    );
};

export default TableStructure;