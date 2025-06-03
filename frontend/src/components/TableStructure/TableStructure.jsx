import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import TableFilters from '../TableFilters/TableFilters';
import { fetchDrivers, } from '../../features/drivers/driverSlice';
import { fetchStandbyDrivers } from '../../features/standbydrivers/standbydriverSlice';
import moment from 'moment';


const TableStructure = ({ title, state, setters, tableData }) => {
    const dispatch = useDispatch();
    const { list: drivers, driverStatus } = useSelector((state) => state.drivers);
    const { list: standbydrivers, standbyDriverStatus } = useSelector((state) => state.standbydrivers);

    const { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList } = state
    const { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList } = setters


    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        if (standbyDriverStatus === 'idle') dispatch(fetchStandbyDrivers());

    }, [driverStatus, standbyDriverStatus, dispatch]);

    useEffect(() => {
        let driversList = drivers
        let standbydriversIds = standbydrivers.map((sdriver) => { if (sdriver.site !== selectedSite) return (sdriver.driverId) })
        let standbydriversList = drivers.filter((driver) => standbydriversIds.some((sId) => sId == driver._id))

        if (searchDriver !== '')
            driversList = driversList.filter((driver) => String(driver.firstName + ' ' + driver.lastName).toLowerCase().includes(searchDriver.toLowerCase()))

        driversList = driversList.filter((driver) => driver.siteSelection === selectedSite)

        setDriversList([...driversList, ...standbydriversList])
        setStandbydriversList(standbydriversList)

    }, [drivers, selectedSite, searchDriver, standbydrivers])

    return (
        <div className='w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden '>
            <h2 className='self-start text-xl mb-1 font-bold dark:text-white'>{title}</h2>
            <div className='flex flex-col w-full h-full bg-white dark:bg-dark-3 rounded-xl p-2 md:p-4 shadow overflow-hidden'>
                <TableFilters state={state} setters={setters} />
                <div className="my-3 relative rounded-t-lg flex-1 overflow-auto">
                    <table className='calendar-table text-xs md:text-base w-full border border-neutral-200'>
                        <thead>
                            <tr className='text-white'>
                                <th className='sticky top-0 left-0 z-20 bg-primary-800 border-r-[1.5px] border-primary-700 font-medium'>
                                    Personnels List
                                </th>
                                {days.map((day) => (
                                    <th className={`sticky top-0 z-10  bg-primary-800 border-r-[1.5px] border-primary-700 font-light ${rangeType === 'daily' ? '!max-w-35' : ''}`} key={day.date}>
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
                                const standbydriver = standbydriversList.some((sdriver) => sdriver._id === driver._id)
                                return (
                                    <tr>
                                        <td className='z-10 sticky left-0 bg-white'>
                                            <div className='flex flex-col gap-3 '>
                                                <p>{driver.firstName + ' ' + driver.lastName}</p>
                                                {disableDriver && <div className='text-sm text-center text-stone-600 bg-stone-400/40 shadow-sm border-[1.5px] border-stone-400/10 p-0.5 rounded-sm'>{disableDriver}</div>}
                                                {standbydriver && <div className='text-left bg-amber-200 text-amber-700 rounded-md px-2 py-1 text-xs'>Stand by driver from {driver.siteSelection}</div>}
                                            </div>
                                        </td>
                                        {tableData(driver, disableDriver, standbydriver)}
                                    </tr>)
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    );
};

export default TableStructure;