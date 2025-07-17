// features/invoices/invoiceSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedInvoices: [],
    sendingInvoice: null, // Tracks the ID of the invoice being sent or 'stop' for stopping
    sentCount: 0, // Tracks the number of invoices sent
};

const invoiceSlice = createSlice({
    name: 'invoices',
    initialState,
    reducers: {
        setSelectedInvoices: (state, action) => {
            state.selectedInvoices = action.payload;
        },
        setSendingInvoice: (state, action) => {
            state.sendingInvoice = action.payload;
        },
        incrementSentCount: (state) => {
            state.sentCount += 1;
        },
        resetSentCount: (state) => {
            state.sentCount = 0;
        },
        clearSendingInvoice: (state) => {
            state.sendingInvoice = null;
            state.sentCount = 0;
        },
    },
});

export const { setSendingInvoice, setSelectedInvoices, incrementSentCount, resetSentCount, clearSendingInvoice } = invoiceSlice.actions;
export default invoiceSlice.reducer;