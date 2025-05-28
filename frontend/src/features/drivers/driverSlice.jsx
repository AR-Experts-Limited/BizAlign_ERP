import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Async Thunks
export const fetchDrivers = createAsyncThunk('drivers/fetchDrivers', async () => {
    const response = await axios.get(`${API_BASE_URL}/api/drivers`);
    return response.data;
});

export const addDriver = createAsyncThunk('drivers/addDriver', async (driver) => {
    const response = await axios.post(`${API_BASE_URL}/api/drivers`, driver, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
});

export const updateDriver = createAsyncThunk('drivers/updateDriver', async (driver) => {
    const id = driver.get('_id');
    const response = await axios.put(`${API_BASE_URL}/api/drivers/newupdate/${id}`, driver, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
});

export const deleteDriver = createAsyncThunk('drivers/deleteDriver', async (id) => {
    await axios.delete(`${API_BASE_URL}/api/drivers/${id}`);
    return id;
});

const driverSlice = createSlice({
    name: 'drivers',
    initialState: {
        list: [],
        driverStatus: 'idle',
        error: null,
        addStatus: 'idle',
        updateStatus: 'idle',
        deleteStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Fetch Drivers
            .addCase(fetchDrivers.pending, (state) => {
                state.driverStatus = 'loading';
            })
            .addCase(fetchDrivers.fulfilled, (state, action) => {
                state.driverStatus = 'succeeded';
                state.list = action.payload;
            })
            .addCase(fetchDrivers.rejected, (state, action) => {
                state.driverStatus = 'failed';
                state.error = action.error.message;
            })

            // Add Driver
            .addCase(addDriver.pending, (state) => {
                state.addStatus = 'loading';
            })
            .addCase(addDriver.fulfilled, (state, action) => {
                state.addStatus = 'succeeded';
                state.list.push(action.payload);
            })
            .addCase(addDriver.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Driver
            .addCase(updateDriver.fulfilled, (state, action) => {
                const index = state.list.findIndex((d) => d._id === action.payload._id);
                if (index !== -1) state.list[index] = action.payload;
            })

            // Delete Driver
            .addCase(deleteDriver.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteDriver.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                state.list = state.list.filter((d) => d._id !== action.payload);
            })
            .addCase(deleteDriver.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default driverSlice.reducer;
