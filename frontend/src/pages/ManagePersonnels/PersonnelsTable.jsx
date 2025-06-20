import React, { useState } from 'react';
import { useEffect } from 'react';
import { FaTrashAlt } from "react-icons/fa";
import TableFeatures from '../../components/TableFeatures/TableFeatures';
import InputGroup from '../../components/InputGroup/InputGroup'

const PersonnelsTable = ({ driversList, columns, handleEditDriver, handleDeleteDriver, onDisableDriver }) => {

    return (
        <div className='overflow-auto'>
            {/* <div className='w-full px-3 pt-2 flex justify-end'><TableFeatures columns={columns} setColumns={setColumns} content={driversList} setContent={setDriversList} /></div> */}
            <table className='table-general'>
                <thead>
                    <tr className='text-sm md:text-base sticky top-0 bg-white z-20 text-neutral-400'>
                        <th>#</th>
                        <th>Enable/Disable</th>
                        <th>Profile picture</th>
                        {Object.keys(columns).map((col) => (<th>{col}</th>))}
                        <th>Options</th>
                    </tr>
                </thead>
                <tbody>
                    {driversList.sort((a, b) => Number(a.disabled) - Number(b.disabled)).map((driver, index, array) => {
                        // const isFirstInactive = driver.disabled && (index === 0 || !array[index - 1].disabled);
                        return (<>
                            {/* {isFirstInactive && (
                                <tr>
                                    <td colSpan="10" className="!p-1 border-b border-neutral-200 bg-neutral-50 dark:bg-dark-4 text-lg font-light text-gray-700 dark:text-white py-2">
                                        Disabled
                                    </td>
                                </tr>
                            )} */}
                            <tr
                                onClick={() => handleEditDriver(driver)}
                                className={`${driver.disabled ? 'bg-neutral-100 text-gray-400' : ''} cursor-pointer hover:bg-neutral-50`}
                            >
                                <td>{index + 1}</td>
                                <td className="border-b border-neutral-200">
                                    <div
                                        className="flex justify-center"
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevents tr click
                                        }}
                                    >
                                        <InputGroup
                                            type="toggleswitch"
                                            checked={!driver.disabled}
                                            onChange={(e) => {
                                                e.stopPropagation(); // extra safety in case InputGroup itself bubbles up
                                                onDisableDriver({
                                                    driver,
                                                    email: driver.Email,
                                                    disabled: !e.target.checked,
                                                })
                                            }}
                                        />
                                    </div>
                                </td>
                                <td>
                                    <div className='flex justify-center items-center w-full group relative'>
                                        <div className='z-0 flex justify-center items-center bg-gray-100 w-12 h-12 rounded-full border border-neutral-300 overflow-hidden'>{driver.profilePicture.length < 1 ? <i class="flex items-center text-[1rem] text-neutral-400 fi fi-sr-driver-man" /> : <img src={driver.profilePicture[0].original} />}</div>
                                        {driver.profilePicture?.length > 0 && <div className='z-10 border border-gray-100 rounded-lg overflow-hidden scale-0 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 delay-500 origin-top-left block h-45 w-45 absolute top-1/2 left-12'>
                                            <img src={driver.profilePicture[0].original} />
                                        </div>}
                                    </div>
                                </td>

                                {Object.values(columns).map((col, i) => (
                                    <td key={i}>{driver[col]}</td>
                                ))}
                                <td>
                                    <div className="flex justify-center">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteDriver(driver._id, driver.siteSelection, driver.user_ID);
                                            }}
                                            className="flex justify-center items-center w-7 h-7 rounded-md p-1 hover:bg-neutral-200 text-red-500"
                                        >
                                            <FaTrashAlt size={16} />
                                        </div>
                                    </div>
                                </td>
                            </tr>

                        </>)
                    })}
                </tbody>
            </table>
        </div >
    );
};

export default PersonnelsTable;