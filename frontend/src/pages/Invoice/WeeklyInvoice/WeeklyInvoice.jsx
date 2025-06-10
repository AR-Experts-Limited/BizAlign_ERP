import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSites } from '../../../features/sites/siteSlice';
import moment from 'moment';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Flatpickr from 'react-flatpickr';
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/plugins/monthSelect/style.css";
import { fetchDrivers } from '../../../features/drivers/driverSlice';
import axios from 'axios'
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

                const response = await axios.get(`${API_BASE_URL}/api/dayinvoice/siteandweek`, {
                    params: {
                        site: selectedSite,
                        serviceWeek: serviceWeeks,

                    }
                })

                setInvoices(response.data);
            };

        }
        fetchInvoices()
    }, [driversList, weeks]);

    useEffect(() => {
        let groupedInvoices = []
        if (invoices.length > 0) {
            groupedInvoices = invoices.reduce((acc, invoice) => {
                const key = `${invoice.driverId}-${invoice.serviceWeek}`;
                // const addOns = additionalCharges.filter((addon) => (addon.driverId == invoice.driverId && addon.week == invoice.serviceWeek && addon.site == invoice.site))

                if (!acc[key]) {
                    acc[key] = {
                        driverId: invoice.driverId,
                        driverEmail: invoice.driverEmail,
                        driverVehicleType: invoice.driverVehicleType,
                        driverName: invoice.driverName,
                        serviceWeek: invoice.serviceWeek,
                        site: invoice.site,
                        invoices: [],
                        count: 0,
                        invoiceGeneratedBy: invoice.invoiceGeneratedBy,
                        invoiceGeneratedOn: invoice.invoiceGeneratedOn,
                        standbyService: invoice.standbyService,
                        referenceNumber: invoice.referenceNumber,
                        // addOns: addOns,
                    };
                }
                const unsignedDeductions = invoice.deductionDetail?.filter((dd) => !dd.signed);
                const unsignedInstallment = invoice.installmentDetail?.filter((id) => !id.signed);
                if (unsignedDeductions?.length > 0 || unsignedInstallment?.length > 0) acc[key].unsigned = true;
                acc[key].invoices.push(invoice);
                acc[key].count++;
                return acc;
            }, {});
        }
        setGroupedInvoices(groupedInvoices)
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

    const tableData = (driver) => {
        return weeks.map((week) => {
            const key = `${driver._id}-${week.week}`;
            const invoice = groupedInvoices[key];
            console.log(key, invoice, groupedInvoices)
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
                                        <div className={`${!allCompleted || !invoice.unsigned && 'border-dashed border-gray-300'} relative z-6 w-full h-full flex flex-col gap-1 items-center overflow-auto dark:bg-dark-4 dark:text-white w-full bg-gray-100 border border-gray-200 dark:border-dark-5 rounded-md text-sm p-2 transition-all duration-300 group-hover:w-[82%]`}>
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
        <div className="w-full h-full flex flex-col items-center justify-center p-1.5 md:p-3 overflow-hidden dark:text-white">
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
        </div>
    );
};

export default WeeklyInvoice;