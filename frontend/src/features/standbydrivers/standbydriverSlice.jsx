import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchStandbyDrivers = createAsyncThunk('StandbyDrivers/fetchStandbyDrivers', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/standbydriver`)
    return response.data;
});

export const addStandbyDriver = createAsyncThunk('StandbyDrivers/addStandbyDriver', async (standbyDriver) => {
    const response = await axios.post(`${API_BASE_URL}/api/standbydriver/`, standbyDriver);
    return response.data;
});

export const updateStandbyDriver = createAsyncThunk('StandbyDrivers/updateStandbyDriver', async (standbyDriver) => {
    const response = await axios.put(`${API_BASE_URL}//api/standbydriver/`, standbyDriver);
    return response.data;
});

export const deleteStandbyDriver = createAsyncThunk('StandbyDrivers/deleteStandbyDriver', async (standbyDriver) => {
    const response = await axios.put(`${API_BASE_URL}//api/standbydriver/`, standbyDriver);
    return response.data._id;
});

const StandbyDriverSlice = createSlice({
    name: 'StandbyDrivers',
    initialState: {
        list: [],
        standbyDriverStatus: 'idle',
        error: null,
        addStatus: 'idle',
        updateStatus: 'idle',
        deleteStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch StandbyDrivers
            .addCase(fetchStandbyDrivers.pending, (state) => {
                state.standbyDriverStatus = 'loading';
            })
            .addCase(fetchStandbyDrivers.fulfilled, (state, action) => {
                state.standbyDriverStatus = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchStandbyDrivers.rejected, (state, action) => {
                state.standbyDriverStatus = 'failed';
                state.error = action.error.message;
            })

            // Add StandbyDriver
            .addCase(addStandbyDriver.pending, (state) => {
                state.addStatus = 'loading';
            })
            .addCase(addStandbyDriver.fulfilled, (state, action) => {
                state.addStatus = 'succeeded';
                state.list.push(action.payload);
            })
            .addCase(addStandbyDriver.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update StandbyDriver
            .addCase(updateStandbyDriver.fulfilled, (state, action) => {
                const index = state.list.findIndex((d) => d.id === action.payload.id);
                if (index !== -1) state.list[index] = action.payload;
            })

            // Delete StandbyDriver
            .addCase(deleteStandbyDriver.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteStandbyDriver.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                state.list = state.list.filter((d) => d._id !== action.payload);
            })
            .addCase(deleteStandbyDriver.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default StandbyDriverSlice.reducer;
