import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink } from "react-router-dom";
import TableStructure from '../../components/TableStructure/TableStructure';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import moment from 'moment';
import axios from 'axios';
import Modal from '../../components/Modal/Modal'
import InputWrapper from '../../components/InputGroup/InputWrapper';
import Papa from "papaparse";
import { renderStageButton } from './renderStageButton';
import InputGroup from '../../components/InputGroup/InputGroup';
import { FcApproval, FcClock, FcTodoList, FcHighPriority, FcCheckmark } from "react-icons/fc";
import { BsCheckCircleFill } from "react-icons/bs";
import { AiOutlineClockCircle } from "react-icons/ai";
{/* <AiOutlineClockCircle className="text-yellow-500 text-xl" />, */ }

const API_BASE_URL = import.meta.env.VITE_API_URL;
const stageIcons = {
    "Access Requested": <FcHighPriority size={22} />,
    "Under Edit": <i class="flex items-center text-amber-500 fi fi-rr-pen-square"></i>,
    "Under Approval": <i class="flex items-center text-sky-500 fi fi-rs-memo-circle-check"></i>,
    "Invoice Generation": <FcClock size={22} />,
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
    const [selectedSchedules, setSelectedSchedules] = useState([]);


    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList };
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList };

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

            const key = `${invoiceDate}_${invoiceName}_${invoiceService}`;
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
        });
        console.log(map)
        setInvoiceMap(map);
    }, [invoices, csvData]);


    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions]);

    const handleFileChange = (e) => {
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

                        const key = `${csvDate}_${csvName}_${csvService}`;
                        csvLookup[key] = csv;
                    })
                    // console.log(filteredData)
                    console.log(csvLookup)
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
            const selectedApprovalStatus = invoiceMap[selectedSchedules[0]]?.approvalStatus
            allSelectedInvoices.push(selectedSchedules[0])
            Object.keys(invoiceMap).map((invKey) => {
                if (invoiceMap[invKey]?.approvalStatus === selectedApprovalStatus) {
                    allSelectedInvoices.push(invKey)
                }
            })
        }
        setSelectedSchedules(allSelectedInvoices)
    }

    const updateInvoiceApprovalStatus = async (currentInvoice) => {
        const stages = [
            "Access Requested",
            "Under Edit",
            "Under Approval",
            "Invoice Generation",
            "Completed"
        ];

        const { invoice, matchedCsv } = currentInvoice
        const currentStatus = invoice.approvalStatus;
        const nextStatusIndex = stages.indexOf(currentStatus) + 1;

        if (nextStatusIndex >= stages.length) {
            console.warn("Already at final stage.");
            return;
        }


        const updatedInvoice = [{
            id: invoice._id,
            updateData: {
                approvalStatus: stages[nextStatusIndex],
                csvData: matchedCsv

            }
        }];

        try {
            const response = await axios.put(`${API_BASE_URL}/api/dayInvoice/updateApprovalStatusBatch`, {
                updates: updatedInvoice,
                site: selectedSite
            });
            console.log("Invoice updated successfully:", response.data);

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
            const misMatch = (Number(invoice?.miles) !== Number(matchedCsv?.['Total Distance Allowance'])) ? true : false
            const disabledSelection = (invoice && selectedSchedules.length > 0 && key !== selectedSchedules[0] && invoiceMap[selectedSchedules[0]]?.invoice.approvalStatus !== invoice.approvalStatus) ? true : false


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
                                                    // Cmd/Ctrl + click: multi-select toggle, don't open modal
                                                    setSelectedSchedules(prev =>
                                                        prev.includes(key)
                                                            ? prev.filter(k => k !== key)
                                                            : [...prev, key]
                                                    );
                                                } else {
                                                    // Simple click: open modal
                                                    setCurrentInvoice({ ...invoiceMap[key], misMatch });
                                                }
                                            }}
                                            className={`relative z-6 w-full h-full flex flex gap-1 cursor-pointer items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border 
                                            ${disabledSelection && '!text-gray-300 !pointers-event-none'}
                                            ${!matchedCsv
                                                    ? 'border-dashed border-gray-300'
                                                    : selectedSchedules.includes(key)
                                                        ? 'border-2 border-primary-700'
                                                        : 'border-gray-300 dark:border-dark-5'} 
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
            <TableStructure title={'Manage Summary'} state={state} setters={setters} tableData={tableData} handleFileChange={handleFileChange} selectedInvoices={selectedSchedules} handleSelectAll={handleSelectAll} />
            <Modal isOpen={currentInvoice} onHide={() => setCurrentInvoice(null)}>
                <h2 className="text-lg px-4 py-2 border-b border-neutral-300">Invoice Comparison</h2>
                <div className="p-6">
                    <p><strong>Driver Name:</strong> {currentInvoice?.invoice?.driverName}</p>
                    <p><strong>Date:</strong> {new Date(currentInvoice?.invoice?.date).toLocaleDateString()}</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <h3 className="font-medium text-gray-700">Invoice Data</h3>

                            <p><strong>Service:</strong> {currentInvoice?.invoice?.mainService}</p>
                            <p className={`${currentInvoice?.misMatch ? 'text-red-500' : 'text-green-600'}`}><strong className='!text-gray-700'>Miles:</strong> {currentInvoice?.invoice?.miles}</p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-700">CSV Data</h3>
                            <p><strong>Service Type:</strong> {currentInvoice?.matchedCsv["Service Type"]}</p>
                            <p className={`${currentInvoice?.misMatch ? 'text-red-500' : 'text-green-600'}`}><strong className='!text-gray-700'>Total Distance Allowance:</strong> {currentInvoice?.matchedCsv["Total Distance Allowance"]}</p>
                        </div>
                    </div>
                    {(() => {
                        const stages = [
                            "Access Requested",
                            "Under Edit",
                            "Under Approval",
                            "Invoice Generation",
                        ];
                        const stage = stages.findIndex(status => status === currentInvoice?.invoice?.approvalStatus);

                        return (<div className="flex items-center justify-center space-x-4 my-4">
                            {stages.map((status, index) => {
                                const isActive = stage === index;
                                const isComplete = stage > index;

                                let bgColor = isActive
                                    ? "bg-primary-600/50 text-primary-800"
                                    : isComplete
                                        ? "bg-primary-600 text-white"
                                        : "bg-gray-200 text-gray-500";

                                return (
                                    <div key={status} className="flex items-center space-x-2">
                                        <div className={`px-4 py-2 rounded-full text-sm font-medium ${bgColor}`}>
                                            {isActive
                                                ? status
                                                : isComplete
                                                    ? status.replace("Under", "").trim() + " ✓"
                                                    : status}
                                        </div>
                                        {index < stages.length - 1 && (
                                            <div className="w-6 h-1 bg-gray-300" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>)
                    })()}

                </div>

                <div className='flex justify-end w-full px-4 py-2 border-t border-neutral-300 gap-3'>
                    {renderStageButton(currentInvoice, updateInvoiceApprovalStatus)}
                    <button
                        onClick={() => setCurrentInvoice(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>

            </Modal>

        </>
    );
};

export default ManageSummary;