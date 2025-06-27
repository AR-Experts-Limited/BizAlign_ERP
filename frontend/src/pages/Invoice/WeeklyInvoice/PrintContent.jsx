import React, { useEffect } from 'react';
import moment from 'moment'

export const PrintableContent = React.forwardRef(({ invoice, driverDetails, sites }, ref) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let weeklyTotalEarning = 0;
    let weeklyTotalDeduction = 0;
    let weeklyTotalInstallment = 0;
    let weeklyTotalAddOns = 0;
    let vatAddition = 0;

    const weeklyDeductions = invoice.invoices.flatMap((inv) => inv.deductionDetail?.map((d) => ({ ...d, date: inv.date })) || []);

    return (
        <div ref={ref} className="font-sans text-xs bg-[#FFFFFF] p-4">
            <div className="p-1 bg-[#FFFFFF]">
                <div className="text-center mb-1 bg-[#4B0082] text-[#FFFFFF] p-2.5 pb-5 rounded">
                    <h1 className="text-sm font-bold uppercase m-0">Self-Billed Invoice</h1>
                </div>
                <div className="flex justify-between mb-2">
                    <div>
                        <p className="text-[10px] mb-0.5"><span className="italic font-semibold">Site:</span> {invoice.site}</p>
                        <p className="text-[10px] mb-0.5"><span className="font-semibold">Service Week:</span> {invoice.serviceWeek}</p>
                        <p className="text-[10px] mb-0.5"><span className="font-semibold">Invoice Number:</span> {invoice.referenceNumber}</p>
                        <p className="text-[10px] mb-0.5">
                            <span className="font-semibold">Due Date:</span>{' '}
                            {moment(invoice.serviceWeek, 'GGGG-[W]WW').startOf('week').add(17, 'days').format('YYYY-MM-DD')}
                        </p>
                    </div>
                    <div className='flex gap-3'>
                        <div>
                            <h4 className="text-[10px] font-bold mt-1 mb-2.5 border-b border-[#4B0082] pb-2">Bill From</h4>
                            <p className="text-[10px]"><span className="font-semibold">Name:</span> {driverDetails?.firstName + ' ' + driverDetails?.lastName}</p>
                            {driverDetails?.address && <p className="text-[10px]"><span className="font-semibold">Address:</span> {driverDetails.address}</p>}
                            {driverDetails?.postcode && <p className="text-[10px]"><span className="font-semibold">Postcode:</span> {driverDetails.postcode}</p>}
                            {driverDetails?.transportId && <p className="text-[10px]"><span className="font-semibold">Transport ID:</span> {driverDetails.transportId}</p>}
                            {driverDetails?.utrNo && <p className="text-[10px]"><span className="font-semibold">UTR Number:</span> {driverDetails.utrNo}</p>}
                            {driverDetails?.vatDetails?.vatNo && <p className="text-[10px]"><span className="font-semibold">VAT No.:</span> {driverDetails.vatDetails?.vatNo}</p>}
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold mt-1 mb-2.5 border-b border-[#4B0082] pb-2">Company details</h4>
                            {driverDetails?.companyName && <p className="text-[10px]"><span className="font-semibold">Company Name:</span> {driverDetails.companyName}</p>}
                            {driverDetails?.companyRegNo && <p className="text-[10px]"><span className="font-semibold">Company Reg No:</span> {driverDetails.companyRegNo}</p>}
                            {driverDetails?.companyRegAddress && <p className="text-[10px]"><span className="font-semibold">Company Reg Address:</span> {driverDetails.companyRegAddress}</p>}
                            {driverDetails?.companyUtrNo && <p className="text-[10px]"><span className="font-semibold">Company UTR Number:</span> {driverDetails.companyUtrNo}</p>}
                            {driverDetails?.companyVatDetails?.companyVatNo && <p className="text-[10px]"><span className="font-semibold">Company VAT No.:</span> {driverDetails.companyVatDetails?.companyVatNo}</p>}

                        </div>
                    </div>
                </div>

                <div className="flex flex-col mb-5">
                    <div className="flex justify-between">
                        <div className="flex-1 pr-2.5">
                            <h4 className="text-[10px] font-bold mb-2.5 border-b border-[#4B0082] pb-2">Bill To</h4>
                            <p className="text-[10px]">
                                <strong>Raina Ltd.</strong><br />
                                Digital World Centre,<br />
                                1 Lowry Plaza<br />
                                Salford<br />
                                Manchester<br />
                                M50 3UB<br />
                                VAT No. 266927460
                            </p>
                        </div>
                        <div className="flex-1 pl-2.5 text-right">
                            <h4 className="text-[10px] font-bold mb-2.5 border-b border-[#4B0082] pb-2">Ship To</h4>
                            <strong className='text-[10px]'>{invoice.site}</strong>
                            <p className="text-[10px]">{sites?.find((site) => site.siteKeyword === invoice.site)?.siteAddress}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="break-before-page">
                <div className="mb-0">
                    <table className="border-collapse text-[10px] mb-5 table-auto border border-[#E5E7EB]">
                        <thead className="bg-[#4B0082] text-[#FFFFFF]">
                            <tr>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Date</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Main Service</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Service Rate</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">BYOD Rate</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Total Miles</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Mileage Rate</th>
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Calculated Mileage</th>
                                {invoice.invoices.some((inv) => inv.additionalServiceDetails?.service || inv.additionalServiceApproval === 'Requested') && (
                                    <>
                                        <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Additional Service Type</th>
                                        <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Additional Service Total</th>
                                    </>
                                )}
                                {invoice.invoices.some(
                                    (invoice) => invoice.incentiveDetailforMain?.rate || invoice.incentiveDetailforAdditional?.rate) && (<th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Incentive Rate</th>)}
                                {invoice.invoices.some((inv) => inv.deductionDetail.length > 0) && (
                                    <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Total Deductions</th>
                                )}
                                {invoice.invoices.some(
                                    (inv) =>
                                        (driverDetails?.vatDetails?.vatNo && new Date(inv.date) >= new Date(driverDetails.vatDetails.vatEffectiveDate)) ||
                                        (driverDetails?.companyVatDetails?.companyVatNo && new Date(inv.date) >= new Date(driverDetails.companyVatDetails.companyVatEffectiveDate))
                                ) && (
                                        <th className="text-[10px] w-[3rem] max-w-[3rem] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">VAT</th>
                                    )}
                                <th className="text-[10px] px-1 pb-3 border-r border-[#4B0082] text-center font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.invoices
                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                .map((item, index) => {
                                    const totalDeductions = item.deductionDetail?.reduce((sum, ded) => sum + parseFloat(ded.rate || 0), 0) || 0;
                                    const hasDriverVat = driverDetails?.vatDetails?.vatNo && new Date(item.date) >= new Date(driverDetails.vatDetails.vatEffectiveDate);
                                    const hasCompanyVat = driverDetails?.companyVatDetails?.companyVatNo && new Date(item.date) >= new Date(driverDetails.companyVatDetails.companyVatEffectiveDate);
                                    let dayTotal = item.serviceRateforMain + item.byodRate + item.calculatedMileage + (item.serviceRateforAdditional || 0) + (item.incentiveDetailforMain?.rate || 0) + (item.incentiveDetailforAdditional?.rate || 0);
                                    if (hasDriverVat || hasCompanyVat) {
                                        vatAddition += item.total * 0.2;
                                    }
                                    weeklyTotalEarning += item.total;
                                    return (
                                        <tr key={item._id} className={index % 2 === 0 ? 'bg-[#FFFFFF]' : 'bg-[#F9FAFB]'}>
                                            <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">{new Date(item.date).toLocaleDateString('en-UK')}</td>
                                            <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">{item.mainService}{item.site !== invoice?.driverId?.siteSelection ? `(${item.site})` : ''}</td>
                                            <td className="text-[10px] font-medium text-[#16A34A] p-2 border border-[#E5E7EB]">£{item.serviceRateforMain.toFixed(2)}</td>
                                            <td className="text-[10px] font-medium text-[#16A34A] p-2 border border-[#E5E7EB]">£{item.byodRate.toFixed(2)}</td>
                                            <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">{item.miles}</td>
                                            <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">£{item.mileage.toFixed(2)}</td>
                                            <td className="text-[10px] font-medium text-[#16A34A] p-2 border border-[#E5E7EB]">£{item.calculatedMileage.toFixed(2)}</td>
                                            {invoice.invoices.some((inv) => inv.additionalServiceDetails?.service || inv.additionalServiceApproval === 'Requested') && (
                                                <>
                                                    <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">
                                                        {item.additionalServiceApproval === 'Requested' ? (
                                                            <div className="bg-[#FEE2E2] text-[#EF4444] text-[10px] px-2 py-1 rounded">Waiting for approval</div>
                                                        ) : (
                                                            item.additionalServiceDetails?.service || '-'
                                                        )}
                                                    </td>
                                                    <td className="text-[10px] font-medium text-[#16A34A] p-2 border border-[#E5E7EB]">
                                                        {item.additionalServiceApproval === 'Requested' ? (
                                                            <div className="bg-[#FEE2E2] text-[#EF4444] text-[10px] px-2 py-1 rounded">Waiting for approval</div>
                                                        ) : (
                                                            item.serviceRateforAdditional ? `£ ${(item.serviceRateforAdditional - item.incentiveDetailforAdditional?.rate).toFixed(2)}` : '-'
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            {invoice.invoices.some(
                                                (invoice) => invoice.incentiveDetailforMain?.rate || invoice.incentiveDetailforAdditional?.rate) && (<td className="text-[10px] font-medium text-[#16A34A] p-2 border border-[#E5E7EB]">£{((item.incentiveDetailforMain?.rate || 0) + (item.incentiveDetailforAdditional?.rate || 0)).toFixed(2) || '0.00'}</td>
                                                )}

                                            {invoice.invoices.some((inv) => inv.deductionDetail.length > 0) && (
                                                <td className="text-[10px] font-medium text-[#7F1D1D] p-2 border border-[#E5E7EB]">{totalDeductions > 0 ? `-£${totalDeductions.toFixed(2)}` : '-'}</td>
                                            )}
                                            {invoice.invoices.some(
                                                (inv) =>
                                                    (driverDetails?.vatDetails?.vatNo && new Date(inv.date) >= new Date(driverDetails.vatDetails.vatEffectiveDate)) ||
                                                    (driverDetails?.companyVatDetails?.companyVatNo && new Date(inv.date) >= new Date(driverDetails.companyVatDetails.companyVatEffectiveDate))
                                            ) && (
                                                    <td className="text-[10px] w-[3rem] max-w-[3rem] font-medium text-[#111827] p-2 border border-[#E5E7EB]">{hasDriverVat || hasCompanyVat ? '20%' : '-'}</td>
                                                )}
                                            <td className="text-[10px] font-medium text-[#111827] p-2 border border-[#E5E7EB]">£{item.total.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            <tr>
                                <td
                                    colSpan={
                                        6 +
                                        (invoice.invoices.some(
                                            (invoice) => invoice.incentiveDetailforMain?.rate || invoice.incentiveDetailforAdditional?.rate) ? 1 : 0) +
                                        (invoice.invoices.some((inv) => inv.deductionDetail.length > 0) ? 1 : 0) +
                                        (invoice.invoices.some((inv) => inv.additionalServiceDetails?.service || inv.additionalServiceApproval === 'Requested') ? 2 : 0)
                                    }
                                    className="border border-[#E5E7EB]"
                                ></td>
                                <td className="text-[10px] font-medium text-[#111827] px-2 py-1 border border-[#E5E7EB]">Subtotal:</td>
                                {invoice.invoices.some(
                                    (inv) =>
                                        (driverDetails?.vatDetails?.vatNo && new Date(inv.date) >= new Date(driverDetails.vatDetails.vatEffectiveDate)) ||
                                        (driverDetails?.companyVatDetails?.companyVatNo && new Date(inv.date) >= new Date(driverDetails.companyVatDetails.companyVatEffectiveDate))
                                ) && (
                                        <td className="text-[10px] w-[3rem] max-w-[3rem] font-medium text-[#111827] px-2 py-1 border border-[#E5E7EB]">£{vatAddition.toFixed(2)}</td>
                                    )}
                                <td className="text-[10px] font-medium text-[#111827] px-4 py-2 border border-[#E5E7EB]"> £{invoice.invoices.reduce((sum, inv) => inv.total + sum || 0, 0).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="break-before-page">
                <div className="flex justify-between mt-0 ">
                    {invoice.invoices.some((inv) => inv.deductionDetail.length > 0) && (
                        <div className="flex-1  border-r border-[#D1D5DB] px-2 ">
                            <h4 className="text-[10px] font-bold mb-2.5 border-b border-[#4B0082] p-2">Deductions</h4>
                            <table className="w-full border-collapse text-[10px] border border-[#E5E7EB]">
                                <thead>
                                    <tr className="bg-[#4B0082] text-[#FFFFFF]">
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Deduction Date</th>
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Deduction Type</th>
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Deducted Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyDeductions.map((deduction, idx) => {
                                        weeklyTotalDeduction += parseFloat(deduction.rate || 0);
                                        return (
                                            <tr key={idx} className="bg-[#F9FAFB]">
                                                <td className="text-[10px] text-[#111827] px-1 pb-2 border border-[#E5E7EB]">{new Date(deduction.date).toLocaleDateString()}</td>
                                                <td className="text-[10px] text-[#111827] px-1 pb-2 border border-[#E5E7EB]">{deduction.serviceType}</td>
                                                <td className="text-[10px] text-[#7F1D1D] px-1 pb-2 border border-[#E5E7EB]">-£{deduction.rate.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {invoice.installmentDetail?.length > 0 && (
                        <div className="flex-1  border-r border-[#D1D5DB] px-2 ">
                            <h4 className="text-[10px] font-bold mb-2.5 border-b border-[#4B0082] p-2">Installments</h4>
                            <table className="w-full border-collapse text-[10px] border border-[#E5E7EB]">
                                <thead>
                                    <tr className="bg-[#4B0082] text-[#FFFFFF]">
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Instalment Type</th>
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Deducted Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.installmentDetail.map((installment, idx) => {
                                        weeklyTotalInstallment += parseFloat(installment.deductionAmount || 0);
                                        return (
                                            <tr key={installment._id} className="bg-[#F9FAFB]">
                                                <td className="text-[10px] text-[#111827] px-1 pb-2 border border-[#E5E7EB]">{installment.installmentType}</td>
                                                <td className="text-[10px] text-[#7F1D1D] px-1 pb-2 border border-[#E5E7EB]">-£{installment.deductionAmount.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {invoice.additionalChargesDetail?.length > 0 && (
                        <div className="flex-1  border-r border-[#D1D5DB] px-2 ">
                            <h4 className="text-[10px] font-bold mb-2.5 border-b border-[#4B0082] p-2">Additional Charges</h4>
                            <table className="w-full border-collapse text-[10px] border border-[#E5E7EB]">
                                <thead>
                                    <tr className="bg-[#4B0082] text-[#FFFFFF]">
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Charge Title</th>
                                        <th className="text-[10px] px-1 pb-2 border-r border-[#4B0082] text-center font-bold">Charge Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.additionalChargesDetail.map((addon, idx) => {
                                        weeklyTotalAddOns = addon.type === 'addition' ? weeklyTotalAddOns + addon.rate : weeklyTotalAddOns - addon.rate
                                        return (
                                            <tr key={addon._id} className="bg-[#F9FAFB]">
                                                <td className="text-[10px] text-[#111827] px-1 pb-2 border border-[#E5E7EB]">{addon.title}</td>
                                                <td className="text-[10px]  px-1 pb-2 border border-[#E5E7EB]">{addon.type === 'addition' ? '+' : '-'} £{addon.rate.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
                <div className='grid grid-cols-[1fr_1fr] gap-2 mt-5'>
                    <div className="px-2 ">
                        <h4 className="text-[13px] font-bold mb-2.5 border-b border-[#4B0082] pb-2">Payment Details</h4>
                        <p className="text-[13px]"><span className="font-semibold">Account Name:</span> {driverDetails?.bankChoice === 'Company' ? driverDetails?.accountNameCompany : driverDetails?.accountName}</p>
                        <p className="text-[13px]"><span className="font-semibold">Account Number:</span> {(driverDetails?.bankChoice === 'Company' ? (driverDetails?.bankAccountNumberCompany || '') : (driverDetails?.bankAccountNumber || '')).replace(/^\d{4}/, '****')}</p>
                        <p className="text-[13px]"><span className="font-semibold">Bank Name:</span> {driverDetails?.bankChoice === 'Company' ? driverDetails?.bankNameCompany : driverDetails?.bankName}</p>
                        <p className="text-[13px]"><span className="font-semibold">Sort Code:</span> {(driverDetails?.bankChoice === 'Company' ? (driverDetails?.sortCodeCompany || '') : (driverDetails?.sortCode || '')).replace(/^\d{3}/, '***')}</p>
                    </div>
                    <div className="flex-1 pl-2 text-right border-l border-[#D1D5DB]">
                        <h4 className="text-[15px] font-bold mb-2.5 border-b border-[#4B0082] pb-2">Summary</h4>
                        <div className="grid grid-cols-[3fr_1fr] text-[13px] gap-y-1">
                            <p className="font-semibold text-left">Total Earnings:</p>
                            <p className=" text-right">£{(weeklyTotalEarning + vatAddition + weeklyTotalDeduction).toFixed(2)}</p>

                            <p className="font-semibold text-left">Total Deductions:</p>
                            <p className=" text-right">-£{weeklyTotalDeduction.toFixed(2)}</p>

                            <p className="font-semibold text-left">Total Installments:</p>
                            <p className=" text-right">-£{weeklyTotalInstallment.toFixed(2)}</p>

                            <p className="font-semibold text-left">Total AddOns:</p>
                            <p className=" text-right">{weeklyTotalAddOns < 0 ? '-' : '+'} £{Math.abs(weeklyTotalAddOns).toFixed(2)}</p>
                        </div>

                        <h3 className="text-lg font-bold mt-2.5 text-[#4B0082] text-right">
                            Amount Due: £{(weeklyTotalEarning + vatAddition - weeklyTotalInstallment + weeklyTotalAddOns).toFixed(2)}
                        </h3>

                    </div>
                </div>
            </div>
        </div>
    );
});