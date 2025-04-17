import { configureStore } from '@reduxjs/toolkit';
import driverReducer from './features/drivers/driverSlice';
import siteReducer from './features/sites/siteSlice'
import ratecardReducer from './features/ratecards/ratecardSlice'
import serviceReducer from './features/services/serviceSlice'

export const store = configureStore({
    reducer: {
        drivers: driverReducer,
        sites: siteReducer,
        ratecards: ratecardReducer,
        services: serviceReducer,
    },
});
