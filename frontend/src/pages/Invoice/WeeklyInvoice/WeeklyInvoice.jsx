import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSites } from '../../../features/sites/siteSlice';
import moment from 'moment';
import { FaChevronLeft, FaChevronRight, FaPoundSign } from 'react-icons/fa';
import Flatpickr from 'react-flatpickr';
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { fetchDrivers } from '../../../features/drivers/driverSlice';
import axios from 'axios'
import Modal from '../../../components/Modal/Modal'
import { jsPDF } from "jspdf";
import { getInstallmentDetails } from '../../Rota/supportFunctions';
import InputWrapper from '../../../components/InputGroup/InputWrapper'
import InputGroup from '../../../components/InputGroup/InputGroup'
import { PrintableContent } from './PrintContent';


const API_BASE_URL = import.meta.env.VITE_API_URL;

moment.updateLocale('en', {
    week: {
        dow: 0,
    },
});


const WeeklyInvoice = () => {
    const dispatch = useDispatch();
    const contentRef = useRef(null);
    const { userDetails } = useSelector((state) => state.auth);
    const { list: sites, siteStatus } = useSelector((state) => state.sites);
    const { bySite: driversBySite, driverStatus } = useSelector((state) => state.drivers);
    const { list: standbydrivers } = useSelector((state) => state.standbydrivers);

    const [selectedSite, setSelectedSite] = useState('');
    const [searchDriver, setSearchDriver] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
    const [weeks, setWeeks] = useState([]);
    const [driversList, setDriversList] = useState([]);
    const [standbydriversList, setStandbydriversList] = useState([]);
    const [invoices, setInvoices] = useState([])
    const [groupedInvoices, setGroupedInvoices] = useState([])
    const [currentInvoice, setCurrentInvoice] = useState(null)
    // const [isPrintReady, setIsPrintReady] = useState(null)
    // const [driverDetails, setDriverDetails] = useState({})
    const [sendingInvoice, setSendingInvoice] = useState(false)
    const [changed, setChanged] = useState(false)

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites());
        if (driverStatus === 'idle') dispatch(fetchDrivers());

    }, [siteStatus, driverStatus, dispatch]);

    useEffect(() => {
        if (sites.length > 0) {
            if (userDetails?.site) setSelectedSite(userDetails.site);
            else setSelectedSite(sites[0].siteKeyword);
        }
    }, [sites]);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (driversList.length > 0 && weeks.length > 0) {
                const serviceWeeks = weeks.map((week) => week.week)

                const response = await axios.get(`${API_BASE_URL}/api/weeklyInvoice`, {
                    params: {
                        driverIds: driversList.map((driver) => driver._id),
                        serviceWeeks: serviceWeeks,
                    }
                })

                setInvoices(response.data.data);
            };

        }
        fetchInvoices()
    }, [driversList, weeks]);

    useEffect(() => {
        let map = {}
        invoices?.forEach(inv => {
            const key = `${inv.driverId._id}_${inv.serviceWeek}`;
            map[key] = inv;
        });

        setGroupedInvoices(map)
    }, [invoices])

    useEffect(() => {
        const startOfMonth = moment(selectedMonth, 'YYYY-MM').startOf('month');
        const endOfMonth = moment(selectedMonth, 'YYYY-MM').endOf('month');
        const weeksArray = [];

        let currentWeek = startOfMonth.clone().startOf('week');

        while (currentWeek.isSameOrBefore(endOfMonth, 'week')) {
            weeksArray.push({
                week: currentWeek.format('YYYY-[W]ww'),
                start: currentWeek.clone().startOf('week'),
                end: currentWeek.clone().endOf('week'),
            });
            currentWeek.add(1, 'week');
        }

        setWeeks(weeksArray);
    }, [selectedMonth]);


    useEffect(() => {
        if (Object.keys(driversBySite).length > 0) {
            let driversList = Object.values(driversBySite).flat();
            let standbydriversIds = standbydrivers.map((sdriver) =>
                sdriver.site !== selectedSite ? sdriver.driverId : null
            );
            let standbydriversList = driversList.filter((driver) =>
                standbydriversIds.some((sId) => sId == driver._id)
            );

            if (selectedSite !== '') driversList = driversBySite[selectedSite] || [];
            if (searchDriver !== '')
                driversList = driversList.filter((driver) =>
                    String(driver.firstName + ' ' + driver.lastName)
                        .toLowerCase()
                        .includes(searchDriver.toLowerCase())
                );

            setDriversList([...driversList, ...standbydriversList]);
            setStandbydriversList(standbydriversList);
        }
    }, [driversBySite, selectedSite, searchDriver, standbydrivers]);

    const handleMonthChange = (direction) => {
        const newMonth = moment(selectedMonth, 'YYYY-MM')
            .add(direction === 'next' ? 1 : -1, 'month')
            .format('YYYY-MM');
        setSelectedMonth(newMonth);
    };

    // const handlePrint = async () => {
    //     setDriverDetails(currentInvoice?.invoice.driverId)
    //     setIsPrintReady(true);
    // };

    // useEffect(() => {
    //     if (currentInvoice && isPrintReady) {
    //         generatePDF(contentRef.current,
    //             currentInvoice?.driverName,
    //             currentInvoice?.serviceWeek);

    //         setIsPrintReady(false);
    //     }
    // }, [isPrintReady]);

    const generatePDF = async (invoiceContent, driverName, serviceWeek, actionType) => {
        const tempDiv = document.createElement("div");
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
            callback: async function (doc) {
                document.body.removeChild(tempDiv);
                const pdfBlob = doc.output('blob');
                const filename = `${currentInvoice?.invoice?.driverId.firstName + '_' + currentInvoice?.invoice?.driverId.lastName}.pdf`;

                if (actionType === 'print') {
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl);
                    return;
                }

                const formData = new FormData();
                formData.append('weeklyInvoiceId', currentInvoice?.invoice?._id);
                formData.append('driverId', currentInvoice?.invoice?.driverId?._id);
                formData.append('driverEmail', currentInvoice?.invoice?.driverId?.Email);
                formData.append('driverName', currentInvoice?.invoice?.driverId.firstName + ' ' + currentInvoice?.invoice?.driverId.lastName);
                formData.append('actionType', actionType);
                formData.append('document', new File([pdfBlob], filename, { type: 'application/pdf' }));

                try {
                    const res = await axios.put(`${API_BASE_URL}/api/weeklyInvoice/document`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (actionType === 'downloadInvoice') {
                        const url = window.URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        link.click();

                    } else if (actionType === 'sentInvoice') {
                        setSendingInvoice(false)
                        alert("Invoice sent and saved successfully.");
                    }
                    setCurrentInvoice(cinvoice => ({ ...cinvoice, invoice: res.data.updatedWeeklyInvoice }))
                    setInvoices(allinvoices => (allinvoices.map((inv) => {
                        if (inv.driverId._id === currentInvoice?.invoice?.driverId?._id && inv.serviceWeek === currentInvoice?.invoice?.serviceWeek)
                            return res.data.updatedWeeklyInvoice
                        else
                            return inv
                    })))
                } catch (err) {
                    console.error("Upload failed:", err);
                    alert("Error uploading invoice.");
                }
            }
        });
    };


    const handleShowDetails = async (invoice) => {
        const instalments = await getInstallmentDetails(invoice.driverId._id)
        setCurrentInvoice({ invoice, instalments })
    }

    const handleUpdateInvoice = async (currentInvoice) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/weeklyInvoice/update`, { weeklyInvoiceId: currentInvoice.invoice._id, installmentDetail: currentInvoice.invoice.installmentDetail, weeklyTotal: currentInvoice.invoice.total, instalments: currentInvoice.instalments })
            setChanged(false)
            setCurrentInvoice(cinvoice => ({ ...cinvoice, invoice: res.data.weeklyInvoice }))
            setInvoices(allinvoices => (allinvoices.map((inv) => {
                if (inv.driverId._id === currentInvoice?.invoice?.driverId?._id && inv.serviceWeek === currentInvoice?.invoice?.serviceWeek)
                    return res.data.weeklyInvoice
                else
                    return inv
            })))
        }
        catch (err) {
            console.error("Upload failed:", err);
            alert("Error uploading invoice.");
        }
    }

    const tableData = (driver) => {
        return weeks.map((week) => {
            const key = `${driver._id}_${week.week}`;
            const invoice = groupedInvoices[key];
            const isToday = moment(week, 'week').format('YYYY-[W]ww') === moment().format('YYYY-[W]ww')
            const cellClass = isToday ? 'bg-amber-100/30' : '';
            const allCompleted = invoice?.count === invoice?.invoices.filter((inv) => inv.approvalStatus === 'completed').length
            return (
                <td key={week.week} className={cellClass} >
                    {(() => {
                        // Render invoice cell
                        if (invoice) {
                            return (
                                <div className={`relative flex justify-center h-full w-full `}>
                                    <div className='relative max-w-40 w-full'>
                                        <div onClick={() => { handleShowDetails(invoice) }} className={`${!allCompleted || invoice.unsigned && 'border-dashed border-gray-300'} relative z-6 w-full h-full flex flex-col gap-1 items-center overflow-auto dark:bg-dark-4 dark:text-white w-full bg-gray-100 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
                                            <div className='grid grid-cols-[3fr_1fr] w-full'>
                                                <strong className='text-xs'>Total Invoice count:</strong>
                                                <div className='text-xs overflow-auto max-h-[4rem] w-full text-center'> {invoice?.count}</div>
                                                <strong className='text-xs'>Completed: </strong>
                                                <div className='overflow-auto max-h-[4rem] w-full text-center'>{invoice.invoices.filter((inv) => inv.approvalStatus === 'completed').length}</div>
                                            </div>
                                            {(() => {
                                                if (!invoice.unsigned)
                                                    return <div className='flex items-center gap-2 text-xs bg-yellow-200 text-yellow-800 rounded-full px-3 py-1'> <i class="flex items-center fi fi-sr-seal-exclamation"></i>unsigned docs</div>
                                                if (allCompleted)
                                                    return <div className='flex gap-2 text-xs bg-sky-200 rounded-full px-3 py-1'> <i class="flex items-center fi fi-rr-document"></i>Ready to print</div>
                                            }
                                            )()}
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
        <div className="w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden dark:text-white rounded-xl">
            <h2 className='self-start text-xl mb-1 font-bold dark:text-white'>Weekly Invoice</h2>
            <div className="flex flex-col gap-3 w-full h-full bg-white dark:bg-dark-3 rounded-xl p-2 md:p-3 shadow overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 p-3 gap-2 md:gap-5 bg-neutral-100/90 dark:bg-dark-2 shadow border-[1.5px] border-neutral-300/80 dark:border-dark-5 rounded-lg overflow-visible dark:!text-white">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold">Search Personnel Name:</label>
                        <input
                            type="text"
                            onChange={(e) => setSearchDriver(e.target.value)}
                            className="dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300 dark:border-dark-5 px-2 py-1 h-8 md:h-10 outline-none focus:border-primary-200"
                            placeholder="Personnel name"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold">Select Site:</label>
                        <select
                            disabled={userDetails?.site}
                            className="dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300 px-2 py-1 h-8 md:h-10 outline-none focus:border-primary-200 dark:border-dark-5 disabled:border-gray-200 disabled:text-gray-500"
                            value={selectedSite}
                            onChange={(e) => setSelectedSite(e.target.value)}
                        >
                            {sites.map((site) => (
                                <option key={site.siteKeyword} value={site.siteKeyword}>
                                    {site.siteName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 ">
                        <label className="text-xs font-semibold">Select Month:</label>
                        <div className="relative flex items-center justify-center w-full h-full gap-2">
                            <button
                                onClick={() => handleMonthChange('previous')}
                                className="dark:bg-dark-3 flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5"
                            >
                                <FaChevronLeft size={13} />
                            </button>
                            <Flatpickr
                                className="dark:bg-dark-3 bg-white rounded-md border-[1.5px] border-neutral-300 px-2 py-1 h-8 md:h-10 text-center w-full max-w-[150px] outline-none dark:border-primary-dark-gray-5"
                                value={moment(selectedMonth).format('MMMM, YYYY')}
                                options={{
                                    plugins: [new monthSelectPlugin({
                                        shorthand: true,
                                        dateFormat: "F Y",
                                        theme: "light"
                                    })], // initialized in useEffect
                                    dateFormat: "Y-m", // fallback
                                    altFormat: "F Y"
                                }}
                                onChange={([date]) => setSelectedMonth(date)}
                            />
                            <button
                                onClick={() => handleMonthChange('next')}
                                className="dark:bg-dark flex justify-center items-center bg-white rounded-md w-7 h-7 shadow-sm border border-neutral-200 dark:border-dark-5"
                            >
                                <FaChevronRight size={14} />
                            </button>

                        </div>
                    </div>
                </div>
                <div className="relative rounded-t-lg flex-1 overflow-auto">
                    <table className="calendar-table text-xs md:text-base w-full border border-neutral-200 dark:border-dark-4">
                        <thead>
                            <tr className="text-white">
                                <th className="sticky top-0 left-0 z-20 bg-primary-800 border-r-[1.5px] border-primary-500 font-medium max-sm:!max-w-20 max-sm:!whitespace-normal">
                                    Personnel List
                                </th>
                                {weeks.map((week) => (
                                    <th
                                        className="sticky top-0 z-10 bg-primary-800 border-r-[1.5px] border-primary-500 font-light"
                                        key={week.week}
                                    >
                                        <div className="flex flex-col gap-1 items-center">
                                            <div>{week.week}</div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {driversList.map((driver) => {
                                const disableDriver = driver.activeStatus !== 'Active' ? driver.activeStatus : null;
                                const standbydriver = standbydriversList.some((sdriver) => sdriver._id === driver._id);
                                return (
                                    <tr key={driver._id}>
                                        <td className="z-10 sticky left-0 bg-white dark:bg-dark-3">
                                            <div className="flex flex-col gap-3">
                                                <p>{driver.firstName + ' ' + driver.lastName}</p>
                                                {disableDriver && (
                                                    <div className="text-xs md:text-sm text-center text-stone-600 bg-stone-400/40 shadow-sm border-[1.5px] border-stone-400/10 p-0.5 rounded-sm">
                                                        {disableDriver}
                                                    </div>
                                                )}
                                                {standbydriver && (
                                                    <div className="text-left bg-amber-200 text-amber-700 rounded-md px-2 py-1 text-xs">
                                                        Stand by driver from {driver.siteSelection}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {tableData(driver)}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={currentInvoice} >
                <h2 className="text-xl font-semibold px-2 md:px-6 py-2 text-gray-800 dark:text-white border-b border-neutral-300">
                    Weekly Invoice Details
                </h2>
                <div className="p-2 md:p-6 mx-auto max-h-[40rem] overflow-auto">
                    {/* Driver Information */}
                    <div className="mb-6">
                        <InputWrapper title={'Driver Information'}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {currentInvoice?.invoice.driverId.firstName + ' ' + currentInvoice?.invoice.driverId.lastName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {currentInvoice?.invoice.driverId.Email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">User ID</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {currentInvoice?.invoice.driverId.user_ID}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle Type</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">
                                        {currentInvoice?.invoice.driverId.typeOfDriver}
                                    </p>
                                </div>

                                {currentInvoice?.invoice.driverId.vatDetails?.vatNo && (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Driver VAT Number</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">
                                                {currentInvoice.invoice.driverId.vatDetails.vatNo}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Effective Date</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">
                                                {new Date(currentInvoice.invoice.driverId.vatDetails.vatEffectiveDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {currentInvoice?.invoice.driverId.companyVatDetails?.vatNo && (
                                    <>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Company VAT Number</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">
                                                {currentInvoice.invoice.driverId.companyVatDetails.vatNo}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Effective Date</p>
                                            <p className="text-base font-medium text-gray-900 dark:text-white">
                                                {new Date(currentInvoice.invoice.driverId.companyVatDetails.companyVatEffectiveDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </InputWrapper>

                    </div>

                    {/* Invoice Summary */}
                    <div className="mb-6">
                        <InputWrapper title={'Invoice Summary'}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Service Week</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice?.invoice.serviceWeek}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Site</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice?.invoice.driverId.siteSelection}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Reference Number</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice?.invoice.referenceNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
                                    <p className="text-base font-medium text-gray-900 dark:text-white">{currentInvoice?.invoice.count}</p>
                                </div>
                            </div>
                        </InputWrapper>
                    </div>
                    {/* Installments Wrapper */}
                    {currentInvoice?.instalments?.length > 0 && (
                        <InputWrapper title="Instalments">
                            {currentInvoice.instalments.map((insta) => {
                                const existingDetails = currentInvoice?.invoice?.installmentDetail || [];
                                const isChecked = existingDetails.some(
                                    (cinsta) => cinsta._id.toString() === insta._id.toString()
                                );
                                const matchedDetail = existingDetails.find(
                                    (cinsta) => cinsta._id.toString() === insta._id.toString()
                                );

                                const currentTotal = currentInvoice?.invoice?.total ?? 0;
                                const deductionAmount = matchedDetail
                                    ? matchedDetail.deductionAmount.toFixed(2)
                                    : Math.max(
                                        0,
                                        Math.min(insta.spreadRate, currentTotal, insta.installmentPending)
                                    ).toFixed(2);
                                const isDisabled = Number(deductionAmount) === 0 && !isChecked;

                                return (
                                    <div
                                        key={insta._id}
                                        className="flex max-sm:flex-col items-center gap-5 justify-between"
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-[50%] self-end mb-2 w-4 accent-primary-400 rounded focus:ring-primary-400"
                                            checked={isChecked}
                                            disabled={isDisabled}
                                            onChange={(e) => {
                                                setChanged(true)
                                                const checked = e.target.checked;
                                                setCurrentInvoice((prev) => {
                                                    const prevInvoice = prev.invoice || {};
                                                    const prevDetails = prevInvoice.installmentDetail || [];
                                                    const toggledId = insta._id.toString();

                                                    if (!checked) {
                                                        // UNCHECK LOGIC with reset
                                                        const uncheckedDetail = prevDetails.find(
                                                            (d) => d._id.toString() === toggledId
                                                        );
                                                        const uncheckedDeduction = uncheckedDetail?.deductionAmount ?? 0;

                                                        // Restore total from all deductions
                                                        let restoredTotal = (prevInvoice.total ?? 0) + prevDetails.reduce(
                                                            (sum, d) => sum + d.deductionAmount,
                                                            0
                                                        );

                                                        restoredTotal = parseFloat(restoredTotal.toFixed(2));

                                                        // Recompute only with remaining checked items (excluding this one)
                                                        const remainingIds = prevDetails
                                                            .map((d) => d._id.toString())
                                                            .filter((id) => id !== toggledId);

                                                        let newTotal = restoredTotal;
                                                        const newInstallmentDetail = [];

                                                        const updatedInstalments = (prev.instalments || []).map((item) => {
                                                            const id = item._id.toString();

                                                            if (remainingIds.includes(id)) {
                                                                const deduction = Math.max(
                                                                    0,
                                                                    Math.min(item.spreadRate, newTotal, item.installmentPending + (prevDetails.find(d => d._id.toString() === id)?.deductionAmount || 0))
                                                                );
                                                                const roundedDeduction = parseFloat(deduction.toFixed(2));

                                                                newTotal = parseFloat((newTotal - roundedDeduction).toFixed(2));

                                                                newInstallmentDetail.push({
                                                                    _id: item._id,
                                                                    installmentType: item.installmentType,
                                                                    deductionAmount: roundedDeduction,
                                                                });

                                                                return {
                                                                    ...item,
                                                                    installmentPending: parseFloat(
                                                                        (
                                                                            Math.min(
                                                                                item.installmentPending +
                                                                                (prevDetails.find(d => d._id.toString() === id)?.deductionAmount || 0),
                                                                                item.installmentRate
                                                                            ) - roundedDeduction
                                                                        ).toFixed(2)
                                                                    ),
                                                                };
                                                            }

                                                            // If this was the one just unchecked, restore its pending fully
                                                            if (id === toggledId) {
                                                                return {
                                                                    ...item,
                                                                    installmentPending: parseFloat(
                                                                        (
                                                                            Math.min(
                                                                                item.installmentPending + uncheckedDeduction,
                                                                                item.installmentRate
                                                                            )
                                                                        ).toFixed(2)
                                                                    ),
                                                                };
                                                            }

                                                            return item;
                                                        });

                                                        return {
                                                            ...prev,
                                                            invoice: {
                                                                ...prev.invoice,
                                                                total: newTotal,
                                                                installmentDetail: newInstallmentDetail,
                                                            },
                                                            instalments: updatedInstalments,
                                                        };
                                                    } else {
                                                        // CHECK LOGIC - apply deduction directly
                                                        const isAlreadySelected = prevDetails.some(
                                                            (d) => d._id.toString() === toggledId
                                                        );
                                                        if (isAlreadySelected) return prev;

                                                        const newTotal = prevInvoice.total ?? 0;
                                                        const deduction = Math.max(
                                                            0,
                                                            Math.min(insta.spreadRate, newTotal, insta.installmentPending)
                                                        );
                                                        const roundedDeduction = parseFloat(deduction.toFixed(2));
                                                        if (roundedDeduction === 0) return prev;

                                                        const newInstallmentDetail = [
                                                            ...prevDetails,
                                                            {
                                                                _id: insta._id,
                                                                installmentType: insta.installmentType,
                                                                deductionAmount: roundedDeduction,
                                                            },
                                                        ];

                                                        const newInstalments = (prev.instalments || []).map((instaItem) => {
                                                            if (instaItem._id.toString() === toggledId) {
                                                                return {
                                                                    ...instaItem,
                                                                    installmentPending: parseFloat(
                                                                        (
                                                                            instaItem.installmentPending - roundedDeduction
                                                                        ).toFixed(2)
                                                                    ),
                                                                };
                                                            }
                                                            return instaItem;
                                                        });

                                                        return {
                                                            ...prev,
                                                            invoice: {
                                                                ...prev.invoice,
                                                                total: parseFloat((newTotal - roundedDeduction).toFixed(2)),
                                                                installmentDetail: newInstallmentDetail,
                                                            },
                                                            instalments: newInstalments,
                                                        };
                                                    }
                                                });
                                            }}
                                        />

                                        <div className="grid grid-cols-2 md:grid-cols-4 space-x-7">
                                            <InputGroup
                                                disabled={true}
                                                label="Instalment Type"
                                                value={insta.installmentType}
                                            />
                                            <InputGroup
                                                disabled={true}
                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                iconPosition="left"
                                                label="Instalment Total"
                                                value={insta.installmentRate.toFixed(2)}
                                            />
                                            <InputGroup
                                                disabled={true}
                                                icon={<FaPoundSign className="text-neutral-300" size={20} />}
                                                iconPosition="left"
                                                label="Deducted Amount"
                                                value={deductionAmount}
                                            />
                                            <div className="flex items-center justify-center self-end mb-4 text-xs w-15">
                                                {insta.signed ? (
                                                    <p className="bg-green-400/30 text-green-700 px-2 py-1 rounded-md">
                                                        Signed
                                                    </p>
                                                ) : (
                                                    <p className="bg-yellow-400/30 text-yellow-700 px-2 py-1 rounded-md">
                                                        Unsigned
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </InputWrapper>
                    )}

                    {/* Daily Invoices */}
                    <div className="mb-6">
                        <InputWrapper title={'Invoices'}>
                            <div className="overflow-x-auto rounded-lg">
                                <table className="min-w-full border-collapse border border-gray-200 dark:border-dark-5 mb-2">
                                    <thead>
                                        <tr className="bg-primary-800 !text-white">
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Date</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Main Service</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Service Rate</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">BYOD Rate</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Total Miles</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Mileage Rate</th>
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Calculated Mileage</th>
                                            {currentInvoice?.invoice.invoices.some(
                                                (invoice) =>
                                                    invoice.additionalServiceDetails?.service || invoice.additionalServiceApproval === 'Requested'
                                            ) && (
                                                    <>
                                                        <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">
                                                            Additional Service Type
                                                        </th>
                                                        <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">
                                                            Additional Service Total
                                                        </th>
                                                    </>
                                                )}
                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Incentive Rate</th>
                                            {currentInvoice?.invoice.invoices.some(
                                                (invoice) => invoice.deductionDetail.length > 0) && <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Total Deductions</th>}
                                            {currentInvoice?.invoice.invoices.some(
                                                (invoice) =>
                                                    (currentInvoice?.invoice.driverId?.vatDetails?.vatNo !== '' &&
                                                        new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.vatDetails.vatEffectiveDate)) ||
                                                    (currentInvoice?.invoice.driverId?.companyVatDetails?.vatNo !== '' &&
                                                        new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.companyVatDetails.companyVatEffectiveDate))
                                            ) && (
                                                    <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">VAT</th>
                                                )}

                                            <th className="text-xs dark:text-gray-400 px-4 py-2 border-r border-primary-600 dark:border-dark-5">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentInvoice?.invoice.invoices
                                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                                            .map((invoice, index) => {
                                                const totalDeductions = invoice.deductionDetail?.reduce((sum, ded) => {
                                                    return sum + parseFloat(ded.rate || 0);
                                                }, 0);
                                                const hasDriverVat =
                                                    currentInvoice?.invoice.driverId?.vatDetails?.vatNo !== '' &&
                                                    new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.vatDetails.vatEffectiveDate);
                                                const hasCompanyVat =
                                                    currentInvoice?.invoice.driverId?.companyVatDetails?.vatNo !== '' &&
                                                    new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.companyVatDetails.companyVatEffectiveDate);
                                                return (
                                                    <tr key={invoice._id} className={index % 2 === 0 ? 'bg-white dark:bg-dark-3' : 'bg-gray-50 dark:bg-dark-4'}>
                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            {new Date(invoice.date).toLocaleDateString('en-UK')}
                                                        </td>
                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-2 py-2 border border-gray-200 dark:border-dark-5">
                                                            {invoice.mainService}
                                                        </td>
                                                        <td className="text-sm font-medium text-green-600 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{invoice.serviceRateforMain}
                                                        </td>
                                                        <td className="text-sm font-medium text-green-600 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{invoice.byodRate}
                                                        </td>
                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            {invoice.miles}
                                                        </td>
                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{invoice.mileage}
                                                        </td>
                                                        <td className="text-sm font-medium text-green-600 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{invoice.calculatedMileage}
                                                        </td>
                                                        {currentInvoice?.invoice.invoices.some(
                                                            (inv) => inv.additionalServiceDetails?.service || inv.additionalServiceApproval === 'Requested'
                                                        ) && (
                                                                <>
                                                                    <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                                        {invoice.additionalServiceApproval === 'Requested' ? (
                                                                            <div className="bg-red-200/40 text-red-400 text-xs px-2 py-1 rounded">Waiting for approval</div>
                                                                        ) : (
                                                                            invoice.additionalServiceDetails?.service || '-'
                                                                        )}
                                                                    </td>
                                                                    <td className="text-sm font-medium dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                                        {invoice.additionalServiceApproval === 'Requested' ? (
                                                                            <div className="bg-red-200/40 text-red-400 text-xs px-2 py-1 rounded">Waiting for approval</div>
                                                                        ) : (
                                                                            invoice.serviceRateforAdditional ? <p className='text-sm font-medium text-green-600'>£ {invoice.serviceRateforAdditional}</p> : '-'
                                                                        )}
                                                                    </td>
                                                                </>
                                                            )}
                                                        <td className="text-sm font-medium text-green-600 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{(invoice.incentiveDetailforMain?.rate || 0) + (invoice.incentiveDetailforAdditional?.rate || 0)}
                                                        </td>
                                                        {currentInvoice?.invoice.invoices.some(
                                                            (invoice) => invoice.deductionDetail.length > 0) && <td className="text-sm font-medium text-red-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                                {totalDeductions > 0 ? `-£${totalDeductions}` : `-`}
                                                            </td>}
                                                        {currentInvoice?.invoice.invoices.some(
                                                            (inv) =>
                                                                (currentInvoice?.invoice.driverId?.vatDetails?.vatNo !== '' &&
                                                                    new Date(inv.date) >= new Date(currentInvoice?.invoice.driverId.vatDetails.vatEffectiveDate)) ||
                                                                (currentInvoice?.invoice.driverId?.companyVatDetails?.vatNo !== '' &&
                                                                    new Date(inv.date) >= new Date(currentInvoice?.invoice.driverId.companyVatDetails.companyVatEffectiveDate))
                                                        ) && (
                                                                <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                                    {hasDriverVat || hasCompanyVat ? '20%' : '-'}
                                                                </td>
                                                            )}

                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                            £{invoice.total}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        <tr>
                                            <td
                                                colSpan={
                                                    7 +
                                                    (currentInvoice?.invoice.invoices.some(
                                                        (invoice) => invoice.deductionDetail.length > 0) ? 1 : 0) +
                                                    (currentInvoice?.invoice.invoices.some(
                                                        (invoice) =>
                                                            invoice.additionalServiceDetails?.service || invoice.additionalServiceApproval === 'Requested'
                                                    )
                                                        ? 2
                                                        : 0)
                                                }
                                            ></td>
                                            <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                Subtotal:
                                            </td>
                                            {currentInvoice?.invoice.invoices.some(
                                                (invoice) =>
                                                    (currentInvoice?.invoice.driverId?.vatDetails?.vatNo !== '' &&
                                                        new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.vatDetails.vatEffectiveDate)) ||
                                                    (currentInvoice?.invoice.driverId?.companyVatDetails?.vatNo !== '' &&
                                                        new Date(invoice.date) >= new Date(currentInvoice?.invoice.driverId.companyVatDetails.companyVatEffectiveDate))
                                            ) && (
                                                    <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                        £{currentInvoice?.invoice.vatTotal}
                                                    </td>
                                                )}
                                            <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
                                                £{currentInvoice?.invoice.invoices.reduce((sum, inv) => inv.total + sum || 0, 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex w-full gap-2">
                                {/* Installment Info Table */}
                                {currentInvoice?.invoice.installmentDetail?.length > 0 && (
                                    <div className='rounded-lg w-full overflow-hidden'>
                                        <table className="min-w-full border-collapse border border-gray-200 dark:border-dark-5 ">
                                            <thead>
                                                <tr className="bg-primary-800 text-white">
                                                    <th className="text-xs px-4 py-2 border-r border-primary-600">Instalment Type</th>
                                                    <th className="text-xs px-4 py-2 border-r border-primary-600">Deducted Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentInvoice.invoice.installmentDetail.map(insta => (
                                                    <tr key={insta._id} className="bg-gray-50 dark:bg-dark-4">
                                                        <td className="text-sm text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">{insta.installmentType}</td>
                                                        <td className="text-sm text-red-700 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5"> - £{insta.deductionAmount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {currentInvoice?.invoice.invoices.some(
                                    (invoice) => invoice.deductionDetail.length > 0) && (
                                        <div className='rounded-lg w-full overflow-hidden'>
                                            <table className="min-w-full border-collapse border border-gray-200 dark:border-dark-5 ">
                                                <thead>
                                                    <tr className="bg-primary-800 text-white">
                                                        <th className="text-xs px-4 py-2 border-r border-primary-600">Deduction Date</th>
                                                        <th className="text-xs px-4 py-2 border-r border-primary-600">Deduction Type</th>
                                                        <th className="text-xs px-4 py-2 border-r border-primary-600">Deducted Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentInvoice.invoice.invoices.map(inv => (
                                                        <tr key={inv._id} className="bg-gray-50 dark:bg-dark-4">
                                                            {inv.deductionDetail.map((ded) => (
                                                                <>
                                                                    <td className="text-sm text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">{new Date(ded.date).toLocaleDateString()}</td>
                                                                    <td className="text-sm text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">{ded.serviceType}</td>
                                                                    <td className="text-sm text-red-700 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5"> - £{ded.rate}</td>
                                                                </>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                            </div>

                        </InputWrapper>
                    </div>


                    {/* Weekly Total */}
                    <div className="mt-6 flex justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Weekly Total</h3>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                £{currentInvoice?.invoice.total}
                            </p>
                        </div>

                    </div>

                    {/*Download or Send Invoice */}
                    <div className='flex gap-3 p-3 rounded border-2 border-neutral-300 mt-2 w-full'>
                        <div className='w-full'>
                            <button
                                disabled={changed}
                                className='flex gap-2 bg-sky-400/50 items-center text-sm text-sky-600 rounded px-2 py-1 disabled:bg-gray-300 disabled:text-white'
                                onClick={() => generatePDF(contentRef.current, currentInvoice.driverName, currentInvoice.serviceWeek, 'downloadInvoice')}
                            >
                                <i className="flex items-center fi fi-sr-download"></i>
                                Download Invoice
                            </button>
                            {currentInvoice?.invoice?.downloadInvoice?.length > 0 && (
                                <div className='rounded-lg overflow-auto border border-neutral-200 mt-2 max-h-[15rem]'>
                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of Downloaded Invoices
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Downloaded On</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentInvoice.invoice?.downloadInvoice?.sort((a, b) => new Date(b.date) - new Date(a.date)).map((dInvoice) => (
                                                <tr >
                                                    <td>{new Date(dInvoice.date).toLocaleString()}</td>
                                                    <td ><div className='flex justify-center'><a className='flex w-fit bg-purple-300/50 text-purple-500 rounded p-2' target='_blank' href={dInvoice.document}><i class="flex items-center fi text-[1rem] fi-sr-file-download"></i></a></div></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>)}
                        </div>
                        <div className='w-full'>
                            <button
                                disabled={changed}
                                className="flex gap-2 items-center text-sm bg-amber-400/50 text-amber-600 rounded px-2 py-1 disabled:bg-gray-300 disabled:text-white"
                                onClick={() => {
                                    setSendingInvoice(true);
                                    generatePDF(contentRef.current, currentInvoice.driverName, currentInvoice.serviceWeek, 'sentInvoice');
                                }}
                            >
                                {sendingInvoice ? (
                                    <div className="w-3 h-3 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <i
                                        className={`fi fi-sr-paper-plane
                                        } flex items-center`}
                                    ></i>
                                )}
                                Send Invoice
                            </button>
                            {currentInvoice?.invoice?.sentInvoice?.length > 0 && (

                                <div className='rounded-lg overflow-auto border border-neutral-200 mt-2 max-h-[15rem]'>

                                    <table className='table-general'>
                                        <thead className='sticky top-0 bg-white'>
                                            <tr>
                                                <th colSpan={3}>
                                                    History of Sent Invoices
                                                </th>
                                            </tr>
                                            <tr>
                                                <th>Downloaded On</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentInvoice.invoice?.sentInvoice?.sort((a, b) => new Date(b.date) - new Date(a.date)).map((sInvoice) => (
                                                <tr>
                                                    <td>{new Date(sInvoice.date).toLocaleString()}</td>
                                                    <td ><div className='flex justify-center'><a className='flex w-fit bg-purple-300/50 text-purple-500 rounded p-2' target='_blank' href={sInvoice.document}><i class="flex items-center fi text-[1rem] fi-sr-file-download"></i></a></div></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>)}
                        </div>
                    </div>
                </div >
                <div className="border-t border-neutral-300 flex px-2 md:px-6 py-2 justify-end gap-2 items-center">
                    <button
                        className="px-2 py-1 h-fit bg-gray-500 rounded-md text-white hover:bg-gray-600"
                        onClick={() => { setCurrentInvoice(null); setChanged(false) }}
                    >
                        Close
                    </button>
                    <button
                        disabled={!changed}
                        className="px-2 py-1 h-fit bg-amber-500 rounded-md text-white hover:bg-amber-600 disabled:bg-gray-300"
                        onClick={() => handleUpdateInvoice(currentInvoice)}
                    >
                        Update
                    </button>
                    <button
                        disabled={changed}
                        onClick={() => generatePDF(contentRef.current, currentInvoice.driverName, currentInvoice.serviceWeek, 'print')}
                        className="px-2 h-fit py-1 bg-primary-500 rounded-md text-white hover:bg-primary-600 disabled:bg-gray-300"
                    >
                        Print Weekly Invoice
                    </button>
                </div>
            </Modal >
            <div style={{
                visibility: 'hidden',
                position: 'absolute',
                left: '-9999px'
            }}>

                {currentInvoice && (<PrintableContent ref={contentRef} invoice={currentInvoice.invoice} driverDetails={currentInvoice.invoice.driverId} />)}

            </div>
        </div >
    );
};

export default WeeklyInvoice;