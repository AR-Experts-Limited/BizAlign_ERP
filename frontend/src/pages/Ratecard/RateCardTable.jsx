// src/features/ratecards/RateCardTable.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineDelete } from "react-icons/md";
import { FcInfo } from "react-icons/fc";
import InputGroup from '../../components/InputGroup/InputGroup';
import { groupRateCards } from './groupRateCards';

const RateCardTable = ({ ratecards, filterVehicleType, onFilterChange, onDelete }) => {
    const [selectedWeeks, setSelectedWeeks] = useState({});
    const [dropdownPositions, setDropdownPositions] = useState({});
    const [groupedRateCards, setGroupedRateCards] = useState([])
    const dropdownRefs = useRef({});

    useEffect(() => {
        let group = []
        group = groupRateCards(filterVehicleType
            ? ratecards.filter(rc => rc.vehicleType === filterVehicleType)
            : ratecards);
        setGroupedRateCards(group)
    }, [filterVehicleType, ratecards]);


    //const groupedRateCards = groupRateCards(filteredRatecards);

    const handleWeekSelect = (groupId, week) => {
        setSelectedWeeks(prev => ({ ...prev, [groupId]: week }));
    };

    const setDropdownRef = (el, groupId) => {
        dropdownRefs.current[groupId] = el;
    };

    useEffect(() => {
        const calculatePositions = () => {
            const newPositions = {};
            Object.keys(dropdownRefs.current).forEach(groupId => {
                const element = dropdownRefs.current[groupId];
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;
                    newPositions[groupId] = rect.bottom > viewportHeight - 200 ? 'top' : 'bottom';
                }
            });
            setDropdownPositions(newPositions);
        };
        if (groupRateCards.length > 0) {
            calculatePositions();
            window.addEventListener('resize', calculatePositions);
            return () => window.removeEventListener('resize', calculatePositions);
        }
    }, [groupedRateCards]);

    return (
        <div className='max-h-[40rem] relative md:col-span-7 w-full bg-white dark:bg-dark dark:border-dark-3 shadow-lg border border-neutral-300 rounded-lg'>
            <div className='z-5 rounded-t-lg w-full p-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                <h3>Rate card list</h3>
            </div>

            <div className='flex items-center justify-between p-2 rounded-lg border border-neutral-200 mx-3 mt-3'>
                <div className='flex items-center gap-3'>
                    <p className='text-sm'>Filter By:</p>
                    <select
                        className='w-30 h-8 text-sm rounded-lg border-[1.5px] border-neutral-300 bg-transparent outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500 px-5.5 placeholder:text-dark-6 dark:text-white'
                        value={filterVehicleType}
                        onChange={(e) => onFilterChange(e.target.value)}
                    >
                        <option value=''>-Vehicle Type-</option>
                        <option value='Own Vehicle'>Own vehicle</option>
                        <option value='Company Vehicle'>Company vehicle</option>
                    </select>
                </div>
            </div>

            <div className="max-h-[32.5rem] h-full px-2 overflow-auto">
                <table className="ratecard-table w-full text-sm text-center">
                    <thead>
                        <tr className="sticky top-0 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                            <th>Status</th>
                            <th>Vehicle Type</th>
                            <th>Minimum Rate</th>
                            <th>Service Title</th>
                            <th className='!w-24'>Service Week</th>
                            <th>Service Rate</th>
                            <th>Hourly Rate</th>
                            <th>Mileage</th>
                            <th>Byod Rate</th>
                            <th>Options</th>
                            {/* <th>Added by</th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRateCards.map((group, index) => {
                            const selectedWeek = selectedWeeks[group._id] || group.serviceWeeks[0];
                            const selectedIds = (Array.isArray(selectedWeek) ? selectedWeek : []).map((it) => group.weekIdMap[it]);
                            const currentCard = group.cards.find(card => card.serviceWeek === selectedWeek);

                            return (
                                <tr
                                    key={index}
                                    className={`hover:bg-neutral-50 dark:hover:bg-dark-4 ${!group.active ? 'text-gray-400' : 'dark:text-white'}`}
                                    ref={(el) => setDropdownRef(el, group._id)}
                                >
                                    <td className="border-b border-neutral-200">
                                        <div className="flex justify-center">
                                            <InputGroup type="toggleswitch" checked={group.active} />
                                        </div>
                                    </td>
                                    <td className="border-b border-neutral-200">
                                        {group.vehicleType}
                                    </td>
                                    <td className="border-b border-neutral-200">£ {group.minimumRate}</td>
                                    <td className="border-b border-neutral-200">{group.serviceTitle}</td>
                                    <td className="border-b border-neutral-200">
                                        <div className="relative group">
                                            <button className="w-full max-h-13 h-fit overflow-auto text-left border-[1.5px] border-neutral-200 rounded-md bg-white px-1 py-2 outline-none focus:border-primary-400">
                                                <div className={`flex flex-nowrap gap-2 ${(selectedWeeks[group._id]?.length > 1) ? 'pb-5' : ''}`}>
                                                    {selectedWeeks[group._id]?.length > 0 ?
                                                        selectedWeeks[group._id].map((week) => (
                                                            <div key={week} className="whitespace-nowrap break-keep w-full bg-gray-100 px-1 py-1 rounded-lg text-[0.7rem]">
                                                                {week}
                                                            </div>)) : <div>{group.serviceWeeks[0]}</div>}
                                                </div>
                                            </button>

                                            <div className={`absolute z-10 hidden px-3 py-2 w-max bg-white border-[1.5px] border-neutral-200 rounded-md shadow-lg group-hover:block ${dropdownPositions[group._id] === 'top'
                                                ? 'bottom-full '
                                                : 'top-full'
                                                }`}>
                                                <div className="max-h-30 overflow-y-auto pr-3">
                                                    <div>
                                                        <label className="flex items-center gap-3 mb-1 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedWeeks[group._id]?.length === group.serviceWeeks.length}
                                                                onChange={(e) => {
                                                                    const allWeeks = group.serviceWeeks;
                                                                    setSelectedWeeks((prev) => ({
                                                                        ...prev,
                                                                        [group._id]: e.target.checked ? allWeeks : [],
                                                                    }));
                                                                }}
                                                            />
                                                            Select All
                                                        </label>
                                                    </div>
                                                    {group.serviceWeeks.map((week, i) => (
                                                        <label key={i} className="flex items-center gap-3 mb-1 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedWeeks[group._id]?.includes(week) || false}
                                                                onChange={(e) => {
                                                                    const prevSelected = selectedWeeks[group._id] || [];
                                                                    const updated = e.target.checked
                                                                        ? [...prevSelected, week]
                                                                        : prevSelected.filter((w) => w !== week);
                                                                    setSelectedWeeks((prev) => ({
                                                                        ...prev,
                                                                        [group._id]: updated,
                                                                    }));
                                                                }}
                                                            />
                                                            {week}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="border-b border-neutral-200">£ {group.serviceRate}</td>
                                    <td className="border-b border-neutral-200">£ {group.hourlyRate}</td>
                                    <td className="border-b border-neutral-200">£ {group.mileage}</td>
                                    <td className="border-b border-neutral-200">£ {group.byodRate}</td>
                                    <td className="border-b border-neutral-200">
                                        <div className="flex justify-center gap-2">
                                            <button className="p-2 rounded-md hover:bg-neutral-200 text-amber-300">
                                                <FiEdit3 size={17} />
                                            </button>
                                            <button
                                                className="p-2 rounded-md hover:bg-neutral-200 text-red-400"
                                                onClick={() => { onDelete(selectedIds.length > 0 ? selectedIds : [group.weekIdMap[group.serviceWeeks[0]]]); setSelectedWeeks({}) }}
                                            >
                                                <MdOutlineDelete size={17} />
                                            </button>
                                        </div>
                                    </td>
                                    {/* <td className="border-b border-neutral-200">
                                        <div className="relative flex justify-center cursor-pointer group">
                                            <div className="z-4 absolute -left-5 -top-5 text-white -translate-x-1/2 whitespace-normal break-words rounded-sm bg-black/40 mt-1 backdrop-blur-md p-2 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity dark:bg-dark-4">
                                                Added By: {group?.addedBy?.name} on {new Date(group.dateAdded).toLocaleDateString()}
                                            </div>
                                            <FcInfo size={18} />
                                        </div>
                                    </td> */}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div >
    );
};

export default RateCardTable;