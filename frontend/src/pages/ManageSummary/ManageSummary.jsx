import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import TableStructure from '../../components/TableStructure/TableStructure';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import moment from 'moment';
import axios from 'axios';
import Modal from '../../components/Modal/Modal'
import InputWrapper from '../../components/InputGroup/InputWrapper';
import Papa from "papaparse";
import { RenderStageButton } from './renderStageButton';
import InputGroup from '../../components/InputGroup/InputGroup';
import { FcApproval, FcClock, FcTodoList, FcHighPriority, FcCheckmark } from "react-icons/fc";
import { BsCheckCircleFill } from "react-icons/bs";
import { AiOutlineClockCircle } from "react-icons/ai";
import { compareServiceStrings } from './similarity'
import { fetchRatecards } from '../../features/ratecards/ratecardSlice';
import { fetchServices } from '../../features/services/serviceSlice';
import { getIncentiveDetails } from '../Rota/supportFunctions';
import SuccessTick from '../../components/UIElements/SuccessTick'
import TrashBin from '../../components/UIElements/TrashBin'
import Spinner from '../../components/UIElements/Spinner'


const API_BASE_URL = import.meta.env.VITE_API_URL;
const stageIcons = {
    "Access Requested": <FcHighPriority size={22} />,
    "Under Edit": <i class="flex items-center text-amber-500 fi fi-rr-pen-square"></i>,
    "Under Approval": <i class="flex items-center text-sky-500 fi fi-rs-memo-circle-check"></i>,
    "Invoice Generation": <FcClock className='!text-primary-500' size={25} />,
    "completed": <BsCheckCircleFill className="text-green-600 text-xl" />
};

