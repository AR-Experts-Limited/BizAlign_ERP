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

export const updateDriver = createAsyncThunk(
    'drivers/updateDriver',
    async (driver, { getState }) => {
        const id = driver.get('_id');
        const state = getState();

        // Flatten all drivers from all sites to find the driver by _id
        const allDrivers = Object.values(state.drivers.bySite).flat();
        const existingDriver = allDrivers.find((d) => d._id === id);
        const previousSiteSelection = existingDriver?.siteSelection;

        const response = await axios.put(
            `${API_BASE_URL}/api/drivers/newupdate/${id}`,
            driver,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return { updatedDriver: response.data, previousSiteSelection };
    }
);

export const updateDriverDoc = createAsyncThunk(
    'drivers/updateDriverDoc',
    async ({ driver, updates }) => {
        const id = driver._id;
        const response = await axios.put(`${API_BASE_URL}/api/drivers/docUpdate/${id}`, updates);
        return { updatedDriver: response.data };
    }
);

export const disableDriver = createAsyncThunk(
    'drivers/disableDriver',
    async ({ driver, email, disabled }) => {
        const id = driver._id;
        const siteSelection = driver.siteSelection
        const response = await axios.post(
            `${API_BASE_URL}/api/drivers/toggleDriver/${id}`, {
            email, disabled
        });

        return { disabledDriver: response.data.disabledDriver, siteSelection };
    }
);

export const deleteDriver = createAsyncThunk('drivers/deleteDriver', async ({ id, siteSelection }) => {
    await axios.delete(`${API_BASE_URL}/api/drivers/${id}`);
    return { driverId: id, siteSelection };
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
        disableStatus: 'idle',
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
                const { updatedDriver, previousSiteSelection } = action.payload;
                if (updatedDriver.siteSelection === previousSiteSelection) {
                    const index = state.bySite[updatedDriver.siteSelection].findIndex((d) => d._id === updatedDriver._id);
                    if (index !== -1) state.bySite[updatedDriver.siteSelection][index] = updatedDriver;
                }
                else {
                    state.bySite[previousSiteSelection] = state.bySite[previousSiteSelection].filter(driver => driver._id !== updatedDriver._id);
                    if (!state.bySite[updatedDriver.siteSelection]) {
                        state.bySite[updatedDriver.siteSelection] = [];
                    }
                    state.bySite[updatedDriver.siteSelection].push(updatedDriver)
                }
            })
            .addCase(updateDriver.rejected, (state, action) => {
                state.updateStatus = 'failed';
                state.error = action.error.message;
            })

            //UpdateDriverDoc
            .addCase(updateDriverDoc.pending, (state) => {
                state.updateStatus = 'loading';
            })
            .addCase(updateDriverDoc.fulfilled, (state, action) => {
                state.updateStatus = 'succeeded';
                const { updatedDriver } = action.payload;
                const index = state.bySite[updatedDriver.siteSelection].findIndex((d) => d._id === updatedDriver._id);
                if (index !== -1) state.bySite[updatedDriver.siteSelection][index] = updatedDriver;

            })
            .addCase(updateDriverDoc.rejected, (state, action) => {
                state.updateStatus = 'failed';
                state.error = action.error.message;
            })

            // disableDriver
            .addCase(disableDriver.pending, (state) => {
                state.disableStatus = 'loading';
            })

            .addCase(disableDriver.fulfilled, (state, action) => {
                state.disableStatus = 'succeeded';
                const { disabledDriver, siteSelection } = action.payload;
                const index = state.bySite[siteSelection].findIndex((d) => d._id === disabledDriver?._id);
                if (index !== -1) state.bySite[siteSelection][index] = disabledDriver;

            })

            .addCase(disableDriver.rejected, (state, action) => {
                state.disableStatus = 'failed';
                state.error = action.error.message;
            })

            // Delete Driver
            .addCase(deleteDriver.pending, (state) => {
                state.deleteStatus = 'loading';
            })

            .addCase(deleteDriver.fulfilled, (state, action) => {
                state.deleteStatus = 'succeeded';
                const { driverId, siteSelection: site } = action.payload; // should contain at least `_id` and `siteSelection`

                if (site && state.bySite[site]) {
                    // Remove driver from that site array
                    state.bySite[site] = state.bySite[site].filter(driver => driver._id !== driverId);
                }

            })

            .addCase(deleteDriver.rejected, (state, action) => {
                state.deleteStatus = 'failed';
                state.error = action.error.message;
            });
    },
});

export default driverSlice.reducer;
