import React, { useState, useEffect } from 'react';
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
import { getInstallmentDetails } from '../../Rota/supportFunctions';
import InputWrapper from '../../../components/InputGroup/InputWrapper'
import InputGroup from '../../../components/InputGroup/InputGroup'


const API_BASE_URL = import.meta.env.VITE_API_URL;

moment.updateLocale('en', {
    week: {
        dow: 0,
    },
});


const WeeklyInvoice = () => {
    const dispatch = useDispatch();
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


    const handleShowDetails = async (invoice) => {
        console.log("Invoice:", invoice)
        const instalments = await getInstallmentDetails(invoice.driverId._id)
        console.log("Installments:", instalments)
        setCurrentInvoice({ invoice, instalments })
    }

    const calculateTotal = (invoice) => {

        return (
            invoice.serviceRateforMain +
            invoice.byodRate +
            invoice.calculatedMileage +
            (invoice.incentiveDetailforMain?.rate || 0)
        );
    };


    const tableData = (driver) => {
        return weeks.map((week) => {
            const key = `${driver._id}_${week.week}`;
            const invoice = groupedInvoices[key];
            console.log(key, groupedInvoices)
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
                    {/* Installments Section */}
                    {currentInvoice?.invoice.installmentDetail?.length > 0 && (
                        <InputWrapper title="Instalments">
                            {currentInvoice?.invoice.installmentDetail?.map((insta) => (
                                <div key={insta._id} className="flex max-sm:flex-col items-center gap-5 justify-between">
                                    <input
                                        type="checkbox"
                                        className="h-[50%] self-end mb-2 w-4 accent-primary-400 rounded focus:ring-primary-400"
                                        checked={true}
                                        disabled={true}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            const updatedInstallments = isChecked
                                                ? [...(currentInvoice?.invoice.installments || []), insta]
                                                : currentInvoice?.invoice.installments?.filter(i => i._id !== insta._id);

                                            setCurrentInvoice(prev => {
                                                return {
                                                    ...prev,
                                                    invoice: {
                                                        ...prev.invoice,
                                                        installments: updatedInstallments,
                                                    }
                                                };
                                            });
                                        }}
                                    />
                                    <div className="grid grid-cols-2 md:grid-cols-4 space-x-7">
                                        <InputGroup disabled={true} label="Instalment Type" value={insta.installmentType} />
                                        <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Instalment Total" value={insta.installmentRate} />
                                        <InputGroup disabled={true} icon={<FaPoundSign className="text-neutral-300" size={20} />} iconPosition="left" label="Deducted Amount" value={insta.deductionAmount} />
                                        <div className="flex items-center justify-center self-end mb-4 text-xs w-15">
                                            {insta.signed ? (
                                                <p className="bg-green-400/30 text-green-700 px-2 py-1 rounded-md">Signed</p>
                                            ) : (
                                                <p className="bg-yellow-400/30 text-yellow-700 px-2 py-1 rounded-md">Unsigned</p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ))}
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
                                                        <td className="text-sm font-medium text-gray-900 dark:text-white px-4 py-2 border border-gray-200 dark:border-dark-5">
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
                                                            £{invoice.incentiveDetailforMain?.rate || 0}
                                                        </td>
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
                            {/* Installment Info Table */}
                            {currentInvoice?.invoice.installmentDetail?.length > 0 && (
                                <div className='rounded-lg overflow-hidden'>
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

                        </InputWrapper>
                    </div>


                    {/* Weekly Total */}
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">Weekly Total</h3>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            £{currentInvoice?.invoice.total}
                        </p>
                    </div>
                </div >
                <div className="border-t border-neutral-300 flex px-2 md:px-6 py-2 justify-end gap-2 items-center">
                    <button
                        className="px-2 py-1 h-fit bg-gray-500 rounded-md text-white hover:bg-gray-600"
                        onClick={() => setCurrentInvoice(null)}
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            // handlePrint()
                        }}
                        className="px-2 h-fit py-1 bg-primary-500 rounded-md text-white hover:bg-primary-600"
                    >
                        Print Weekly Invoice
                    </button>
                </div>
            </Modal >
        </div >
    );
};

export default WeeklyInvoice;