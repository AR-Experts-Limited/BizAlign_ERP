import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux';

export const PrintableContent = React.forwardRef(({ invoice }, ref, driverDetails) => {
    const dispatch = useDispatch()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const { list: sites, siteStatus } = useSelector((state) => state.sites)

    useEffect(() => {
        if (siteStatus === 'idle') dispatch(fetchSites())
    }, [siteStatus, dispatch]);

    return (
        <div ref={ref} className="pdf text-[12px] font-sans bg-white p-5">
            <div className="invoice-container">
                <div className="invoice-header text-center mb-1 bg-[#4b0082] text-white p-1 pb-4.5 rounded">
                    <h1 className="text-[15px] font-bold uppercase m-0">Self-Billed Invoice</h1>
                </div>

                <div className="flex justify-between mb-3">
                    <div>
                        <p><strong className="italic">Site:</strong> {invoice.site}</p>
                        <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
                    </div>
                    <p><strong>Printed on:</strong> {new Date().toDateString()}</p>
                </div>

                {/* Bill From, Bill To, and Ship To */}
                <div className="invoice-details flex flex-col mb-8">
                    <div className="mb-3">
                        <h4 className="text-[12px] font-bold mb-2 border-b border-[#4b0082] pb-3">Bill From</h4>
                        <p><strong>Name:</strong> {invoice.driverName}</p>
                        {driverDetails?.transportId && <p><strong>Transport ID:</strong> {driverDetails.transportId}</p>}
                        {driverDetails?.utrNo && <p><strong>UTR Number:</strong> {driverDetails.utrNo}</p>}
                        {driverDetails?.vatDetails?.vatNo && <p><strong>VAT No.:</strong> {driverDetails.vatDetails?.vatNo}</p>}
                    </div>
                    <div className="flex justify-between">
                        <div className="w-1/2 pr-2">
                            <h4 className="text-[12px] font-bold mb-2 border-b border-[#4b0082] pb-3">Bill To</h4>
                            <p>
                                <strong>Raina Ltd.</strong><br />
                                Digital World Centre,<br />
                                1 Lowry Plaza<br />
                                Salford<br />
                                Manchester<br />
                                M50 3UB<br />
                                VAT No. 266927460<br />
                            </p>
                        </div>
                        <div className="w-1/2 pl-2 text-right">
                            <h4 className="text-[12px] font-bold mb-2 border-b border-[#4b0082] pb-3">Ship To</h4>
                            <strong>{invoice.site}</strong>
                            <p>{sites.find((site) => site.siteKeyword === invoice.site)?.siteAddress}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="invoice-table mb-2 ">
                <table className="w-full border-collapse mb-1 table-auto">
                    <thead className="bg-[#4b0082] text-white text-[0.7rem]">
                        <tr>
                            <th className="border-b-2 border-white p-1 pb-3 text-left font-bold ">Date</th>
                            <th className="border-b-2 border-white p-1 pb-3 text-left font-bold">Day</th>
                            <th className="border-b-2 border-white p-1 pb-3 text-left font-bold">Main Service</th>
                            <th className="border-b-2 border-white p-1 pb-4 text-left font-bold whitespace-nowrap">Service Rate - Main</th>
                            {invoice.additionalServiceDetails && (
                                <>
                                    <th className="border-b-2 border-white p-1 pb-4  text-left font-bold">Additional Service</th>
                                    <th className="border-b-2 border-white p-1 pb-4 text-left font-bold">Service Rate - Additional</th>
                                </>
                            )}
                            <th className="border-b-2 border-white p-1 pb-4  text-left font-bold">BYOD Rate</th>
                            <th className="border-b-2 border-white p-1 pb-4  text-left font-bold">Miles</th>
                            <th className="border-b-2 border-white p-1 pb-4  text-left font-bold">Mileage</th>
                            {invoice.incentiveDetail && (
                                <th className="border-b-2 border-white p-1 pb-4 text-left font-bold">{invoice.incentiveDetail?.type} Incentive</th>
                            )}
                            <th className="border-b-2 border-white p-1 pb-4  text-left font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="bg-[#f9f9f9]">
                            <td className=" p-2 text-left">{new Date(invoice.date).toLocaleDateString()}</td>
                            <td className=" p-2 text-left">{days[new Date(invoice.date).getDay()]}</td>
                            <td className=" p-2 text-left">{invoice.mainService}</td>
                            <td className=" p-2 text-left">£{invoice.serviceRateforMain}</td>
                            {invoice.additionalServiceDetails && (
                                <>
                                    <td className=" p-2 text-left">{invoice.additionalServiceDetails.service}</td>
                                    <td className=" p-2 text-left">£{invoice.serviceRateforAdditional}</td>
                                </>
                            )}
                            <td className=" p-2 text-left">£{invoice.byodRate}</td>
                            <td className=" p-2 text-left">{invoice.miles}</td>
                            <td className=" p-2 text-left">£{invoice.calculatedMileage}</td>
                            {invoice.incentiveDetail && (
                                <td className=" p-2 text-left">£{invoice.incentiveDetail?.rate}</td>
                            )}
                            <td className=" p-2 text-left">
                                £{invoice.serviceRateforMain +
                                    invoice.byodRate +
                                    invoice.calculatedMileage +
                                    (invoice.serviceRateforAdditional || 0) +
                                    (invoice.incentiveDetail?.rate || 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Payment Details */}
            <div className="payment-details mt-1">
                <h4 className="text-[16px] font-bold mb-2 border-b border-[#4b0082] pb-3">Payment Details</h4>
                <p><strong>Account Name:</strong> {driverDetails?.accountName}</p>
                <p><strong>Account Number:</strong> {driverDetails?.bankAccountNumber.replace(/^\d{4}/, '****')}</p>
                <p><strong>Bank Name:</strong> {driverDetails?.bankName}</p>
                <p><strong>Sort Code:</strong> {driverDetails?.sortCode.replace(/^\d{3}/, '***')}</p>
            </div>
        </div>
    );
});
