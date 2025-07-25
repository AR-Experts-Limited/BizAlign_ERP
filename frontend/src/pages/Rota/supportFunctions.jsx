import axios from "axios"
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const getIncentiveDetails = async (driverId, driverService, selectedSite, date) => {
    const incentiveDetail = await axios.get(`${API_BASE_URL}/api/incentives/driver`, {
        params: {
            driverId,
            service: driverService,
            site: selectedSite,
            date: date
        }
    })
    return incentiveDetail.data
}

export const getDeductionDetails = async (driverId, date) => {
    const deductionDetail = await axios.get(`${API_BASE_URL}/api/deductions/filter`, {
        params: {
            driverId,
            date
        }
    });
    return deductionDetail.data
}

export const getInstallmentDetails = async (driverId) => {
    const installmentDetail = await axios.get(`${API_BASE_URL}/api/installments/${encodeURIComponent(driverId)}`)
    return installmentDetail.data
}


