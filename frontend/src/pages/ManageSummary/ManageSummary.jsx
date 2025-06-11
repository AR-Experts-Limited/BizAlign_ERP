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
import { cosineSimilarityFromText } from './similarity'
{/* <AiOutlineClockCircle className="text-yellow-500 text-xl" />, */ }

const API_BASE_URL = import.meta.env.VITE_API_URL;
const stageIcons = {
    "Access Requested": <FcHighPriority size={22} />,
    "Under Edit": <i class="flex items-center text-amber-500 fi fi-rr-pen-square"></i>,
    "Under Approval": <i class="flex items-center text-sky-500 fi fi-rs-memo-circle-check"></i>,
    "Invoice Generation": <FcClock className='!text-primary-500' size={25} />,
    "completed": <BsCheckCircleFill className="text-green-600 text-xl" />
};

const ManageSummary = () => {
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
    const originalMilesRef = useRef(null);
    const events = useSelector((state) => state.sse.events);
    const error = useSelector((state) => state.sse.error);
    const connected = useSelector((state) => state.sse.connected);

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList };
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList };


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
                        startdate: new Date(moment(rangeOptionsVal[0]?.start).format('YYYY-MM-DD')),
                        enddate: new Date(moment(rangeOptionsVal[rangeOptionsVal.length - 1]?.end).format('YYYY-MM-DD')),
                    },
                });
                setInvoices(response.data);
            };

            if (!cacheRangeOption) {
                fetchInvoices();
                setCacheRangeOption(rangeOptions);
            }
            else if (!(Object.keys(cacheRangeOption).find((i) => i === selectedRangeIndex)) ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === 0 ||
                Object.keys(cacheRangeOption).indexOf(selectedRangeIndex) === (Object.keys(cacheRangeOption).length - 1)) {
                fetchInvoices();
                setCacheRangeOption(rangeOptions);
            }
        }
    }, [rangeOptions, driversList]);


    useEffect(() => {
        const map = {};

        invoices.forEach(invoice => {
            const invoiceDate = new Date(invoice.date).toLocaleDateString();
            const invoiceName = invoice.driverName?.trim();
            const invoiceService = invoice.mainService?.trim();
            const existingCsvData = invoice.csvData || null

            let matchedCsv = null

            const key = `${invoiceDate}_${invoiceName}`;
            if (existingCsvData)
                matchedCsv = existingCsvData

            else
                matchedCsv = csvData[key] || null;

            const dateKey = new Date(invoice.date).toLocaleDateString('en-UK');
            const mapKey = `${dateKey}_${invoice.driverId}`;

            map[mapKey] = {
                invoice,
                matchedCsv,
            };

            {/*Comment this when testing with erp_rainaltd */ }
            if (matchedCsv && invoice.approvalStatus === 'Access Requested') {
                const similarity = cosineSimilarityFromText(invoice.mainService, matchedCsv?.['Service Type'])
                console.log(similarity)
                const match = (Number(invoice?.miles) === Number(matchedCsv?.['Total Distance Allowance'])) ? true : false
                if (match) {
                    let invoiceMatch = { ...invoice, approvalStatus: 'Under Approval' }
                    updateInvoiceApprovalStatus({ invoice: invoiceMatch, matchedCsv })
                }
            }
        });
        setInvoiceMap(map);
    }, [invoices, csvData]);


    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions]);

    const handleFileChange = (e) => {
        if (!e) {
            setCsvData({})
            return
        }
        const requiredColumns = ["Date", "Station", "Delivery Associate", "Service Type", "Total Distance Allowance"];
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
                        const csvName = csv['Delivery Associate']?.trim();
                        const csvService = csv['Service Type']?.trim();

                        const key = `${csvDate}_${csvName}`;
                        csvLookup[key] = csv;
                    })
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
        let allSelectedInvoices = []
        if (e.target.name === 'selectAll') {
            const selectedApprovalStatus = invoiceMap[selectedInvoices[0]]?.invoice.approvalStatus
            allSelectedInvoices.push(selectedInvoices[0])
            Object.keys(invoiceMap).map((invKey) => {
                if (invoiceMap[invKey]?.invoice.approvalStatus === selectedApprovalStatus) {
                    allSelectedInvoices.push(invKey)
                }
            })
        }
        setSelectedInvoices(allSelectedInvoices)
    }

    const updateInvoiceApprovalStatus = async (currentInvoice) => {
        const stages = [
            "Access Requested",
            "Under Edit",
            "Under Approval",
            "Invoice Generation",
            "completed"
        ];

        const { invoice, matchedCsv } = currentInvoice
        const currentStatus = invoice.approvalStatus;
        const nextStatusIndex = stages.indexOf(currentStatus) + 1;

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
                    miles: invoice.miles,
                    calculatedMileage: Number((invoice.miles * invoice.mileage).toFixed(2)),
                    total: invoice.total - invoice.calculatedMileage + Number((invoice.miles * invoice.mileage).toFixed(2)),
                    approvalStatus: stages[nextStatusIndex],
                    csvData: matchedCsv

                }
            }];

        try {
            const response = await axios.put(`${API_BASE_URL}/api/dayInvoice/updateApprovalStatusBatch`, {
                updates: updatedInvoice,
                site: selectedSite
            });
            const updatedInvoices = response.data.updated;

            setInvoices(prev =>
                prev.map((im) => {
                    const updated = updatedInvoices.find(u => u._id === im._id);
                    return updated ? updated : im;
                })
            );
            setCurrentInvoice(null)

        } catch (error) {
            console.error("Failed to update invoice:", error);
        }
    };


    const tableData = (driver) => {
        return days.map((day) => {
            const dateObj = new Date(day.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${driver._id}`;
            const invoice = invoiceMap[key]?.invoice;
            const matchedCsv = invoiceMap[key]?.matchedCsv;
            const isToday = dateObj.toDateString() === new Date().toDateString();
            const cellClass = isToday ? 'bg-amber-100/30' : '';
            const disabledSelection = (invoice && selectedInvoices.length > 0 && key !== selectedInvoices[0] && invoiceMap[selectedInvoices[0]]?.invoice.approvalStatus !== invoice.approvalStatus) ? true : false


            return (
                <td key={day.date} className={cellClass} >
                    {(() => {
                        // Render invoice cell
                        if (invoice) {
                            return (
                                <div className={`relative flex justify-center h-full w-full`}>
                                    <div className='relative max-w-40'>
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
                                                }
                                            }}
                                            className={`relative z-6 w-full h-full flex flex gap-1  items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border 
                                            ${disabledSelection && '!text-gray-300 !pointers-event-none'}
                                            ${!matchedCsv
                                                    ? 'border-dashed border-gray-300'
                                                    : selectedInvoices.includes(key)
                                                        ? 'border-2 border-primary-700'
                                                        : 'border-gray-300 dark:border-dark-5  cursor-pointer'} 
                                             rounded-md text-sm p-2 `}
                                        >
                                            <div className='overflow-auto max-h-[4rem]'>{invoice?.mainService}</div>

                                            {matchedCsv && (
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
                </td>
            )
        })
    }

    return (
        <>
            <TableStructure title={'Manage Summary'}
                state={state}
                setters={setters}
                tableData={tableData}
                invoiceMap={invoiceMap}
                handleFileChange={handleFileChange}
                selectedInvoices={selectedInvoices}
                handleSelectAll={handleSelectAll}
                updateInvoiceApprovalStatus={updateInvoiceApprovalStatus} />
            <Modal isOpen={currentInvoice} onHide={() => setCurrentInvoice(null)}>
                {(() => {
                    const misMatch = (Number(currentInvoice?.invoice?.miles)) !== Number(currentInvoice?.matchedCsv?.['Total Distance Allowance']) ? true : false

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
                                            <td className="px-4 py-2">{currentInvoice?.matchedCsv["Service Type"]}</td>
                                            <td className="px-4 py-2">{currentInvoice?.invoice?.mainService}</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                            <td className="px-4 py-2 font-medium text-gray-700">Miles / Distance</td>
                                            <td
                                                className={`px-4 py-2 ${misMatch ? 'text-red-500' : 'text-green-600'
                                                    }`}
                                            >
                                                {currentInvoice?.matchedCsv["Total Distance Allowance"]}
                                            </td>
                                            <td
                                                className={`px-4 py-2 ${misMatch ? 'text-red-500' : 'text-green-600'
                                                    }`}
                                            >
                                                {currentInvoice?.invoice.approvalStatus == 'Under Edit' ?
                                                    <InputGroup type='dropdown' onChange={(e) => setCurrentInvoice(prev => ({ ...prev, invoice: { ...prev.invoice, miles: e.target.value } }))}>
                                                        <option value={originalMilesRef.current}>{originalMilesRef.current}</option>
                                                        <option value={currentInvoice?.matchedCsv["Total Distance Allowance"]}>{currentInvoice?.matchedCsv["Total Distance Allowance"]}</option>
                                                    </InputGroup> :
                                                    currentInvoice?.invoice?.miles}
                                            </td>

                                        </tr>
                                    </tbody>
                                </table>

                            </div>
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