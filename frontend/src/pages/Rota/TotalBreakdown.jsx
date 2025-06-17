import React from "react";
import { useSelector } from 'react-redux';

const TotalBreakdown = ({
    miles,
    mileage,
    calculatedMileage,
    serviceRateforMain,
    byodRate,
    additionalServiceDetails,
    additionalServiceApproval,
    deductionDetail,
    incentiveDetailforMain,
    incentiveDetailforAdditional,
    total,
}) => {


    const totalDeductions = deductionDetail?.reduce((sum, ded) => {
        return sum + parseFloat(ded.rate || 0);
    }, 0);

    const additionalServiceTotal = additionalServiceDetails
        ? Number((Number(additionalServiceDetails.serviceRate || 0) +
            Number(additionalServiceDetails.byodRate || 0) +
            Number(additionalServiceDetails.miles || 0) * Number(additionalServiceDetails.mileage || 0)).toFixed(2)) +
        Number(incentiveDetailforAdditional?.rate || 0)

        : 0;
    const { userDetails } = useSelector((state) => state.auth);


    return (
        <div className="max-w-xl m-3 p-4 bg-gradient-to-br from-primary-50/5 to-primary-100/10 rounded-2xl border border-primary-100">
            <h2 className="text-xl font-bold text-primary-300 mb-4 text-center">
                Daily Invoice Breakdown
            </h2>
            <div className="space-y-3 text-base text-gray-800  dark:text-white">
                <div className="grid grid-cols-[7fr_1fr_1fr]">
                    <span >Base Service Rate:</span>
                    <span>£</span>
                    <span className="text-right">{serviceRateforMain}</span>
                </div>
                <div className="grid grid-cols-[7fr_1fr_1fr]">
                    <span>BYOD Rate:</span>
                    <span>£</span>
                    <span className="text-right">{byodRate}</span>
                </div>
                <div className="grid grid-cols-[7fr_1fr_1fr]">
                    <span>Calculated Mileage:</span>
                    <span>£</span>
                    <span className="text-right">{calculatedMileage}</span>
                </div>
                {additionalServiceDetails && (additionalServiceApproval === 'Approved' || ['super-admin', 'Admin'].includes(userDetails.role)) && <div className="grid grid-cols-[7fr_1fr_1fr]">
                    <span>Additional Services:</span>
                    <span>£</span>
                    <span className="text-right">{additionalServiceTotal}</span>
                </div>}
                {incentiveDetailforMain &&
                    <div className="grid grid-cols-[6fr_1fr_1fr] text-green-600">
                        <span>Incentives:</span>
                        <span>+£</span>
                        <span className="text-right">{incentiveDetailforMain.rate}</span>
                    </div>}

                <div className="grid grid-cols-[6fr_1fr_1fr] text-red-600">
                    <span>Other Deductions:</span>
                    <span>-£</span>
                    <span className="text-right">{totalDeductions}</span>
                </div>
                <hr className="my-3 border-t-2 border-primary-200" />
                <div className="grid grid-cols-[7fr_1fr_1fr] text-xl font-bold text-green-700">
                    <span>Total:</span>
                    <span>£</span>
                    <span className="text-right">{total}</span>
                </div>
            </div>
        </div >
    );
};

export default TotalBreakdown;
