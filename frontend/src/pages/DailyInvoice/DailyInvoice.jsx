import React, { useState, useEffect, useMemo, useRef } from 'react';
import TableStructure from '../../components/TableStructure/TableStructure';
import { useSelector, useDispatch } from 'react-redux';
import { calculateAllWorkStreaks, checkAllContinuousSchedules } from '../../utils/scheduleCalculations';
import moment from 'moment';
import axios from 'axios';
import Modal from '../../components/Modal/Modal'
import { FcApproval } from "react-icons/fc";
import { jsPDF } from "jspdf";
import InputWrapper from '../../components/InputGroup/InputWrapper';
import { PrintableContent } from './PrintContent';
import { fetchDrivers } from '../../features/drivers/driverSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const DailyInvoice = () => {
    const dispatch = useDispatch()
    const contentRef = useRef(null);
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
    const [isPrintReady, setIsPrintReady] = useState(null)
    const [driverDetails, setDriverDetails] = useState({})
    const [currentInvoice, setCurrentInvoice] = useState(null)

    const { bySite: driversBySite, driverStatus } = useSelector((state) => state.drivers);

    const state = { rangeType, rangeOptions, selectedRangeIndex, days, selectedSite, searchDriver, driversList, standbydriversList };
    const setters = { setRangeType, setRangeOptions, setSelectedRangeIndex, setDays, setSelectedSite, setSearchDriver, setDriversList, setStandbydriversList };


    useEffect(() => {
        if (driverStatus === 'idle') dispatch(fetchDrivers());
        // if (siteStatus === 'idle') dispatch(fetchSites())
    }, [driverStatus, dispatch]);

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
        let map = {};
        invoices.forEach(inv => {
            const dateKey = new Date(inv.date).toLocaleDateString('en-UK');
            const key = `${dateKey}_${inv.driverId}`;
            map[key] = inv;
        });
        setInvoiceMap(map);
    }, [invoices]);

    useEffect(() => {
        if (rangeType !== prevRangeType) {
            setCacheRangeOption(rangeOptions);
            setPrevRangeType(rangeType);
        }
    }, [rangeOptions]);

    const handlePrint = async () => {
        setDriverDetails(driversBySite[currentInvoice.site].find((driver) => driver._id === currentInvoice?.driverId))
        setIsPrintReady(true);
    };

    useEffect(() => {
        if (currentInvoice && isPrintReady) {
            generatePDF(contentRef.current,
                currentInvoice?.driverName,
                currentInvoice?.serviceWeek);

            setIsPrintReady(false);
        }
    }, [isPrintReady]);

    const generatePDF = (invoiceContent, driverName, serviceWeek) => {
        const tempDiv = document.createElement("div");

        // A4 portrait size in pixels at 96 DPI is ~794x1123
        tempDiv.style.width = "794px";
        tempDiv.style.height = "1123px";
        tempDiv.style.minWidth = "794px";
        tempDiv.style.minHeight = "1123px";
        tempDiv.style.maxWidth = "794px";
        tempDiv.style.maxHeight = "1123px";

        const clone = invoiceContent.cloneNode(true);
        tempDiv.appendChild(clone);
        document.body.appendChild(tempDiv);

        const doc = new jsPDF('portrait', 'mm', 'a4');

        doc.html(tempDiv, {
            image: { type: 'jpeg', quality: 0.98 },

            html2canvas: {
                scale: 0.262,
                useCORS: true,
                logging: true,
                allowTaint: false,
            },
            callback: function (doc) {
                const pdfFileName = `invoice-${driverName}-${serviceWeek}.pdf`;
                document.body.removeChild(tempDiv);

                const pdfBlob = doc.output('blob');
                const reader = new FileReader();
                reader.readAsDataURL(pdfBlob);
                reader.onloadend = function () {
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl); // opens in new tab for preview/print
                };
            }
        });
    };


    const tableData = (driver) => {
        return days.map((day) => {
            const dateObj = new Date(day.date);
            const dateKey = dateObj.toLocaleDateString('en-UK');
            const key = `${dateKey}_${driver._id}`;
            const invoice = invoiceMap[key];

            const isToday = dateObj.toDateString() === new Date().toDateString();
            const cellClass = isToday ? 'bg-amber-100/30' : '';
            const completed = invoice?.approvalStatus === 'completed'
            return (
                <td key={day.date} className={cellClass} >
                    {(() => {
                        // Render invoice cell
                        if (invoice) {
                            return (
                                <div className={`relative flex justify-center h-full w-full `}>
                                    <div className='relative max-w-40'>
                                        <div onClick={() => { if (completed) setCurrentInvoice(invoice) }} className={`relative z-6 w-full h-full flex flex-col gap-1 ${completed && 'cursor-pointer'} items-center justify-center overflow-auto dark:bg-dark-4 dark:text-white bg-gray-100 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-1.5 transition-all duration-300 group-hover:w-[82%]`}>
                                            <div className='overflow-auto max-h-[4rem]'>{invoice?.mainService}</div>
                                            {(completed) && <div className='flex gap-2 text-xs bg-sky-200 rounded-full px-3 py-1'> <i class="flex items-center fi fi-rr-document"></i>Ready to print</div>}
                                        </div>
                                    </div>
                                </div>)
                        }
                    })()}
                </td>
            )
        })
    }

    return (
        <>
            <TableStructure title={'Daily Invoice'} state={state} setters={setters} tableData={tableData} />
            <Modal isOpen={currentInvoice} onHide={() => { setCurrentInvoice(null); }}>
                {currentInvoice && (
                    <>
                        <h2 className="text-xl font-semibold px-2 md:px-6 py-2 text-gray-800 dark:text-white border-b border-neutral-300">Daily Invoice Details</h2>
                        <div className="p-2 md:p-6  mx-auto max-h-[40rem] overflow-auto">

                            {/* Driver Information */}
                            <div className="mb-6">
                                <InputWrapper title={'Driver Information'}>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.driverName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.driverEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.user_ID}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Type</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.driverVehicleType}</p>
                                        </div>
                                    </div>
                                </InputWrapper>
                            </div>

                            {/* Invoice Information */}
                            <div className="mb-6">
                                <InputWrapper title={'Invoice Information'}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Invoice Number</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.invoiceNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Reference Number</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.referenceNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{new Date(currentInvoice.date).toLocaleDateString('en-UK')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Site</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.site}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Service Week</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.serviceWeek}</p>
                                        </div>
                                    </div>
                                </InputWrapper>

                            </div>

                            {/* Service Details */}
                            <div className="mb-6">
                                <InputWrapper title={'Main Service Details'}>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Main Service</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.mainService}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Service Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.serviceRateforMain}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">BYOD Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.byodRate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Miles</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.miles}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Mileage Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.mileage}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Calculated Mileage</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.calculatedMileage}</p>
                                        </div>
                                    </div>
                                </InputWrapper>
                            </div>

                            {currentInvoice.additionalServiceDetails && <div className="mb-6">
                                <InputWrapper title={'Additional Service Details'}>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Main Service</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.additionalServiceDetails?.service}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Service Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.additionalServiceDetails?.serviceRate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">BYOD Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.additionalServiceDetails?.byodRate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Miles</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice.additionalServiceDetails?.miles}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Mileage Rate</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.additionalServiceDetails?.mileage}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Calculated Mileage</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">£{currentInvoice.additionalServiceDetails?.calculatedMileage}</p>
                                        </div>
                                    </div>
                                </InputWrapper>
                            </div>}


                            {/* Total */}
                            <div className="mt-6">
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Total</h3>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">£{currentInvoice.serviceRateforMain +
                                    currentInvoice.byodRate +
                                    currentInvoice.calculatedMileage +
                                    (currentInvoice.serviceRateforAdditional || 0) +
                                    (currentInvoice.incentiveDetail?.rate || 0)}</p>
                            </div>

                        </div>
                        <div className=" border-t border-neutral-300 flex px-2 md:px-6 py-2 justify-end gap-2 items-center">
                            <button
                                className="px-2 py-1 h-fit bg-gray-500 rounded-md text-white hover:bg-gray-600"
                                onClick={() => {
                                    setCurrentInvoice(null);
                                }}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    handlePrint()
                                }}
                                className="px-2 h-fit py-1 bg-primary-500 rounded-md text-white hover:bg-primary-600"
                            >
                                Print Daily Invoice
                            </button>

                        </div>

                    </>
                )}
            </Modal>
            <div style={{
                visibility: 'hidden',
                position: 'absolute',
                left: '-9999px'
            }}>

                {currentInvoice && (<PrintableContent ref={contentRef} invoice={currentInvoice} driverDetails={driverDetails} />)}

            </div>
        </>
    );
};

export default DailyInvoice;