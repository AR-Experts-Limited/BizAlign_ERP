import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchRatecards = createAsyncThunk('Ratecards/fetchRatecards', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/ratecards`)
    return response.data;
});

export const addRatecard = createAsyncThunk('Ratecards/addRatecard', async (Ratecard) => {
    const response = await axios.post(`${API_BASE_URL}`, Ratecard);
    return response.data;
});

export const updateRatecard = createAsyncThunk('Ratecards/updateRatecard', async (Ratecard) => {
    const response = await axios.put(`${API_BASE_URL}/${Ratecard.id}`, Ratecard);
    return response.data;
});

export const deleteRatecard = createAsyncThunk('Ratecards/deleteRatecard', async (id) => {
    await axios.delete(`${API_BASE_URL}/api/ratecards/${id}`);
    return id;
});

const RatecardSlice = createSlice({
    name: 'Ratecards',
    initialState: {
        list: [],
        ratecardStatus: 'idle',
        error: null,
        addStatus: 'idle',
        updateStatus: 'idle',
        deleteStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Ratecards
            .addCase(fetchRatecards.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchRatecards.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchRatecards.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })

            // Add Ratecard
            .addCase(addRatecard.pending, (state) => {
                state.addStatus = 'loading';
            })
            .addCase(addRatecard.fulfilled, (state, action) => {
                state.addStatus = 'succeeded';
                state.list.push(action.payload);
            })
            .addCase(addRatecard.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Ratecard
            .addCase(updateRatecard.fulfilled, (state, action) => {
                const index = state.list.findIndex((d) => d.id === action.payload.id);
                if (index !== -1) state.list[index] = action.payload;
            })

            // Delete Ratecard
            .addCase(deleteRatecard.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteRatecard.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                state.list = state.list.filter((d) => d._id !== action.payload);
            })
            .addCase(deleteRatecard.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default RatecardSlice.reducer;
