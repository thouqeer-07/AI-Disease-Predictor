import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import healthReducer from './slices/healthSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    health: healthReducer,
  },
});
