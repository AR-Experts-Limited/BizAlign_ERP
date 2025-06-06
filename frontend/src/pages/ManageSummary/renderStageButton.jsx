import { useNavigate } from "react-router-dom";

export const renderStageButton = (currentInvoice, updateInvoiceApprovalStatus) => {
    const navigate = useNavigate()
    switch (currentInvoice?.invoice?.approvalStatus) {
        case "Access Requested":
            return (
                <button
                    onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Grant Access
                </button>
            );
        case "Under Edit":
        case "Invoice Generation":
            return (
                <button
                    disabled
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded !cursor-not-allowed"
                >
                    Awaiting OSM Action
                </button>
            );
        case "Under Approval":
            return (
                <button
                    onClick={() => updateInvoiceApprovalStatus(currentInvoice)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Approve Invoice
                </button>
            );
        case "completed":
            return (
                <button
                    onClick={() => navigate(`/manage-payments`)}
                    className="flex gap-2 bg-green-200 text-green-700 px-4 py-2 rounded border border-green-400"
                >
                    <i class="flex items-center fi fi-rr-money-bill-wave hover:text-primary-800 text-[1.2rem]" ></i>
                    Invoice Generated
                </button>
            );
        default:
            return null;
    }
};
