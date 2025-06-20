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
                    <tr className='text-sm md:text-base sticky top-0 bg-white text-neutral-400'>
                        <th>#</th>
                        <th>Enable/Disable</th>
                        {Object.keys(columns).map((col) => (<th>{col}</th>))}
                        <th>Options</th>
                    </tr>
                </thead>
                <tbody>
                    {driversList.sort((a, b) => Number(b.disabled) - Number(a.disabled)).map((driver, index, array) => {
                        const isFirstInactive = driver.disabled && (index === 0 || array[index - 1].disabled);
                        return (<>
                            {isFirstInactive && (
                                <tr>
                                    <td colSpan="10" className="!p-1 border-b border-neutral-200 bg-neutral-50 dark:bg-dark-4 text-lg font-light text-gray-700 dark:text-white py-2">
                                        Disabled
                                    </td>
                                </tr>
                            )}
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