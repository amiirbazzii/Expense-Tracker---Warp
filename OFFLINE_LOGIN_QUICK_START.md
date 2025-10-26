# Offline Login - Quick Start Guide

## What You Get

✅ **Instant app access** - No waiting for authentication  
✅ **Works offline** - Use the app without internet  
✅ **Automatic sync** - Validates in background when online  
✅ **Secure** - Encrypted token storage  

## How It Works

### First Login (Online)
1. User logs in with credentials
2. Token is saved securely in IndexedDB
3. User can now use the app

### Subsequent Opens
1. App checks for offline token (< 100ms)
2. If found → **Instant login** ✨
3. Background validation happens silently
4. If online → Token refreshed
5. If offline → Continue with local data

## For Users

### Opening the App
- **Online**: App opens instantly, validates in background
- **Offline**: App opens instantly with offline banner
- **Slow connection**: App opens instantly, doesn't wait

### Offline Mode Indicator
When offline, you'll see a yellow banner:
```
⚠️ You're in offline mode
Your data is stored locally. Connect to sync with the cloud.
```

### Grace Period Warning
If your token is expired but within grace period (3 days):
```
⚠️ You're in offline mode. Please reconnect soon to verify your account.
```

### What Works Offline
- ✅ View all your data
- ✅ Add new expenses/income
- ✅ Edit existing records
- ✅ Delete records
- ✅ View analytics
- ✅ Export data

### What Requires Online
- ❌ Initial login (first time)
- ❌ Registration
- ❌ Password reset
- ❌ Syncing with cloud

## For Developers

### Installation

Already installed! The offline login system is integrated into:
- `src/lib/auth/OfflineTokenManager.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/OfflineLoginBanner.tsx`

### Usage in Components

#### Check Offline Mode
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isOfflineMode, offlineGracePeriodWarning } = useAuth();
  
  if (isOfflineMode) {
    // Show offline UI
  }
}
```

#### Add Offline Banner
```typescript
import { OfflineLoginBanner } from '@/components/OfflineLoginBanner';

export default function MyPage() {
  return (
    <>
      <OfflineLoginBanner />
      {/* Your content */}
    </>
  );
}
```

### Testing

Run the test suite:
```bash
npm test tests/offline-token-manager.test.ts
```

All 19 tests should pass ✅

### Manual Testing

1. **Test Instant Login**
   ```
   1. Login while online
   2. Close browser tab
   3. Reopen app
   → Should login instantly
   ```

2. **Test Offline Mode**
   ```
   1. Login while online
   2. Turn off WiFi
   3. Reopen app
   → Should login instantly with offline banner
   ```

3. **Test Slow Connection**
   ```
   1. Login while online
   2. Throttle network to Slow 3G (Chrome DevTools)
   3. Reopen app
   → Should login instantly, not wait for validation
   ```

## Configuration

### Change Token Expiry
Edit `src/lib/auth/OfflineTokenManager.ts`:
```typescript
private readonly TOKEN_EXPIRY_DAYS = 30;  // Default: 30 days
private readonly GRACE_PERIOD_DAYS = 3;   // Default: 3 days
```

### Change Validation Timeout
Edit `src/contexts/AuthContext.tsx`:
```typescript
setTimeout(() => resolve(false), 2000);  // Default: 2 seconds
```

## Troubleshooting

### App Not Logging In Instantly
1. Check browser console for errors
2. Verify IndexedDB is enabled
3. Clear browser data and login again

### Offline Banner Not Showing
1. Check network status in DevTools
2. Verify `useOnlineStatus` hook is working
3. Check `isOfflineMode` state in AuthContext

### Token Not Persisting
1. Check if IndexedDB is blocked
2. Verify crypto-js is installed
3. Check browser console for storage errors

## Security Notes

- Tokens are encrypted using AES
- No passwords are stored
- Device ID is generated per browser
- Tokens expire after 30 days
- Grace period allows 3 extra days offline

## Performance

- Initial load: < 100ms
- Token validation: 2s timeout (non-blocking)
- Storage size: ~1KB per token
- Works on all modern browsers

## Next Steps

1. ✅ Offline login is working
2. Add offline banner to more pages
3. Test on mobile devices
4. Monitor offline usage analytics
5. Consider biometric auth for future

## Support

- Documentation: `OFFLINE_LOGIN_IMPLEMENTATION.md`
- Tests: `tests/offline-token-manager.test.ts`
- Issues: Check browser console for errors
