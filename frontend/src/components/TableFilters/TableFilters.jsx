import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSites } from '../../features/sites/siteSlice';
import InputGroup from '../InputGroup/InputGroup';
import { RenderStageButton } from '../../pages/ManageSummary/renderStageButton';

import moment from 'moment';
moment.updateLocale('en', {
    week: {
        dow: 0, // Sunday is day 0
    },
});
import WeekFilter from '../Calendar/WeekFilter';
import { FaChevronLeft, FaChevronRight, FaEye } from "react-icons/fa";
import { MdOutlineDelete } from 'react-icons/md';


const TableFilters = ({ title, state, setters, invoiceMap, handleFileChange, selectedInvoices, handleSelectAll, updateInvoiceApprovalStatus }) => {
    const dispatch = useDispatch();
    const summaryFileRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const { userDetails } = useSelector((state) => state.auth);
    const { list: sites, siteStatus } = useSelector((state) => state.sites)

    const { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver } = state
    const { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver } = setters
    const giveManageSummaryOptions = title === "Manage Summary" && userDetails.role !== 'OSM'

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())

    }, [siteStatus, dispatch]);

    useEffect(() => {
        if (sites.length > 0) {
            if (userDetails?.role === 'OSM')
                setSelectedSite(userDetails?.site)
            else if (['Operational Manager', 'Head of Operations'].includes(userDetails?.role)) {
                setSelectedSite(userDetails?.siteArray[0])
            }
            else
                setSelectedSite(sites[0].siteKeyword)
        }
    }, [sites])


    useEffect(() => {
        const defaultIndex =
            rangeType === 'monthly'
                ? moment().format('YYYY-MM')
                : rangeType === 'daily'
                    ? moment().format('YYYY-MM-DD')
                    : moment().format('GGGG-[W]WW');

        setSelectedRangeIndex(defaultIndex);
    }, [rangeType]);


    useEffect(() => {
        generateRangeOptions();
    }, [rangeType, selectedRangeIndex]);

    useEffect(() => {
        generateDatesInRange();
    }, [rangeOptions])

    const generateRangeOptions = () => {
        const options = {};
        let now = moment().startOf('year');
        const end = moment().endOf('year');

        if (rangeType === 'daily') {
            const date = moment(selectedRangeIndex, 'YYYY-MM-DD');
            let now = date.clone().subtract(2, 'days');
            let end = date.clone().add(2, 'days');
            while (now.isSameOrBefore(end)) {
                const label = `${now.format('YYYY-MM-DD')}`
                options[label] = {
                    display: label,
                    start: now.clone(),
                    end: now.clone()
                }
                now = now.add(1, 'day');
            }
        }


        else if (rangeType === 'weekly') {
            const date = moment(selectedRangeIndex, 'GGGG-[W]WW');
            let now = date.clone().subtract(2, 'weeks').startOf('week');
            const end = date.clone().add(2, 'weeks').endOf('week');
            while (now.isBefore(end) || now.isSame(end, 'day')) {
                const start = now.clone().startOf('week');
                const endOfWeek = start.clone().endOf('week');
                const label = `${endOfWeek.format('GGGG-[W]WW')}`
                options[label] = {
                    display: label,
                    start,
                    end: endOfWeek
                }
                now = now.add(1, 'week');
            }
        }
        else if (rangeType === 'biweekly') {
            const date = moment(selectedRangeIndex, 'GGGG-[W]WW');
            let now = date.clone().subtract(2, 'weeks').startOf('week');
            const end = date.clone().add(2, 'weeks').endOf('week');
            while (now.isBefore(end)) {
                const start = now.clone().startOf('week');
                const endOfWeek = start.clone().endOf('week');
                const endOfBiweek = start.clone().add(13, 'days');
                const label = `${endOfWeek.format('GGGG-[W]WW')}`
                options[label] = {
                    display: `${endOfWeek.format('GGGG-[W]WW')} to ${endOfBiweek.format('GGGG-[W]WW')}`,
                    start, start, end: endOfBiweek
                };
                now = now.add(1, 'week');
            }

        }
        else if (rangeType === 'monthly') {
            let date = moment(selectedRangeIndex, "YYYY-MM");
            let now = date.clone().subtract(2, 'month').startOf('month')
            const end = date.clone().add(2, 'month').endOf('month')

            while (now.isBefore(end)) {
                const start = now.clone().startOf('month');
                const endOfMonth = now.clone().endOf('month');
                const label = `${start.format('YYYY-MM')}`;
                options[label] = { start, end: endOfMonth };
                now = now.add(1, 'month');
            }
        }

        setRangeOptions(options);
    };

    const generateDatesInRange = () => {
        let defaultValue = { start: moment(), end: moment() }
        if (rangeType === 'daily') {
            defaultValue = { start: moment(), end: moment(), default: true }
        }
        else if (rangeType === 'monthly') {
            defaultValue = { start: moment().startOf('month'), end: moment().endOf('month'), default: true }
        }
        else if (rangeType === 'weekly') {
            defaultValue = { start: moment().startOf('week'), end: moment().endOf('week'), default: true }
        }
        else {
            defaultValue = { start: moment().startOf('week'), end: moment().add(2, 'week').endOf('week'), default: true }
        }

        const selectedRange = rangeOptions[selectedRangeIndex] || defaultValue

        const days = [];
        let day = selectedRange.start.clone();
        while (day.isSameOrBefore(selectedRange.end)) {
            days.push({ date: day.format('ddd, YYYY-MM-DD'), week: moment(day).startOf('week').add(1, 'days').format('YYYY-[W]WW'), default: selectedRange.default });
            day.add(1, 'day');
        }
        setDays(days)
    };

    const handleForwardOrBackward = (ops) => {
        const rangeOptionKeys = Object.keys(rangeOptions)
        const currentIndex = rangeOptionKeys.indexOf(selectedRangeIndex)
        if (ops === 'previous')
            setSelectedRangeIndex(rangeOptionKeys[currentIndex - 1])
        else
            setSelectedRangeIndex(rangeOptionKeys[currentIndex + 1])
    }


    return (
        <div className={`grid grid-cols-2 ${giveManageSummaryOptions && selectedInvoices.length > 0 ? 'md:grid-cols-5' : 'md:grid-cols-4'} p-3 gap-2 md:gap-5  bg-neutral-100/90 dark:bg-dark-2 shadow border-[1.5px] border-neutral-300/80 dark:border-dark-5 rounded-lg overflow-visible dark:!text-white`} >
            <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold'>Search Personnel Name:</label>
                <input type="text" onChange={(e) => setSearchDriver(e.target.value)} className='dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300 dark:border-dark-5 px-2 py-1 h-8 md:h-10 outline-none focus:border-primary-200' placeholder="Personnel name" />
            </div>
            <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold'>Select Site:</label>
                <select disabled={['OSM'].includes(userDetails?.role)} className="dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1 h-8 md:h-10 outline-none focus:border-primary-200 dark:border-dark-5 disabled:border-gray-200 disabled:text-gray-500" value={selectedSite} onChange={(e) => setSelectedSite((e.target.value))}>
                    {sites
                        .filter(site =>
                            ['Operational Manager', 'Head of Operations'].includes(userDetails?.role)
                                ? userDetails?.siteArray?.includes(site.siteKeyword)
                                : true
                        )
                        .map(site => (
                            <option key={site.siteKeyword} value={site.siteKeyword}>
                                {site.siteName}
                            </option>
                        ))}
                </select>
            </div>
            <div className=' flex flex-col items-center justify-center gap-1'>
                <label className='ml-8 self-start text-xs font-semibold'>Select {rangeType}: </label>
                <div className='relative flex items-center justify-center w-full h-full gap-2'>
                    <button name="previous" onClick={() => handleForwardOrBackward('previous')} className='dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5'><FaChevronLeft size={13} /></button>
                    {rangeType === 'daily' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'weekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'biweekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'monthly' && <WeekFilter value={selectedRangeIndex} type={rangeType} onChange={(e) => setSelectedRangeIndex(e)} />}
                    <button name="next" onClick={() => handleForwardOrBackward('next')} className='dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5'><FaChevronRight size={14} /></button>
                </div>
            </div>
            {
                title !== 'Manage Summary' ? <div className='flex flex-col gap-1'>
                    <label className='text-xs font-semibold'>Timeframe: </label>
                    <select className="bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1 h-8 md:h-10 outline-none focus:border-primary-200 dark:bg-dark-3 dark:border-dark-5" value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div> : giveManageSummaryOptions &&
                <div className='relative'>
                    <InputGroup
                        name='summary-file'
                        inputStyles='!pr-10'
                        type='file'
                        onChange={(e) => { handleFileChange(e); setSelectedFile(e.target.files[0]) }}
                        ref={summaryFileRef}

                    />
                    {selectedFile &&
                        <div className='absolute top-6.5 right-2 flex gap-2'>
                            <button
                                onClick={() => {
                                    summaryFileRef.current.value = "";
                                    setSelectedFile(null)
                                    handleFileChange()
                                }}
                                className=' bg-red-200 text-red-700 rounded-full p-1'
                            >
                                <MdOutlineDelete size={18} />
                            </button>
                        </div>}
                </div >
            }

            {
                title === 'Manage Summary' && selectedInvoices.length > 0 &&
                <div className='w-full flex items-center justify-around gap-1 rounded-md border-[1.5px] max-sm:col-span-2 border-neutral-300 py-1 px-1 mt-2.5 overflow-auto'>
                    <div className=' text-xs'><RenderStageButton selectedInvoices={selectedInvoices} currentInvoice={invoiceMap[selectedInvoices[0]]} updateInvoiceApprovalStatus={updateInvoiceApprovalStatus} /></div>
                    <button name='selectAll' onClick={(e) => handleSelectAll(e)} className='text-white text-xs rounded-md bg-primary-500 px-2 py-1 whitespace-nowrap'>Select All</button>
                    <button name='clear' onClick={(e) => handleSelectAll(e)} className='text-white text-xs rounded-md bg-red-500 px-2 py-1'>Clear</button>
                </div>
            }
        </div >
    );
};

export default TableFilters;