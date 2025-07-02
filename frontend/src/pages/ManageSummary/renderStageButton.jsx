import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';

export const RenderStageButton = ({ currentInvoice, updateInvoiceApprovalStatus }) => {
    // const navigate = useNavigate()
    const { userDetails } = useSelector((state) => state.auth);

    switch (currentInvoice?.invoice?.approvalStatus) {
        case "Access Requested":
            return (
                <button
                    onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                    className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                    Grant Access
                </button>
            );
        case "Under Edit":
            if (userDetails.role !== 'OSM')
                return (
                    <button
                        disabled
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded !cursor-not-allowed "
                    >
                        Awaiting OSM Action
                    </button>
                );
            else
                return (
                    <button
                        disabled={currentInvoice.restrictEdit}
                        onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                        className="bg-primary-300 text-white px-2 py-1 rounded  disabled:!cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700"
                    >
                        Submit Edit
                    </button>
                );
        case "Invoice Generation":
            if (userDetails.role !== 'OSM')
                return (
                    <button
                        disabled
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded !cursor-not-allowed "
                    >
                        Awaiting OSM Action
                    </button>
                );
            else
                return (
                    <button
                        onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                        className="bg-primary-300 text-white px-2 py-1 rounded  "
                    >
                        Generate Invoice
                    </button>
                );

        case "Under Approval":
            if (userDetails.role !== 'OSM')
                return (
                    <button
                        onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                        Approve Invoice
                    </button>
                );
            else
                return (
                    <button
                        disabled
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded !cursor-not-allowed "
                    >
                        Awaiting Admin Action
                    </button>
                );
        case "completed":
            return (
                <button
                    // onClick={() => navigate(`/manage-payments`)}
                    className="flex gap-1 bg-green-200 text-green-700 px-2 py-1 rounded border border-green-400 whitespace-nowrap !cursor-not-allowed"
                >
                    Invoice Generated
                </button>
            );
        default:
            return null;
    }
};
