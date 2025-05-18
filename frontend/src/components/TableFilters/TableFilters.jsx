import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSites } from '../../features/sites/siteSlice';
import moment from 'moment';
import WeekFilter from '../Calendar/WeekFilter';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";


const TableFilters = ({ state, setters }) => {
    const dispatch = useDispatch();
    const { list: sites, siteStatus } = useSelector((state) => state.sites)

    const { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver } = state
    const { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver } = setters

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())

    }, [siteStatus, dispatch]);

    useEffect(() => {
        if (sites.length > 0) {
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
        generateDatesInRange();
    }, [rangeType, selectedRangeIndex]);


    const generateRangeOptions = () => {
        const options = {};
        let now = moment().startOf('year');
        const end = moment().endOf('year');

        if (rangeType === 'daily') {
            console.log('selectedRangeIndex', selectedRangeIndex)
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
            console.log('selectedRangeIndex', selectedRangeIndex)
            const date = moment(selectedRangeIndex, 'GGGG-[W]WW');
            let now = date.clone().subtract(2, 'weeks').startOf('week');
            const end = date.clone().add(2, 'weeks').endOf('week');
            console.log(end)
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
        <div className='flex justify-around items-center p-3 gap-4  bg-neutral-100/90 dark:bg-dark-4/90 shadow border-[1.5px] border-neutral-300/80 dark:border-dark-5 rounded-lg overflow-auto dark:!text-white' >
            <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold'>Search Personnel Name:</label>
                <input type="text" onChange={(e) => setSearchDriver(e.target.value)} className='dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300 dark:border-dark-5 px-2 py-1 h-10 outline-none focus:border-primary-200' placeholder="Personnel name" />
            </div>
            <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold'>Select Site:</label>
                <select className="dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1 h-10 outline-none focus:border-primary-200 dark:border-dark-5" value={selectedSite} onChange={(e) => setSelectedSite((e.target.value))}>
                    {sites.map((site) => (
                        <option value={site.siteKeyword}>{site.siteName}</option>
                    ))}
                </select>
            </div>
            <div className='flex flex-col items-center justify-center gap-1'>
                <label className='text-xs font-semibold'>Select {rangeType}: </label>
                <div className='flex items-center justify-center w-full h-full gap-2'>
                    <button name="previous" onClick={() => handleForwardOrBackward('previous')} className='dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5'><FaChevronLeft size={13} /></button>
                    {rangeType === 'daily' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'weekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'biweekly' && <WeekFilter value={selectedRangeIndex} type={rangeType} display={rangeOptions[selectedRangeIndex]?.display} onChange={(e) => setSelectedRangeIndex(e)} />}
                    {rangeType === 'monthly' && <WeekFilter value={selectedRangeIndex} type={rangeType} onChange={(e) => setSelectedRangeIndex(e)} />}
                    <button name="next" onClick={() => handleForwardOrBackward('next')} className='dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5'><FaChevronRight size={14} /></button>
                </div>
            </div>
            <div className='flex flex-col gap-1'>
                <label className='text-xs font-semibold'>Timeframe: </label>
                <select className="bg-white rounded-md border-[1.5px] border-neutral-300  px-2 py-1  h-10 outline-none focus:border-primary-200" value={rangeType} onChange={(e) => setRangeType(e.target.value)}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
        </div>
    );
};

export default TableFilters;