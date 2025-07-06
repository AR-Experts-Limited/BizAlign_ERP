// src/features/ratecards/RateCardTable.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineDelete } from "react-icons/md";
import { FcInfo } from "react-icons/fc";
import InputGroup from '../../components/InputGroup/InputGroup';
import { groupRateCards } from './groupRateCards';
import WeekInput from '../../components/Calendar/WeekInput';
import moment from 'moment'

const RateCardTable = ({ rateCard, toastOpen, ratecards, onDelete, onUpdate, onUpdateActive, mode, loading }) => {
    const [selectedWeeks, setSelectedWeeks] = useState({});
    const [dropdownPositions, setDropdownPositions] = useState({});
    const [groupedRateCards, setGroupedRateCards] = useState([])
    const [selectedGroupUpdate, setSelectedGroupUpdate] = useState(null)
    const [filterVehicleType, setFilterVehicleType] = useState('');
    const [filterWeek, setFilterWeek] = useState('');
    const [filterService, setFilterService] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [glowMap, setGlowMap] = useState({});
    const prevDataRef = useRef([]);
    const dropdownRefs = useRef({});

    useEffect(() => {
        let group = []
        let filteredRatecards = [...ratecards]
        if (filterVehicleType) {
            filteredRatecards = filteredRatecards.filter(rc => rc.vehicleType === filterVehicleType)
        }
        if (filterWeek) {
            filteredRatecards = filteredRatecards.filter(rc => rc.serviceWeek === filterWeek)
        }
        if (filterService) {
            filteredRatecards = filteredRatecards.filter(rc =>
                String(rc.serviceTitle).toLowerCase().includes(filterService.toLowerCase())
            );
        }
        group = groupRateCards(filteredRatecards);

        const newGlowMap = {};

        group.forEach(newItem => {
            const prevItem = prevDataRef.current.find(prev => prev._id === newItem._id);
            if (prevItem) {
                ['serviceRate', 'hourlyRate', 'mileage', 'byodRate'].forEach(field => {
                    if (prevItem[field] !== newItem[field]) {
                        if (!newGlowMap[newItem._id]) newGlowMap[newItem._id] = {};
                        newGlowMap[newItem._id][field] = true;

                        // Remove the glow after 1 second
                        setTimeout(() => {
                            setGlowMap(prev => ({
                                ...prev,
                                [newItem._id]: { ...prev[newItem._id], [field]: false }
                            }));
                        }, 1500);
                    }
                });
            }
        });

        setGlowMap(prev => ({ ...prev, ...newGlowMap }));
        prevDataRef.current = group;

        setGroupedRateCards(group)
    }, [filterVehicleType, filterWeek, filterService, ratecards]);


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
        <div className='relative flex-1 flex flex-col flex-[7] w-full h-full bg-white dark:bg-dark dark:border-dark-3  border border-neutral-300 rounded-lg overflow-auto'>
            <div className='flex justify-between items-center z-5 rounded-t-lg w-full px-5 py-2 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white'>
                <h3>Rate card list</h3>
                <button onClick={() => setIsFilterOpen(prev => !prev)} className={`rounded p-2 hover:bg-gray-200 hover:text-primary-500 ${isFilterOpen && 'bg-gray-200 text-primary-500'}`}><i class="flex items-center text-[1rem] fi fi-rr-filter-list"></i></button>
            </div>

            <div className='flex-1 flex flex-col p-2 overflow-auto h-full'>

                <div className={`flex items-center justify-between rounded-lg mx-3 mb-1 transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-40 p-2 opacity-100 mt-3' : 'max-h-0 opacity-0'
                    } bg-neutral-100/75 dark:bg-dark-2 shadow border-[1.5px] border-neutral-300/70 dark:border-dark-5 rounded-lg overflow-visible dark:!text-white`}>
                    <div className='flex items-center gap-3 px-3'>
                        <p className='text-sm'>Filter By:</p>
                        <div className='flex gap-4'>
                            <select
                                className={`w-32 h-8 text-sm rounded-lg border-[1.5px] border-neutral-300 bg-white ${filterVehicleType === '' && 'text-gray-400'} outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500 px-2 placeholder:text-dark-6 dark:text-white `}
                                value={filterVehicleType}
                                onChange={(e) => setFilterVehicleType(e.target.value)}
                            >
                                <option value=''>-Vehicle Type-</option>
                                <option value='Own Vehicle'>Own vehicle</option>
                                <option value='Company Vehicle'>Company vehicle</option>
                            </select>
                            <div >
                                <WeekInput value={filterWeek} filter={true} onChange={(week) => setFilterWeek(week)} />
                            </div>
                            <div >
                                <input className={`w-32 h-8 text-sm rounded-lg border-[1.5px] border-neutral-300 bg-white outline-none transition focus:border-primary-500 disabled:cursor-default disabled:bg-gray-2 data-[active=true]:border-primary-500 dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary-500 dark:disabled:bg-dark dark:data-[active=true]:border-primary-500 px-2 placeholder:text-dark-6 dark:text-white `}
                                    placeholder="Search by service"
                                    value={filterService} onChange={(e) => setFilterService(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className=" flex-1  px-2 overflow-auto">
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
                            {groupedRateCards
                                .sort((a, b) => Number(b.active) - Number(a.active)) // Active (true) first, inactive (false) last
                                .map((group, index, array) => {
                                    const selectedWeek = selectedWeeks[group._id] || group.serviceWeeks[0];
                                    const selectedIds = (Array.isArray(selectedWeek) ? selectedWeek : []).map((it) => group.weekIdMap[it]);
                                    const currentCard = group.cards.find(card => card.serviceWeek === selectedWeek);

                                    const isFirstInactive = !group.active && (index === 0 || array[index - 1].active);

                                    return (
                                        <>
                                            {isFirstInactive && (
                                                <tr>
                                                    <td colSpan="10" className="!p-1 border-b border-neutral-200 bg-neutral-50 dark:bg-dark-4 text-lg font-light text-gray-700 dark:text-white py-2">
                                                        Disabled
                                                    </td>
                                                </tr>
                                            )}
                                            <tr
                                                key={index}
                                                className={`dark:hover:bg-dark-4 ${!group.active ? 'text-gray-400' : 'dark:text-white'} ${selectedGroupUpdate === group._id && mode === 'edit' ? 'bg-amber-200/30' : 'hover:bg-neutral-50'}`}
                                                ref={(el) => setDropdownRef(el, group._id)}
                                            >
                                                <td className="border-b border-neutral-200">
                                                    <div className="flex justify-center">
                                                        <InputGroup
                                                            type="toggleswitch"
                                                            checked={group.active}
                                                            onChange={(e) => {
                                                                const selectedIdsList = selectedIds.length > 0 ? selectedIds : Array(group.weekIdMap[group.serviceWeeks[0]]);
                                                                onUpdateActive({ selectedIds: selectedIdsList, active: e.target.checked });
                                                                setSelectedWeeks([])
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="border-b border-neutral-200">{group.vehicleType}</td>
                                                <td className="border-b border-neutral-200">£ {group.minimumRate}</td>
                                                <td className="border-b border-neutral-200">{group.serviceTitle}</td>
                                                <td className="border-b border-neutral-200">
                                                    <div className="relative group">
                                                        <button className={`w-full max-h-13 h-fit overflow-auto text-left ${group.serviceWeeks?.length > 1 && 'border-[1.5px] bg-white'} ${group?.serviceWeeks?.some((item) => rateCard?.serviceWeek.includes(item)) && 'border-red-400'} border-neutral-200 rounded-md  px-1 py-2 outline-none focus:border-primary-400`}>
                                                            <div className={`flex flex-nowrap gap-2 ${(selectedWeeks[group._id]?.length > 1) ? 'pb-5' : ''}`}>
                                                                {selectedWeeks[group._id]?.length > 0 ?
                                                                    selectedWeeks[group._id].map((week) => (
                                                                        <div key={week} className="whitespace-nowrap break-keep w-full bg-gray-100 px-1 py-1 rounded-lg text-[0.7rem]">
                                                                            {week}
                                                                        </div>
                                                                    )) : <div>{group.serviceWeeks[0]}</div>}
                                                            </div>
                                                        </button>
                                                        {group.serviceWeeks?.length > 1 && <div className={`absolute z-10 hidden px-3 py-2 w-max bg-white border-[1.5px] border-neutral-200 rounded-md shadow-lg group-focus-within:block group-hover:block ${dropdownPositions[group._id] === 'top' ? 'bottom-full' : 'top-full'}`}>
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
                                                                        {rateCard?.serviceWeek.includes(week) && <i class="flex items-center text-red-500 fi fi-sr-location-exclamation"></i>}
                                                                        {week}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>}
                                                    </div>
                                                </td>
                                                <td className={`border-b border-neutral-200 transition-all duration-600 ease-out ${glowMap[group._id]?.serviceRate ? 'text-orange-400' : ''}`}>£ {group.serviceRate}</td>
                                                <td className={`border-b border-neutral-200 transition-all duration-600 ease-out ${glowMap[group._id]?.hourlyRate ? 'text-orange-400' : ''}`}>{group.hourlyRate > 0 ? `£ ${group.hourlyRate}` : 'N/A'}</td>
                                                <td className={`border-b border-neutral-200 transition-all duration-600 ease-out ${glowMap[group._id]?.mileage ? 'text-orange-400' : ''}`}>£ {group.mileage}</td>
                                                <td className={`border-b border-neutral-200 transition-all duration-600 ease-out ${glowMap[group._id]?.byodRate ? 'text-orange-400' : ''}`}>£ {group.byodRate}</td>
                                                <td className="border-b border-neutral-200">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            disabled={toastOpen || loading}
                                                            onClick={() => {
                                                                setSelectedGroupUpdate(group._id);
                                                                const selectedIdsList = selectedIds.length > 0 ? selectedIds : Array(group.weekIdMap[group.serviceWeeks[0]]);
                                                                const selectedWeekList = selectedWeeks[group._id] || Array(group.serviceWeeks[0]);
                                                                onUpdate({
                                                                    selectedIds: selectedIdsList,
                                                                    hourlyRate: group.hourlyRate,
                                                                    vehicleType: group.vehicleType,
                                                                    minimumRate: group.minimumRate,
                                                                    serviceTitle: group.serviceTitle,
                                                                    serviceWeek: selectedWeekList,
                                                                    mileage: group.mileage,
                                                                    serviceRate: group.serviceRate,
                                                                    byodRate: group.byodRate,
                                                                    vanRent: group.vanRent,
                                                                    vanRentHours: group.vanRentHours,
                                                                });
                                                            }}
                                                            className="p-2 rounded-md hover:bg-neutral-200 text-amber-300 disabled:text-gray-300"
                                                        >
                                                            <FiEdit3 size={17} />
                                                        </button>
                                                        <button
                                                            className="p-2 rounded-md hover:bg-neutral-200 text-red-400 disabled:text-gray-300"
                                                            disabled={toastOpen || loading}
                                                            onClick={() => {
                                                                if (!toastOpen) onDelete(selectedIds.length > 0 ? selectedIds : [group.weekIdMap[group.serviceWeeks[0]]]);
                                                                setSelectedWeeks({});
                                                            }}
                                                        >
                                                            <MdOutlineDelete size={17} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div >
        </div>
    );
};

export default RateCardTable;