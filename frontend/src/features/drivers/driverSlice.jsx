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

// Helper function to group drivers by site
const groupBySite = (drivers) => {
    return drivers.reduce((acc, driver) => {
        const site = driver.siteSelection;
        if (!acc[site]) {
            acc[site] = [];
        }
        acc[site].push(driver);
        return acc;
    }, {});
};

const driverSlice = createSlice({
    name: 'drivers',
    initialState: {
        //list: [],
        bySite: {}, // New key to store drivers grouped by site
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
                //state.list = action.payload;
                state.bySite = groupBySite(action.payload);
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
                const driver = action.payload;
                //state.list.push(driver);

                const site = driver.siteSelection;
                if (!state.bySite[site]) {
                    state.bySite[site] = [];
                }
                state.bySite[site].push(driver);
            })
            .addCase(addDriver.rejected, (state, action) => {
                state.addStatus = 'failed';
                state.error = action.error.message;
            })

            // Update Driver
            .addCase(updateDriver.pending, (state) => {
                state.updateStatus = 'loading';
            })
            .addCase(updateDriver.fulfilled, (state, action) => {
                state.updateStatus = 'succeeded';
                const updatedDriver = action.payload;
                // const index = state.list.findIndex((d) => d._id === updatedDriver._id);
                // if (index !== -1) state.list[index] = updatedDriver;

                // Re-group the updated list
                state.bySite = groupBySite(state.list);
            })
            .addCase(updateDriver.rejected, (state, action) => {
                state.updateStatus = 'failed';
                state.error = action.error.message;
            })

            // Delete Driver
            .addCase(deleteDriver.pending, (state) => {
                state.deleteStatus = 'loading';
            })
            .addCase(deleteDriver.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                // state.list = state.list.filter((d) => d._id !== action.payload);

                // Re-group after deletion
                state.bySite = groupBySite(state.list);
            })
            .addCase(deleteDriver.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default driverSlice.reducer;
