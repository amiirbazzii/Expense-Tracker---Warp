# 💰 PWA Expense Tracker App

A mobile-first, installable Progressive Web App (PWA) for tracking daily expenses with offline support.

## 🎯 Features

### ✅ Authentication
- [x] Custom username/password authentication
- [x] User registration and login
- [x] Persistent auth sessions
- [x] Secure logout functionality

### ✅ Expense Management
- [x] Add expenses with amount, title, categories, and date
- [x] Tag-based category system with auto-suggestions
- [x] Multiple categories per expense
- [x] Optional "for" field for expense attribution
- [x] Optimistic updates for better UX

### ✅ Dashboard & Analytics
- [x] Monthly expense summaries
- [x] Month navigation (previous/next)
- [x] Interactive pie chart for category breakdown
- [x] Bar chart for daily spending patterns
- [x] Responsive charts for mobile devices

### ✅ Offline Support
- [x] IndexedDB for local data caching
- [x] Offline expense creation queue
- [x] Automatic sync when connection restored
- [x] Offline status banner
- [x] Manual sync option

### ✅ Mobile & PWA
- [x] Mobile-first responsive design
- [x] Touch-friendly UI (44px minimum touch targets)
- [x] Installable as native app
- [x] Service worker for offline functionality
- [x] Bottom navigation for mobile
- [x] Framer Motion animations

## 🧱 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Convex (database + real-time functions)
- **Auth**: Custom username/password with Convex
- **Charts**: Chart.js with react-chartjs-2
- **Animations**: Framer Motion
- **Offline**: IndexedDB + Service Worker
- **UI**: Lucide React icons, Sonner toasts
- **Forms**: React Hook Form with Zod validation

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd warp-ex-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will:
   - Create a new Convex project
   - Generate `.env.local` with your Convex URL
   - Set up the database schema
   - Deploy backend functions

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in your browser**
   Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## 📱 PWA Installation

### On Mobile (iOS/Android)
1. Open the app in Safari (iOS) or Chrome (Android)
2. Tap the share button
3. Select "Add to Home Screen"
4. The app will appear as a native app icon

### On Desktop
1. Open the app in Chrome/Edge
2. Look for the install icon in the address bar
3. Click "Install" to add it as a desktop app

## 🌐 Usage

### First Time Setup
1. **Register**: Create an account with username and password
2. **Login**: Sign in to access your expense tracker

### Adding Expenses
1. Navigate to the "Expenses" tab
2. Fill in the expense form:
   - **Amount**: Enter the expense amount
   - **Title**: Brief description (e.g., "Lunch", "Gas")
   - **Categories**: Add tags by typing and pressing Enter
   - **For**: Optional field for attribution
   - **Date**: Select the expense date
3. Tap "Add Expense"

### Viewing Analytics
1. Go to the "Dashboard" tab
2. View monthly summaries with:
   - Total amount spent
   - Number of expenses
   - Category breakdown (pie chart)
   - Daily spending (bar chart)
3. Use arrow buttons to navigate between months

### Offline Usage
- The app works offline automatically
- Add expenses while offline - they'll be queued
- Orange banner shows offline status
- Expenses sync automatically when back online
- Manual sync available in Settings

### Settings
- View your profile information
- Check connection status
- Manual sync for offline expenses
- Logout option

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── expenses/        # Main expense form page
│   ├── dashboard/       # Analytics dashboard
│   ├── settings/        # User settings
│   ├── login/          # Authentication
│   └── register/       # User registration
├── components/         # Reusable components
├── contexts/          # React contexts (Auth, Offline)
├── providers/         # Provider wrappers
convex/               # Backend functions and schema
├── schema.ts         # Database schema
├── auth.ts          # Authentication functions
└── expenses.ts      # Expense management functions
public/              # Static assets and PWA files
├── manifest.json    # PWA manifest
├── sw.js           # Service worker
└── *.png           # App icons
```

### Key Components
- `ProtectedRoute`: Authentication wrapper
- `OfflineBanner`: Shows offline status
- `BottomNav`: Mobile navigation
- `AuthContext`: Manages user authentication
- `OfflineContext`: Handles offline functionality

### Database Schema
```typescript
// Users
{
  username: string,
  hashedPassword: string,
  tokenIdentifier: string
}

// Expenses
{
  amount: number,
  title: string,
  category: string[],
  for?: string,
  date: number,
  createdAt: number,
  userId: Id<"users">
}

// Categories
{
  name: string,
  userId: Id<"users">
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_CONVEX_URL` (from `.env.local`)
4. Deploy automatically

### Manual Deployment
1. Build the app: `npm run build`
2. Deploy the `out` folder to any static hosting
3. Ensure environment variables are set

## 📈 Success Criteria

| Feature | Status | Notes |
|---------|--------|-------|
| Auth | ✅ | Register, login, logout all work |
| Expense Input | ✅ | All fields function, tags behave correctly |
| Dashboard | ✅ | Charts reflect monthly data correctly |
| Offline Usage | ✅ | App usable and consistent without internet |
| PWA | ✅ | Installable on Android/iOS via browser |
| Deployment | ✅ | Accessible via Vercel URL |

## 🐛 Known Issues & Limitations

- Service worker caching is basic (can be enhanced)
- No expense editing/deleting (future feature)
- Simple password hashing (use bcrypt in production)
- Limited to username/password auth (could add OAuth)

## 🔮 Future Enhancements

- Profile editing capabilities
- Expense editing and deletion
- Recurring expense tracking
- Search and filtering
- Data export functionality
- Multiple currency support
- Budget tracking and alerts
- Enhanced offline sync with conflict resolution

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ using Next.js, Convex, and modern web technologies.
