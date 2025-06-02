import React, { useState } from 'react';
import { useEffect } from 'react';
import { FaTrashAlt } from "react-icons/fa";
import TableFeatures from '../../components/TableFeatures/TableFeatures';

const PersonnelsTable = ({ driversList, columns, handleEditDriver, handleDeleteDriver }) => {

    return (
        <div className='overflow-auto'>
            {/* <div className='w-full px-3 pt-2 flex justify-end'><TableFeatures columns={columns} setColumns={setColumns} content={driversList} setContent={setDriversList} /></div> */}
            <table className='table-general'>
                <thead>
                    <tr className='text-sm md:text-base sticky top-0 bg-white text-neutral-400'>
                        <th>#</th>
                        {Object.keys(columns).map((col) => (<th>{col}</th>))}
                        <th>Options</th>
                    </tr>
                </thead>
                <tbody>
                    {driversList.map((driver, index) => (
                        <tr onClick={() => handleEditDriver(driver)} className={`cursor-pointer hover:bg-neutral-50`} >
                            <td>{index + 1}</td>
                            {Object.values(columns).map((col) => (
                                <td>{driver[col]}</td>
                            ))}
                            <td >
                                <div className='flex justify-center'>
                                    <div onClick={(e) => { e.stopPropagation(); handleDeleteDriver(driver._id, driver.user_ID) }} className={`flex justify-center items-center w-7 h-7 rounded-md p-1 hover:bg-neutral-200  text-red-500`}><FaTrashAlt size={16} /></div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div >
    );
};

export default PersonnelsTable;