// src/app/store.ts - Fixed Redux store configuration

import { configureStore } from '@reduxjs/toolkit';

// Create a simple root reducer for now
const rootReducer = {
  // Add your reducers here as you create them
  // For now, we'll add a simple placeholder
  app: (state = { initialized: true }, action: any) => {
    switch (action.type) {
      default:
        return state;
    }
  },
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