const ManageSummary = () => {
    const dispatch = useDispatch()
    const [rangeType, setRangeType] = useState('weekly');
    const [rangeOptions, setRangeOptions] = useState({});
    const [selectedRangeIndex, setSelectedRangeIndex] = useState();
    const [selectedSite, setSelectedSite] = useState('');
    const [driversList, setDriversList] = useState([]);
    const [standbydriversList, setStandbydriversList] = useState([]);
    const [searchDriver, setSearchDriver] = useState('');
    const [days, setDays] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [invoiceMap, setInvoiceMap] = useState({});
    const [cacheRangeOption, setCacheRangeOption] = useState(null);
    const [prevRangeType, setPrevRangeType] = useState(rangeType);
    const [csvData, setCsvData] = useState([])
    const [currentInvoice, setCurrentInvoice] = useState(null)
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const originalMilesRef = useRef(null);
    const originalServiceRef = useRef(null);
    const events = useSelector((state) => state.sse.events);
    const error = useSelector((state) => state.sse.error);
    const connected = useSelector((state) => state.sse.connected);
    const { list: services, serviceStatus } = useSelector((state) => state.services);
    const { list: ratecards, ratecardStatus } = useSelector((state) => state.ratecards);
    const [visionIds, setVisionIds] = useState([])
    const [visionTracker, setVisionTracker] = useState('')
    const [toastOpen, setToastOpen] = useState(false)

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList };
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList };

    useEffect(() => {
        if (ratecardStatus === 'idle') dispatch(fetchRatecards());
        if (serviceStatus === 'idle') dispatch(fetchServices());
    }, [serviceStatus, dispatch]);

    useEffect(() => {
        if (events && (events.type === "approvalStatusUpdated")) {
            console.log("Approval updated! Refetching...");
            const updatedInvoices = events.data;

            setInvoices(prev =>
                prev.map((im) => {
                    const updated = updatedInvoices.find(u => u._id === im._id);
                    return updated ? updated : im;
                })
            );
        }
    }, [events]);

    useEffect(() => {
        if (driversList.length > 0 && rangeOptions) {
            const rangeOptionsVal = Object.values(rangeOptions);
            const fetchInvoices = async () => {
                const response = await axios.get(`${API_BASE_URL}/api/dayInvoice`, {
                    params: {
                        driverId: driversList.map((driver) => driver._id),
                        startdate: new Date(new Date(moment(rangeOptionsVal[2]?.start).format('YYYY-MM-DD')).setHours(0, 0, 0, 0)),
                        enddate: new Date(new Date(moment(rangeOptionsVal[2]?.end).format('YYYY-MM-DD')).setHours(0, 0, 0, 0)),
                    },
                });
                setInvoices(response.data.sort((a, b) => a.driverName.localeCompare(b.driverName)));
            };

            // if (!cacheRangeOption) {
            //     fetchInvoices();
            //     setCacheRangeOption(rangeOptions);
            // }
            // else if (!(Object.keys(cacheRangeOption).find((i) => i === selectedRangeIndex)) ||
            //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
            //     Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)) {
            //     fetchInvoices();
            //     setCacheRangeOption(rangeOptions);
            // }
            fetchInvoices()
        }
        setSelectedInvoices([])
        setVisionIds([])
        setVisionTracker('')

    }, [rangeOptions, driversList]);


    useEffect(() => {
        const updateInvoices = async () => {
            const map = {};
            let directInvoiceGen = [];

            for (const invoice of invoices) {
                if (invoice.site !== selectedSite) continue;

                const invoiceDate = new Date(invoice.date).toLocaleDateString();
                const invoiceDriverName = String(invoice.driverName?.trim()).toLowerCase();
                const invoiceTransporterName = String(
                    driversList.find((driver) => driver._id === invoice.driverId)?.transporterName?.trim()
                ).toLowerCase();
                const invoiceService = invoice.mainService?.trim();

                const existingCsvData = invoice.csvData || null;
                let matchedCsv = null;

                // First, try matching with driverName
                const driverKey = `${invoiceDate}_${invoiceDriverName}`;
                matchedCsv = existingCsvData || csvData[driverKey] || null;

                // If no match and transporterName exists, try matching with transporterName
                if (!matchedCsv && invoiceTransporterName) {
                    const transporterKey = `${invoiceDate}_${invoiceTransporterName}`;
                    matchedCsv = csvData[transporterKey] || null;
                }

                const dateKey = new Date(invoice.date).toLocaleDateString('en-UK');
                const mapKey = `${dateKey}_${invoice.driverId}`;

                const csvService = matchedCsv ? matchedCsv['Service Type'] : null;
                const similarity = matchedCsv ? compareServiceStrings(invoiceService, csvService) : {};

                map[mapKey] = {
                    invoice,
                    matchedCsv: matchedCsv ? { ...matchedCsv, similarity } : null,
                };

                if (matchedCsv && invoice.approvalStatus === 'Access Requested') {
                    const match =
                        Number(invoice?.miles) === Number(matchedCsv?.['Total Distance Allowance']) &&
                        similarity.isSimilar;
                    if (match) {
                        let invoiceMatch = { ...invoice, approvalStatus: 'Under Approval' };
                        directInvoiceGen.push({
                            id: invoice._id,
                            updateData: { approvalStatus: 'Invoice Generation', csvData: matchedCsv },
                        });
                    }
                }
            }

            if (directInvoiceGen.length > 0) {
                try {
                    const response = await axios.put(
                        `${API_BASE_URL}/api/dayInvoice/updateApprovalStatusBatch`,
                        {
                            updates: directInvoiceGen,
                            site: selectedSite,
                        }
                    );
                    const updatedInvoices = response.data.updated;

                    updatedInvoices.map((upinv) => {
                        const dateKey = new Date(upinv.date).toLocaleDateString('en-UK');
                        const mapKey = `${dateKey}_${upinv.driverId}`;
                        map[mapKey] = {
                            upinv,
                            matchedCsv: upinv.csvData,
                        };
                    })

                } catch (error) {
                    console.error('Error updating invoices:', error);
                    // Handle error as needed
                }
            }

            setInvoiceMap(map);
        };

        updateInvoices();
    }, [invoices, csvData, selectedSite]);


    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions]);

    const handleFileChange = (e) => {
        setVisionIds([])
        setVisionTracker('')
        if (!e) {
            setCsvData({})
            return
        }
        const requiredColumns = ["Date", "Delivery Associate", "Service Type", "Planned Duration", "Total Distance Allowance"];
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target.result;

            Papa.parse(csvContent, {
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    const allData = result.data; // Full parsed data
                    const csvLookup = {};
                    // Filter only the desired columns
                    const filteredData = allData.map((row) => {
                        const filteredRow = {};
                        requiredColumns.forEach((col) => {
                            filteredRow[col] = row[col];
                        });
                        return filteredRow;
                    });


                    // Step 1: Preprocess CSV data into a map
                    filteredData.forEach(csv => {
                        const csvDate = new Date(moment(csv.Date, 'DD/MM/YYYY')).toLocaleDateString();
                        const csvName = String(csv['Delivery Associate']?.trim()).toLowerCase();
                        const key = `${csvDate}_${csvName}`;

                        const serviceType = csv['Service Type']?.trim();
                        const plannedDuration = csv['Planned Duration']?.trim();
                        const totalDistance = parseFloat(csv['Total Distance Allowance']) || 0;

                        if (csvLookup[key]) {
                            // Add distance and append service info
                            csvLookup[key]['Total Distance Allowance'] += totalDistance;
                        } else {
                            // Create new entry
                            csvLookup[key] = {
                                ...csv,
                                'Service Type': `${serviceType} - ${plannedDuration}`,
                                'Total Distance Allowance': totalDistance
                            };
                        }
                    });
                    setCsvData(csvLookup);
                },
                error: (error) => {
                    setError("Error parsing CSV file: " + error.message);
                },
            });
        };

        reader.readAsText(file);
    }

    const handleSelectAll = (e) => {
        let allSelectedInvoices = new Set()
        if (e.target.name === 'selectAll') {
            const selectedApprovalStatus = invoiceMap[selectedInvoices[0]]?.invoice.approvalStatus
            allSelectedInvoices.add(selectedInvoices[0])
            Object.keys(invoiceMap).map((invKey) => {
                if (invoiceMap[invKey]?.invoice.approvalStatus === selectedApprovalStatus && invoiceMap[invKey]?.matchedCsv) {
                    allSelectedInvoices.add(invKey)
                }
            })
        }
        setSelectedInvoices([...allSelectedInvoices])
    }

    const updateInvoiceApprovalStatus = async (currentInvoice) => {
        const stages = [
            "Access Requested",
            "Under Edit",
            "Under Approval",
            "Invoice Generation",
            "completed"
        ];

        let { invoice, matchedCsv, matchingRatecard } = currentInvoice
        const currentStatus = invoice.approvalStatus;
        const nextStatusIndex = stages.indexOf(currentStatus) + 1;
        let prevRateOnlyTotal = invoice.serviceRateforMain + invoice.byodRate + invoice.calculatedMileage
        invoice = matchingRatecard ? { ...invoice, serviceRateforMain: matchingRatecard.serviceRate, byodRate: matchingRatecard.byodRate, mileage: matchingRatecard.mileage } : invoice

        if (nextStatusIndex >= stages.length) {
            console.warn("Already at final stage.");
            return;
        }

        let updatedInvoice = []
        if (selectedInvoices.length > 0) {
            updatedInvoice = selectedInvoices.map((sinvoiceKey) => {
                const invoice = invoiceMap[sinvoiceKey].invoice
                const matchedCsv = invoiceMap[sinvoiceKey]?.matchedCsv || null
                const nextStatusIndex = stages.indexOf(invoice.approvalStatus) + 1;
                return ({
                    id: invoice._id,
                    updateData: {
                        miles: invoice.miles,
                        calculatedMileage: Number((invoice.miles * invoice.mileage).toFixed(2)),
                        total: invoice.total - invoice.calculatedMileage + Number((invoice.miles * invoice.mileage).toFixed(2)),
                        approvalStatus: stages[nextStatusIndex],
                        csvData: matchedCsv

                    }
                })
            })
        }
        else
            updatedInvoice = [{
                id: invoice._id,
                updateData: {
                    mainService: invoice.mainService,
                    serviceRateforMain: invoice.serviceRateforMain,
                    byodRate: invoice.byodRate,
                    mileage: invoice.mileage,
                    miles: invoice.miles,
                    incentiveDetailforMain: invoice.incentiveDetailforMain,
                    calculatedMileage: Number((invoice.miles * invoice.mileage).toFixed(2)),
                    total: (invoice.total - (prevRateOnlyTotal || 0)) + invoice.serviceRateforMain + invoice.byodRate + Number((invoice.miles * invoice.mileage).toFixed(2)),
                    approvalStatus: stages[nextStatusIndex],
                    csvData: matchedCsv

                }
            }];

        try {
            setLoading(true)
            const response = await axios.put(`${API_BASE_URL}/api/dayInvoice/updateApprovalStatusBatch`, {
                updates: updatedInvoice,
                site: selectedSite
            });
            setLoading(false)
            const updatedInvoices = response.data.updated;

            setInvoices(prev =>
                prev.map((im) => {
                    const updated = updatedInvoices.find(u => u._id === im._id);
                    return updated ? updated : im;
                })
            );
            setCurrentInvoice(null)

        } catch (error) {
            setCurrentInvoice(null)
            console.error("Failed to update invoice:", error);
            setToastOpen({
                content: <>
                    <p className='flex gap-1 text-sm font-bold text-red-600'><i class="flex items-center fi fi-ss-triangle-warning"></i>{error?.response?.data?.message}</p>
                </>
            })
            setTimeout(() => setToastOpen(null), 3000);
        }
    };


    const tableData = (driver, day, disableDriver, standbyDriver) => {
        const dateObj = new Date(day.date);
        const dateKey = dateObj.toLocaleDateString('en-UK');
        const key = `${dateKey}_${driver._id}`;
        const invoice = invoiceMap[key]?.invoice;
        const matchedCsv = invoiceMap[key]?.matchedCsv;
        const disabledSelection = (invoice && selectedInvoices.length > 0 && key !== selectedInvoices[0] && invoiceMap[selectedInvoices[0]]?.invoice.approvalStatus !== invoice.approvalStatus) ? true : false
        const invoiceBelongstoSite = invoice?.site === selectedSite

        return (
            <div key={day.date} name={invoice?._id} className={`w-full h-full `}>
                {(() => {
                    // Render invoice cell
                    if (invoice && invoiceBelongstoSite) {
                        return (
                            <div className={`relative flex justify-center h-full w-full`}>
                                <div className='relative max-w-40 w-full'>
                                    <div

                                        onClick={(e) => {
                                            if (!matchedCsv || disabledSelection) return;

                                            if (e.metaKey || e.ctrlKey) {
                                                setSelectedInvoices(prev =>
                                                    prev.includes(key)
                                                        ? prev.filter(k => k !== key)
                                                        : [...prev, key]
                                                );
                                            }
                                            else if (selectedInvoices.some((k) => k === key)) {
                                                setSelectedInvoices(prev =>
                                                    prev.filter(k => k !== key)
                                                );
                                            }
                                            else {
                                                setCurrentInvoice({ ...invoiceMap[key] });
                                                originalMilesRef.current = invoiceMap[key]?.invoice?.miles
                                                originalServiceRef.current = invoiceMap[key]?.invoice?.mainService
                                            }
                                        }}
                                        className={`relative z-6 w-full h-full flex flex gap-2  items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border 
                                        ${visionTracker?.invoice?._id === invoice?._id && 'bg-yellow-100'}
                                        ${disabledSelection && '!text-gray-300 !pointers-event-none'}
                                            ${!matchedCsv
                                                ? 'border-dashed border-gray-300'
                                                : selectedInvoices.includes(key)
                                                    ? 'border-2 border-primary-700'
                                                    : 'border-gray-300 dark:border-dark-5  cursor-pointer'} 
                                             rounded-md text-sm p-2 `}
                                    >
                                        <div className='overflow-auto max-h-[4rem]'>{invoice?.mainService} {!invoiceBelongstoSite && <span className='bg-amber-400/40 rounded text-amber-800 text-[0.7rem] py-0.5 px-1'>{invoice?.site}</span>}</div>

                                        {matchedCsv && invoiceBelongstoSite && (
                                            <div className="h-7 w-7 flex justify-center items-center bg-white border border-stone-200 shadow-sm rounded-full p-[5px]">
                                                {invoice?.approvalStatus && stageIcons[invoice.approvalStatus]}
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        )
                    }
                })()}
            </div>
        )
    }

    const handleServiceTypeChange = async (e) => {
        const selectedService = e.target.value;
        const originalService = originalServiceRef.current;

        if (selectedService === originalService) {
            setCurrentInvoice(prev => ({
                ...prev,
                invoice: { ...prev.invoice, mainService: selectedService },
                restrictEdit: false
            }));
            return;
        }

        const invoice = currentInvoice?.invoice;
        const isMatchingService = services.find(service =>
            compareServiceStrings(service.title, selectedService).isSimilar
        );

        const matchingRatecard = isMatchingService
            ? ratecards.find(rc =>
                rc.serviceTitle === isMatchingService.title &&
                rc.serviceWeek === invoice?.serviceWeek &&
                rc.vehicleType === invoice?.driverVehicleType
            )
            : null;

        const incentives = matchingRatecard
            ? await getIncentiveDetails(isMatchingService.title, invoice?.site, invoice?.date)
            : [];

        const oldIncentiveRate = invoice?.incentiveDetailforMain?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0;
        const newIncentiveRate = incentives?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0;

        const deductionTotal = invoice?.deductionDetail?.reduce((sum, ded) => sum + Number(ded.rate || 0), 0) || 0;

        const potentialTotal = matchingRatecard
            ? matchingRatecard.serviceRate +
            matchingRatecard.byodRate +
            (invoice?.miles * matchingRatecard.mileage) +
            newIncentiveRate -
            deductionTotal
            : invoice?.total;

        let restrictEdit = false;

        if (potentialTotal < 0) {
            restrictEdit = 'Cannot allow edit: The invoice total would become negative';
        } else if (!isMatchingService || !matchingRatecard) {
            restrictEdit = 'Ratecard unavailable for selected service, week and vehicle type';
        }

        setCurrentInvoice(prev => ({
            ...prev,
            matchingRatecard,
            invoice: {
                ...prev.invoice,
                mainService: isMatchingService ? isMatchingService.title : prev.invoice.mainService,
                incentiveDetailforMain: incentives,
                total: parseFloat((prev.invoice.total - oldIncentiveRate + newIncentiveRate).toFixed(2)),
            },
            restrictEdit
        }));
    };


    const handleMilesChange = (e) => {
        const newMiles = e.target.value
        let restrictEdit = false
        const potentialTotal = currentInvoice?.invoice.total - (currentInvoice?.invoice.calculatedMileage) + (currentInvoice?.invoice.mileage * newMiles)
        if (potentialTotal < 0) {
            restrictEdit = 'Cannot allow edit: The invoice total would become negative'
        }
        setCurrentInvoice(prev => ({ ...prev, invoice: { ...prev.invoice, miles: newMiles }, restrictEdit }))
    }


    return (
        <>
            <div className={`${toastOpen ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-4 justify-around items-center'>
                    {toastOpen?.content}
                </div>
            </div>
            <div className={`${processing ? 'opacity-100 translate-y-16' : 'opacity-0'} transition-all ease-in duration-200 border border-stone-200 fixed flex justify-center items-center z-50 backdrop-blur-sm top-4 left-1/2 -translate-x-1/2 bg-stone-400/20 dark:bg-dark/20 p-3 rounded-lg shadow-lg`}>
                <div className='flex gap-2 text-gray-500 justify-around items-center'>
                    <Spinner /> Processing...
                </div>
            </div>
            <TableStructure title={'Manage Summary'}
                state={state}
                setters={setters}
                tableData={tableData}
                invoiceMap={invoiceMap}
                manageSummaryLoading={loading}
                handleFileChange={handleFileChange}
                selectedInvoices={selectedInvoices}
                handleSelectAll={handleSelectAll}
                updateInvoiceApprovalStatus={updateInvoiceApprovalStatus}
                setVisionIds={setVisionIds}
                visionIds={visionIds}
                visionTracker={visionTracker}
                setVisionTracker={setVisionTracker} />

            <Modal isOpen={currentInvoice} onHide={() => setCurrentInvoice(null)}>
                {(() => {
                    const misMatchMiles = (Number(currentInvoice?.invoice?.miles)) !== Number(currentInvoice?.matchedCsv?.['Total Distance Allowance']) ? true : false
                    const misMatchServiceType = currentInvoice && !compareServiceStrings(currentInvoice?.invoice?.mainService, currentInvoice?.matchedCsv?.['Service Type'])?.isSimilar

                    return (<>
                        <h2 className="text-lg px-4 py-2 border-b border-neutral-300">Invoice Comparison</h2>
                        <div className="p-6">
                            <div className='grid grid-cols-2 '>
                                <strong>Driver Name:</strong>
                                <p>{currentInvoice?.invoice?.driverName}</p>
                                <strong>Date:</strong>
                                <p className='text-left'> {new Date(currentInvoice?.invoice?.date).toLocaleDateString()}</p>
                            </div>
                            <div className="w-full my-8 ">
                                <table className="w-full table-auto border border-gray-300 rounded-md overflow-hidden text-sm">
                                    <thead className="bg-gray-300 text-left text-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 border-r border-gray-300">Field</th>
                                            <th className="px-4 py-2">CSV Data</th>
                                            <th className="px-4 py-2 border-r border-gray-300">Invoice Data</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-gray-200">
                                            <td className="px-4 py-2 font-medium text-gray-700">Service</td>
                                            <td className={`px-4 py-2 ${misMatchServiceType ? 'text-red-500' : 'text-green-600'
                                                }`}>
                                                {currentInvoice?.matchedCsv['Service Type'].trim() !== '-' ? currentInvoice?.matchedCsv['Service Type'] : 'N/A'}
                                            </td>
                                            <td className={`px-4 py-2 ${misMatchServiceType ? 'text-red-500' : 'text-green-600'
                                                }`}>
                                                {currentInvoice?.invoice.approvalStatus == 'Under Edit' && originalServiceRef.current !== currentInvoice?.matchedCsv['Service Type']?.trim() ?
                                                    <InputGroup type='dropdown' onChange={(e) => handleServiceTypeChange(e)}>
                                                        <option value={originalServiceRef.current}>{originalServiceRef.current}</option>
                                                        {currentInvoice?.matchedCsv['Service Type']?.trim() !== '-' && <option value={currentInvoice?.matchedCsv['Service Type']?.trim()}>{currentInvoice?.matchedCsv['Service Type']?.trim()}</option>}
                                                    </InputGroup> :
                                                    currentInvoice?.invoice?.mainService}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                            <td className="px-4 py-2 font-medium text-gray-700">Miles / Distance</td>
                                            <td
                                                className={`px-4 py-2 ${misMatchMiles ? 'text-red-500' : 'text-green-600'
                                                    }`}
                                            >
                                                {currentInvoice?.matchedCsv["Total Distance Allowance"] || 'N/A'}
                                            </td>
                                            <td
                                                className={`px-4 py-2 ${misMatchMiles ? 'text-red-500' : 'text-green-600'
                                                    }`}
                                            >
                                                {currentInvoice?.invoice.approvalStatus == 'Under Edit' && originalMilesRef.current !== currentInvoice?.matchedCsv["Total Distance Allowance"] ?
                                                    <InputGroup type='dropdown' onChange={(e) => handleMilesChange(e)}>
                                                        <option value={originalMilesRef.current}>{originalMilesRef.current}</option>
                                                        {currentInvoice?.matchedCsv["Total Distance Allowance"] && <option value={currentInvoice?.matchedCsv["Total Distance Allowance"]}>{currentInvoice?.matchedCsv["Total Distance Allowance"]}</option>}
                                                    </InputGroup> :
                                                    currentInvoice?.invoice?.miles}
                                            </td>

                                        </tr>
                                    </tbody>
                                </table>

                            </div>
                            {currentInvoice?.restrictEdit && <div className='flex justify-end'><div className='text-center w-fit bg-red-300/50 px-2 py-1 text-sm rounded-md border border-red-500 text-red-500'>{currentInvoice?.restrictEdit}</div></div>}
                            {(() => {
                                const stages = [
                                    "Access Requested",
                                    "Under Edit",
                                    "Under Approval",
                                    "Invoice Generation",
                                    "completed"
                                ];
                                const stage = stages.findIndex(status => status === currentInvoice?.invoice?.approvalStatus);

                                return (<div className="flex items-center justify-center space-x-4 my-4">
                                    {stages.map((status, index) => {
                                        const isActive = stage === index;
                                        const isComplete = stage > index;

                                        let bgColor = isActive
                                            ? "bg-primary-600/30 text-primary-800 border border-dashed border-primary-800"
                                            : isComplete
                                                ? "bg-primary-600 text-white"
                                                : "bg-gray-200 text-gray-500";
                                        if (status !== 'completed') {
                                            return (
                                                <div key={status} className="flex items-center space-x-2">
                                                    <div className={`px-4 py-2 rounded-full text-sm font-medium ${bgColor}`}>
                                                        {isActive
                                                            ? status
                                                            : isComplete
                                                                ? status.replace("Under", "").trim() + " ✓"
                                                                : status}
                                                    </div>
                                                    {index < stages.length - 2 && (
                                                        <div className="w-6 h-1 bg-gray-300" />
                                                    )}
                                                </div>
                                            );
                                        }
                                    })}
                                </div>)
                            })()}

                        </div>

                        <div className='flex justify-end w-full px-4 py-2 border-t border-neutral-300 gap-3'>
                            <RenderStageButton currentInvoice={currentInvoice} updateInvoiceApprovalStatus={updateInvoiceApprovalStatus} />
                            <button
                                onClick={() => setCurrentInvoice(null)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Close
                            </button>
                        </div>
                    </>)
                }
                )()}

            </Modal>

        </>
    );
};

export default ManageSummary;