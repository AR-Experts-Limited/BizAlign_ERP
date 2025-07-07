import React, { useMemo } from 'react';
import { FaTrashAlt } from "react-icons/fa";
import { FixedSizeList } from 'react-window';
import InputGroup from '../../components/InputGroup/InputGroup';
import { AutoSizer } from 'react-virtualized';

const PersonnelsTable = ({ driversList, columns, userDetails, handleEditDriver, handleDeleteDriver, onDisableDriver }) => {

    const sortedDriversList = useMemo(() => {
        return [...driversList].sort((a, b) => Number(a.disabled) - Number(b.disabled));
    }, [driversList]);

    const Row = ({ index, style }) => {
        const driver = sortedDriversList[index];
        const isFirstInactive = driver.disabled && (index === 0 || !sortedDriversList[index - 1].disabled);

        return (<div className='flex flex-col'>

            <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5px' }} key={driver._id}>
                <div
                    className={`${driver.disabled ? 'bg-gray-100 text-gray-400' : ''} cursor-pointer hover:bg-gray-50 flex w-full`}
                    onClick={() => !driver.disabled ? handleEditDriver(driver) : null}
                >
                    <div className="flex justify-center items-center p-3 text-center w-15 max-w-15 text-sm border-b border-gray-300">{index + 1}</div>

                    <div className="flex justify-center items-center p-3 text-center w-32 max-w-32 border-b border-gray-300">
                        <div
                            className="flex justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <InputGroup
                                type="toggleswitch"
                                checked={!driver.disabled}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onDisableDriver({
                                        driver,
                                        email: driver.Email,
                                        disabled: !e.target.checked,
                                    });
                                }}
                            />
                        </div>
                    </div>

                    <div className="p-3 text-center w-30 max-w-30 border-b border-gray-300">
                        <div className="flex justify-center items-center w-full group relative">
                            <div className="z-0 flex justify-center items-center bg-gray-100 w-12 h-12 rounded-full border border-gray-300 overflow-hidden">
                                {driver.profilePicture.length < 1 ? (
                                    <i className="flex items-center text-base text-gray-400 fi fi-sr-driver-man" />
                                ) : (
                                    <img src={driver.profilePicture[0].original} alt="Profile" loading="lazy" />
                                )}
                            </div>
                            {driver.profilePicture?.length > 0 && (
                                <div className="z-10 border border-gray-100 rounded-lg overflow-hidden scale-0 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 delay-500 origin-top-left block h-44 w-44 absolute top-1/2 left-12">
                                    <img src={driver.profilePicture[0].original} alt="Profile Preview" loading="lazy" />
                                </div>
                            )}
                        </div>
                    </div>

                    {Object.values(columns).map((col, i) => (
                        <div key={`${driver._id}-${i}`} className="flex-1 flex items-center justify-center p-3 text-center min-w-32 text-sm border-b border-gray-300">
                            {driver[col] ? driver[col] : '-'}
                        </div>
                    ))}

                    {['Admin', 'super-admin'].includes(userDetails.role) && <div className="flex items-center justify-center p-3 text-center w-20 border-b border-gray-300">
                        <div className="flex justify-center">
                            <button
                                disabled={driver.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDriver(driver._id, driver.siteSelection, driver.user_ID);
                                }}
                                className="flex justify-center items-center w-7 h-7 rounded-md p-1 hover:bg-gray-200 text-red-500 disabled:text-gray-400"
                            >
                                <FaTrashAlt size={16} />
                            </button>
                        </div>
                    </div>}
                </div>
            </div>
        </div>);
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="w-full flex text-sm md:text-base sticky top-0 bg-white z-8 text-gray-400 border-b border-gray-300">
                <div className="font-light py-2 px-0 text-center w-15 max-w-15">#</div>
                <div className="font-light py-2 px-2 text-center w-32 max-w-32 break-words whitespace-normal">Enable/Disable</div>
                <div className="font-light py-2 px-2 text-center w-30 max-w-30">Profile picture</div>
                {Object.keys(columns).map((col) => (
                    <div key={col} className="flex-1 font-light py-2 px-0 text-center min-w-32">{col}</div>
                ))}
                {['Admin', 'super-admin'].includes(userDetails.role) && <div className="font-light py-2 px-0 text-center w-20">Options</div>}
            </div>

            {/* Body */}
            <div className='flex-1 h-full'>
                <AutoSizer>
                    {({ width, height }) => {
                        return (
                            <FixedSizeList
                                height={height}
                                width={width}
                                itemCount={sortedDriversList.length}
                                itemSize={70}
                            >
                                {Row}
                            </FixedSizeList>)
                    }}
                </AutoSizer>
            </div>
        </div>
    );
};

export default PersonnelsTable;
