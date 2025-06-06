// src/utils/csvUtils.js

import moment from 'moment';

export const parseCSV = (csvContent) => {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(value => value.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        data.push(row);
    }
    return data;
};

export const compareCsvData = (invoiceMap, csvData) => {
    const comparisonResults = {};

    csvData.forEach(row => {
        const driverName = row['Delivery Associate'];
        const date = row['Date'];
        const serviceType = row['Service Type'];

        if (driverName && date && serviceType) {
            // Assuming date format in CSV is DD-MM-YYYY or MM-DD-YYYY, adjust if necessary
            // For example, if it's 08-04-2025, moment will parse it correctly in DD-MM-YYYY
            const formattedDate = moment(date, 'DD-MM-YYYY').format('M/D/YYYY'); // Adjust format as per your invoice dateKey
            const dateKey = new Date(formattedDate).toLocaleDateString('en-UK');

            // This part assumes you have a way to map driver names from CSV to driver._id in your invoiceMap
            // For now, we'll use a placeholder or assume driverName itself can be used as driverId for comparison
            // In a real application, you'd likely need a mapping or to fetch driver IDs based on names.
            const driverIdForComparison = driverName; // Placeholder: You'll need to map this to an actual driver._id

            const key = `${dateKey}_${driverIdForComparison}`;
            const matchedInvoice = invoiceMap[key];

            if (matchedInvoice) {
                // Perform specific comparisons if needed
                // For example, if you want to check if the mainService matches the Service Type from CSV
                const serviceMatch = matchedInvoice.mainService === serviceType;

                comparisonResults[key] = {
                    status: serviceMatch ? 'matched' : 'service_mismatch',
                    invoice: matchedInvoice,
                    csvEntry: row,
                    details: serviceMatch ? 'Service type matches' : `Service type mismatch: Invoice '${matchedInvoice.mainService}', CSV '${serviceType}'`
                };
            } else {
                comparisonResults[key] = {
                    status: 'not_found_in_invoices',
                    csvEntry: row,
                    details: 'No matching invoice found for this driver and date.'
                };
            }
        }
    });
    return comparisonResults;
};