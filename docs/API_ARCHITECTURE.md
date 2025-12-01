# API Architecture Documentation

## Overview

This application now uses **axios** for all API calls to ensure consistent async behavior, better error handling, and easier debugging. The architecture is split into multiple specialized API modules.

## Why Axios?

Previously, the app had inconsistent API patterns:
- ❌ Direct Supabase client calls (some with error handling, some without)
- ❌ Native `fetch()` for external APIs
- ❌ Silent failures causing infinite loading screens
- ❌ No centralized error handling

With axios:
- ✅ Consistent async/await patterns across the app
- ✅ Automatic request/response interceptors
- ✅ Better error handling with detailed logging
- ✅ Type-safe API calls
- ✅ Centralized configuration

## API Modules

### 1. `src/api/axiosClient.ts` - Core Axios Client

**Purpose**: Base axios instance with interceptors for all API calls.

**Features**:
- Auto-attaches Supabase auth tokens to requests
- Logs all API calls in development mode
- Global error handling (401, 403, 404, 500, etc.)
- Helper functions for REST operations

**Usage**:
```typescript
import { api } from '@/api/axiosClient';

// GET request
const data = await api.get<MyType>('/endpoint');

// POST request
const result = await api.post('/endpoint', { data });

// Supabase REST API helpers
const users = await api.supabase.select('users', '*', { id: 'eq.123' });
```

### 2. `src/api/dashboard.ts` - Dashboard API

**Purpose**: Dashboard statistics and user data.

**Key Function**:
```typescript
import { getDashboardStats } from '@/api/dashboard';

const stats = await getDashboardStats(userId);
// Returns: { savedCount, likedCount, activeBidsCount, wonAuctionsCount, totalSpent, activeWatching }
```

**Features**:
- Uses `Promise.all()` for parallel queries (faster!)
- Graceful error handling with fallback values
- Type-safe responses

### 3. `src/api/openai.ts` - ChatGPT/OpenAI Integration

**Purpose**: AI-powered features using ChatGPT API.

**Available Functions**:

```typescript
import { openaiAPI } from '@/api/openai';

// Generate item descriptions
const description = await openaiAPI.generateItemDescription({
  title: "Vintage Comic Book",
  category: "Comics",
  condition: "Mint",
  features: ["First Edition", "Signed"]
});

// Suggest pricing
const pricing = await openaiAPI.suggestPricing({
  title: "Rare Trading Card",
  category: "Sports Cards",
  condition: "Near Mint"
});

// Moderate content
const moderation = await openaiAPI.moderateContent(userComment);

// Generate search tags
const tags = await openaiAPI.generateTags(title, description);

// Simple text generation
const response = await openaiAPI.generateText("What is this item?");
```

**Environment Variable Required**:
```env
VITE_OPENAI_API_KEY=sk-...
```

### 4. `src/api/stripe.ts` - Stripe Payment Integration

**Purpose**: All Stripe payment operations.

**Available Functions**:

```typescript
import { stripeAPI, getStripe } from '@/api/stripe';

// Create payment intent
const { clientSecret } = await stripeAPI.createPaymentIntent({
  amount: 99.99,
  description: "Auction purchase"
});

// Get Stripe client
const stripe = await getStripe();

// Confirm payment
await stripeAPI.confirmPayment(paymentIntentId, paymentMethodId);

// Create customer
const { customerId } = await stripeAPI.createCustomer({
  email: user.email,
  name: user.name
});

// Utility functions
const platformFee = stripeAPI.calculatePlatformFee(100); // $2.50
const cents = stripeAPI.toCents(99.99); // 9999
const dollars = stripeAPI.toDollars(9999); // 99.99
```

**Environment Variable Required**:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

### 5. Existing Supabase APIs (Still Work!)

These APIs continue to use Supabase client directly but with proper error handling:

- `src/api/orders.ts` - Order management
- `src/api/payments.ts` - Payment methods & shipping addresses
- `src/api/email.ts` - Email notifications
- `src/api/auctions/bids.ts` - Bid operations
- `src/api/auth/authManager.ts` - Authentication

## Migration Guide

### Before (Direct Supabase with issues):

```typescript
// ❌ Old way - silent failures, no error handling
const { data } = await supabase
  .from('table')
  .select('*')
  .eq('id', userId);

// Loading never ends if error occurs!
```

### After (Using new API modules):

```typescript
// ✅ New way - proper error handling, parallel queries
import { getDashboardStats } from '@/api/dashboard';

try {
  const stats = await getDashboardStats(userId);
  // Always returns data, with fallback to zeros on error
} catch (error) {
  // Errors are logged and handled gracefully
}
```

## API Call Best Practices

### 1. Always Use Try-Catch

```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const data = await api.get('/endpoint');
    setData(data);
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to load data');
  } finally {
    setLoading(false);
  }
};
```

### 2. Use Promise.all for Parallel Requests

```typescript
// ✅ Good - parallel (faster)
const [users, posts, comments] = await Promise.all([
  api.get('/users'),
  api.get('/posts'),
  api.get('/comments')
]);

// ❌ Bad - sequential (slower)
const users = await api.get('/users');
const posts = await api.get('/posts');
const comments = await api.get('/comments');
```

### 3. Set Loading State Properly

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.get('/data');
      setMyData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false); // Always runs!
    }
  };

  fetchData();
}, []);
```

### 4. Check User Before Making Authenticated Requests

```typescript
const loadUserData = async () => {
  if (!user) {
    setLoading(false);
    return;
  }

  try {
    setLoading(true);
    const data = await getDashboardStats(user.id);
    setStats(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

## Environment Variables

Add these to your `.env` file:

```env
# Supabase (existing)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Base URL (for your backend)
VITE_API_BASE_URL=http://localhost:3000/api

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# OpenAI (ChatGPT)
VITE_OPENAI_API_KEY=sk-...
```

## Debugging API Calls

### Development Mode

In development, all API calls are automatically logged:

```
✅ GET /api/dashboard/stats { savedCount: 5, likedCount: 3, ... }
❌ API Error: { url: '/api/items', status: 404, message: 'Not found' }
```

### Production Mode

Errors are still logged to console but with less verbosity.

### Common Issues

**Issue: 400 Bad Request**
- Check request payload format
- Verify required fields are present
- Check browser console for details

**Issue: 401 Unauthorized**
- User session expired
- Token not properly attached (check interceptor)

**Issue: Infinite loading**
- Ensure `finally { setLoading(false) }` always runs
- Check that error cases are handled

**Issue: CORS errors**
- Backend needs proper CORS headers
- Check `VITE_API_BASE_URL` is correct

## Testing API Calls

```typescript
// Test individual API functions
import { getDashboardStats } from '@/api/dashboard';

const testUserId = 'test-user-123';
const stats = await getDashboardStats(testUserId);
console.log(stats);
```

## Future Enhancements

- [ ] Add request caching with React Query
- [ ] Implement optimistic updates
- [ ] Add retry logic for failed requests
- [ ] Create API mock server for testing
- [ ] Add GraphQL support if needed

## Summary

Your app now has:
1. ✅ **Consistent axios-based API layer**
2. ✅ **Proper async/await patterns**
3. ✅ **OpenAI integration ready**
4. ✅ **Stripe integration ready**
5. ✅ **Better error handling**
6. ✅ **No more infinite loading screens**

All API calls now use axios for consistent, reliable async behavior!
