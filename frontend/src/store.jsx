import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';

import driverReducer from './features/drivers/driverSlice';
import siteReducer from './features/sites/siteSlice';
import ratecardReducer from './features/ratecards/ratecardSlice';
import serviceReducer from './features/services/serviceSlice';
import scheduleReducer from './features/schedules/scheduleSlice';
import standbydriverReducer from './features/standbydrivers/standbydriverSlice';
import authReducer from './features/auth/authSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    drivers: driverReducer,
    sites: siteReducer,
    ratecards: ratecardReducer,
    services: serviceReducer,
    schedules: scheduleReducer,
    standbydrivers: standbydriverReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['auth'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);
