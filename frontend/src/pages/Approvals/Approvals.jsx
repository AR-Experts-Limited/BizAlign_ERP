import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios'
import { FcInfo } from "react-icons/fc";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const Approvals = () => {
    const [approvals, setApprovals] = useState([]);
    const [filterByType, setFilterByType] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const { userDetails } = useSelector((state) => state.auth);

    useEffect(() => {
        const getApprovals = async () => {
            const approvalResponse = await axios.get(`${API_BASE_URL}/api/approvals`);
            if (["Admin", "Operational Manager"].includes(userDetails.role))
                setApprovals(approvalResponse.data.filter((ap) => ap.type === 'additionalService'));
            else
                setApprovals(approvalResponse.data);
        };
        getApprovals();
    }, []);

    const processApprovalRequest = async (approval, decision) => {
        switch (approval.type) {
            case 'driverDelete':
                let updatedDriver = decision === 'Approved' ? { delReqStatus: "Approved" } : { delReqStatus: "" };
                await axios.put(`${API_BASE_URL}/api/drivers/${approval.reqData.driverId}`, updatedDriver);
                await axios.put(`${API_BASE_URL}/api/approvals`, {
                    id: approval._id,
                    userDetails: `${userDetails.firstName} ${userDetails.lastName}`,
                    approvalStatus: decision
                });
                break;
            case 'osmDelete':
                let updatedOSM = decision === 'Approved' ? { delReqStatus: "Approved" } : { delReqStatus: "" };
                await axios.put(`${API_BASE_URL}/api/auth/${approval.reqData.userID}`, updatedOSM);
                await axios.put(`${API_BASE_URL}/api/approvals`, {
                    id: approval._id,
                    userDetails: `${userDetails.firstName} ${userDetails.lastName}`,
                    approvalStatus: decision
                });
                break;
            case 'additionalService':
                let additionalServiceApproval = decision === 'Approved' ? 'Approved' : '';
                let dayInvoice = approval.reqData.dayInvoiceId;
                const additionalServiceDetails = additionalServiceApproval === 'Approved' ? approval.reqData.additionalServiceDetails : null;

                if (decision === 'Approved') {
                    dayInvoice = {
                        ...dayInvoice,
                        serviceRateforAdditional: (
                            additionalServiceDetails.serviceRate +
                            additionalServiceDetails.byodRate +
                            additionalServiceDetails.calculatedMileage +
                            (additionalServiceDetails?.incentiveDetailforAdditional ?? 0)
                        ),
                        total: parseFloat(
                            dayInvoice.total +
                            additionalServiceDetails.serviceRate +
                            additionalServiceDetails.byodRate +
                            additionalServiceDetails.calculatedMileage +
                            (additionalServiceDetails?.incentiveDetailforAdditional ?? 0))
                    };
                }
                await axios.put(`${API_BASE_URL}/api/dayInvoice/${dayInvoice._id}`, { ...dayInvoice, additionalServiceDetails, additionalServiceApproval });

                await axios.put(`${API_BASE_URL}/api/approvals`, {
                    id: approval._id,
                    userDetails: `${userDetails.firstName} ${userDetails.lastName}`,
                    approvalStatus: decision
                });
                break;
        }

        setApprovals(prev =>
            prev.map(ap => ap._id === approval._id
                ? { ...ap, approvalStatus: decision, decisionTakenBy: `${userDetails.firstName} ${userDetails.lastName}` }
                : ap
            )
        );
    };

    return (
        <div className='w-full h-full flex flex-col p-1.5 md:p-3.5'>
            <h2 className='text-sm md:text-xl mb-2 font-bold dark:text-white'>Approvals</h2>
            <div className='flex flex-col gap-3 p-2 w-full h-full bg-white dark:bg-dark dark:text-white rounded-lg border border-neutral-200 overflow-auto'>
                <div className='grid grid-cols-2 md:grid-cols-4 md:flex-row justify-around items-center p-3 gap-2 md:gap-14  bg-neutral-100/90 dark:bg-dark-4/90 border-[1.5px] border-neutral-300/80 dark:border-dark-5 rounded-lg overflow-visible dark:!text-white' >
                    <label className="text-sm font-medium">Filter by:</label>
                    <select onChange={(e) => setFilterStatus(e.target.value)} className="bg-white border border-neutral-200 p-2 rounded">
                        <option value="">Select Status</option>
                        <option value="pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Denied">Denied</option>
                    </select>
                    {userDetails.role === 'super-admin' && (
                        <select onChange={(e) => setFilterByType(e.target.value)} className="bg-white border border-neutral-200 p-2 rounded">
                            <option value="">Select Type</option>
                            <option value="osmDelete">OSM Delete</option>
                            <option value="driverDelete">Personnel Delete</option>
                            <option value="additionalService">Additional Service Approval</option>
                        </select>
                    )}
                    <input
                        type="text"
                        placeholder="Search by Details"
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-white border border-neutral-200 p-2 rounded"
                    />
                </div>

                <div className="overflow-auto flex-1">
                    <table className="min-w-full text-sm table-general">
                        <thead>
                            <tr className="sticky  top-0 z-3 bg-white dark:bg-dark dark:border-dark-3 border-b border-neutral-200 dark:text-white text-neutral-400">
                                <th className='max-w-10' >#</th>
                                <th >Details</th>
                                <th className='' >Approve/Deny</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvals
                                .filter(ap => filterByType === '' || ap.type === filterByType)
                                .filter(ap => filterStatus === '' || ap.approvalStatus === filterStatus)
                                .filter(ap => ap.reqData.details.toLowerCase().includes(search.toLowerCase()))
                                .map((approval, index) => (
                                    <tr key={approval._id} >
                                        <td >{index + 1}</td>
                                        <td>
                                            <div className='flex justify-around items-center w-full'>
                                                <div>{approval.reqData.details}</div>
                                                {approval.type === 'additionalService' && (
                                                    <div className="relative  ml-2 group">
                                                        <div className="absolute top-4 mb-1 left-1/2 -translate-x-1/2 w-64 bg-white border border-neutral-200 rounded shadow-lg px-4 py-2 text-xs z-10 hidden group-hover:block">
                                                            <table className="w-full text-left">
                                                                <tbody>
                                                                    <tr><th>Service:</th><td className='!border-none'>{approval.reqData.additionalServiceDetails?.service}</td></tr>
                                                                    <tr><th>Service Rate:</th><td className='!border-none'>£{approval.reqData.additionalServiceDetails?.serviceRate}</td></tr>
                                                                    <tr><th>Byod rate:</th><td className='!border-none'>£{approval.reqData.additionalServiceDetails?.byodRate}</td></tr>
                                                                    <tr><th>Miles Driven:</th><td className='!border-none'>{approval.reqData.additionalServiceDetails?.miles}</td></tr>
                                                                    <tr><th>Calculated Mileage:</th><td className='!border-none'>£{approval.reqData.additionalServiceDetails?.calculatedMileage}</td></tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div className=" relative inline-block cursor-pointer">
                                                            <FcInfo size={20} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className='flex justify-center'>
                                                {approval.approvalStatus === 'pending' ? (
                                                    <div className="flex justify-around gap-2 w-fit ">
                                                        <button
                                                            onClick={() => processApprovalRequest(approval, 'Approved')}
                                                            className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 font-semibold"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => processApprovalRequest(approval, 'Denied')}
                                                            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 font-semibold"
                                                        >
                                                            Deny
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={`flex justify-around px-3 py-1 w-fit rounded font-semibold border 
                                                        ${approval.approvalStatus === 'Approved'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                        }`}>
                                                        {approval.approvalStatus} by {approval.decisionTakenBy} on {new Date(approval.createdAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
};

export default Approvals;
