import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TableFilters from '../TableFilters/TableFilters';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import moment from 'moment';


const TableStructure = ({ title, state, setters, tableData, invoiceMap, handleFileChange, selectedInvoices, handleSelectAll, updateInvoiceApprovalStatus }) => {
    const dispatch = useDispatch();
    const [isFilterOpen, setIsFilterOpen] = useState(true)
    const { driverStatus } = useSelector((state) => state.drivers);
    const driversBySite = useSelector((state) => state.drivers.bySite);

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

            // Get start and end dates from days array
            const startDate = new Date(days[0]?.date.split(',')[1]);
            const endDate = new Date(days[days.length - 1]?.date.split(',')[1]);

            // Filter standby drivers to only include those whose day is within the date range
            let standbydriversList = Object.values(driversBySite)
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

            if (searchDriver !== '') {
                driversList = driversList.filter((driver) =>
                    String(driver.firstName + ' ' + driver.lastName)
                        .toLowerCase()
                        .includes(searchDriver.toLowerCase())
                );
            }
            setDriversList([...driversList, ...standbydriversList]);
            setStandbydriversList(standbydriversList);
        }
    }, [driversBySite, selectedSite, searchDriver, standbydrivers, days]);

    return (
        <div className='w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden dark:text-white'>
            {/* <h2 className='self-start text-xl mb-1 font-bold dark:text-white'>{title}</h2> */}
            <div className='flex flex-col w-full h-full bg-white dark:bg-dark-3 rounded-xl shadow overflow-hidden'>
                <div className='flex font-bold text-lg justify-between items-center z-5 rounded-t-lg w-full px-3 py-1.5 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                    <h3>{title}</h3>
                    <button onClick={() => setIsFilterOpen(prev => !prev)} className={`rounded-lg p-2 hover:bg-gray-200 hover:text-primary-500 ${isFilterOpen && 'bg-gray-200 text-primary-500'}`}><i class="flex items-center text-[1rem] fi fi-rr-filter-list"></i></button>
                </div >
                <div className='flex-1 flex flex-col p-2 overflow-auto'>
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
                    <div className="relative rounded-t-xl flex-1  overflow-auto">
                        <table className='calendar-table text-xs md:text-base w-full  border border-neutral-200 dark:border-dark-4'>
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
                        </table>
                    </div>
                </div >
            </div>
        </div >

    );
};

export default TableStructure;