# Dashboard & Analytics

<cite>
**Referenced Files in This Document**   
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)
- [SummaryCards.tsx](file://src/features/dashboard/components/SummaryCards/SummaryCards.tsx)
- [CategoryBreakdownChart.tsx](file://src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx)
- [DailySpendingChart.tsx](file://src/features/dashboard/components/Charts/DailySpendingChart.tsx)
- [TotalBalanceCard.tsx](file://src/features/dashboard/components/TotalBalanceCard/TotalBalanceCard.tsx)
- [expense.ts](file://src/features/dashboard/types/expense.ts)
- [expenses.ts](file://convex/expenses.ts)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)
</cite>

## Update Summary
**Changes Made**   
- Updated SummaryCards component documentation to reflect new props and structure
- Corrected hook name from useExpenseData to useDashboardData based on actual implementation
- Added TotalBalanceCard component to referenced files and documentation
- Updated data flow description to include income data fetching
- Removed references to non-existent components (HeaderSection, CardBalances)
- Added documentation for card filtering functionality
- Updated project structure diagram to reflect actual file organization

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Data Flow and Processing](#data-flow-and-processing)
7. [Performance Considerations](#performance-considerations)
8. [Offline Functionality and Synchronization](#offline-functionality-and-synchronization)
9. [Edge Cases and UI States](#edge-cases-and-ui-states)
10. [Conclusion](#conclusion)

## Introduction
The Dashboard & Analytics feature serves as the central hub for financial insights in the expense tracking application. It provides users with a comprehensive overview of their spending patterns, income, and financial balances through interactive visualizations and summary metrics. Built using a modular component architecture under `src/features/dashboard`, the dashboard leverages Convex for real-time data fetching and synchronization, while implementing performance optimizations through React's memoization techniques. This document provides a detailed analysis of the dashboard's architecture, component structure, data flow, and key functionality.

## Project Structure
The dashboard feature is organized in a modular structure within the `src/features/dashboard` directory, separating components, hooks, and types into distinct subdirectories. This organization promotes reusability and maintainability across the application.

```mermaid
graph TB
subgraph "Dashboard Feature"
Components[components/]
Hooks[hooks/]
Types[types/]
Components --> AnalyticsTabs[AnalyticsTabs/]
Components --> CategoryList[CategoryList/]
Components --> Charts[Charts/]
Components --> Expenses[Expenses/]
Components --> Modals[Modals/]
Components --> SummaryCards[SummaryCards/]
Components --> TotalBalanceCard[TotalBalanceCard/]
Components --> CardFilter[CardFilter/]
Hooks --> useDashboardData[useDashboardData.ts]
Hooks --> useExpenseActions[useExpenseActions.ts]
Types --> expense[expense.ts]
Types --> income[income.ts]
end
subgraph "Dashboard Pages"
App[src/app/dashboard/]
Layout[layout.tsx]
Page[page.tsx]
end
App --> Page
Page --> Components
Page --> Hooks
Page --> Types
```

**Diagram sources**
- [project_structure](file://src/features/dashboard)

**Section sources**
- [project_structure](file://src/features/dashboard)

## Core Components
The dashboard is composed of several key components that work together to provide a cohesive financial overview. These components are organized under the `src/features/dashboard/components` directory and are imported into the main dashboard page.

**Section sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)

## Architecture Overview
The dashboard follows a client-server architecture with React components on the frontend and Convex functions handling backend operations. Data flows from the Convex database through custom hooks to presentation components, with proper state management for loading, error, and empty states.

```mermaid
graph TD
A[Convex Database] --> B[getExpensesByDateRange]
A[Convex Database] --> C[getIncomeByDateRange]
A[Convex Database] --> D[getCardBalances]
B --> E[useDashboardData Hook]
C --> E[useDashboardData Hook]
D --> F[TotalBalanceCard Component]
E --> G[DashboardPage]
G --> H[SummaryCards]
G --> I[CategoryBreakdownChart]
G --> J[DailySpendingChart]
G --> K[CategoryList]
G --> L[CardFilter]
M[User Interaction] --> N[DateFilterHeader]
N --> E[goToPreviousMonth/goToNextMonth]
E --> B[Fetch New Data]
O[Offline Changes] --> P[OfflineContext]
P --> Q[IndexedDB Storage]
Q --> R[Sync When Online]
R --> B
```

**Diagram sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)
- [expenses.ts](file://convex/expenses.ts)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts)
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)

## Detailed Component Analysis

### Dashboard Page Structure
The main dashboard page orchestrates all components and manages the overall layout and data flow.

```mermaid
classDiagram
class DashboardPage {
+token : string | null
+currentDate : Date
+expenses : Expense[] | undefined
+monthlyData : MonthlyData | null
+isLoading : boolean
+selectedExpense : any
+handleEditNavigation(expense : any) : void
}
DashboardPage --> useDashboardData : "uses"
DashboardPage --> useExpenseActions : "uses"
DashboardPage --> DateFilterHeader : "renders"
DashboardPage --> SummaryCards : "renders"
DashboardPage --> CategoryBreakdownChart : "renders"
DashboardPage --> DailySpendingChart : "renders"
DashboardPage --> CategoryList : "renders"
DashboardPage --> TotalBalanceCard : "renders"
DashboardPage --> CardFilter : "renders"
DashboardPage --> BottomNav : "renders"
```

**Diagram sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)

**Section sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)

### SummaryCards Component
The SummaryCards component displays key financial metrics including total income and total expenses for the selected month.

```mermaid
classDiagram
class SummaryCards {
+totalIncome : number
+totalExpenses : number
+isLoading : boolean
+formatCurrency(value : number, currency : string) : string
}
SummaryCards --> SettingsContext : "consumes"
SummaryCards --> formatters : "uses"
```

**Section sources**
- [SummaryCards.tsx](file://src/features/dashboard/components/SummaryCards/SummaryCards.tsx)

### Chart Components
The dashboard includes two primary chart components for visualizing spending patterns: CategoryBreakdownChart and DailySpendingChart.

#### Category Breakdown Chart
```mermaid
classDiagram
class CategoryBreakdownChart {
+categoryTotals : Record<string, number>
+chartData : object
+options : object
+formatCurrency(value : number, currency : string) : string
}
CategoryBreakdownChart --> ChartJS : "uses"
CategoryBreakdownChart --> SettingsContext : "consumes"
CategoryBreakdownChart --> formatters : "uses"
```

**Diagram sources**
- [CategoryBreakdownChart.tsx](file://src/features/dashboard/components/Charts/CategoryBreakdownChart.tsx)

#### Daily Spending Chart
```mermaid
classDiagram
class DailySpendingChart {
+dailyTotals : Record<string, number>
+chartData : object
+options : object
+formatCurrency(value : number, currency : string) : string
+formatDate(date : Date, calendar : string, format : string) : string
}
DailySpendingChart --> ChartJS : "uses"
DailySpendingChart --> SettingsContext : "consumes"
DailySpendingChart --> formatters : "uses"
```

**Diagram sources**
- [DailySpendingChart.tsx](file://src/features/dashboard/components/Charts/DailySpendingChart.tsx)

### TotalBalanceCard Component
The TotalBalanceCard component displays the user's total balance across all cards and provides navigation to the cards management page.

```mermaid
classDiagram
class TotalBalanceCard {
+className : string | undefined
+totalBalance : number
+formatCurrency(value : number, currency : string) : string
}
TotalBalanceCard --> useQuery : "uses"
TotalBalanceCard --> cardsAndIncome.getCardBalances : "queries"
TotalBalanceCard --> SettingsContext : "consumes"
TotalBalanceCard --> formatters : "uses"
```

**Section sources**
- [TotalBalanceCard.tsx](file://src/features/dashboard/components/TotalBalanceCard/TotalBalanceCard.tsx)

### CardFilter Component
The CardFilter component allows users to filter dashboard data by specific card.

```mermaid
classDiagram
class CardFilter {
+cards : CardBalance[]
+selectedCardId : string | null
+onSelectCard : (cardId : string | null) => void
}
CardFilter --> SettingsContext : "consumes"
CardFilter --> formatters : "uses"
```

**Section sources**
- [CardFilter.tsx](file://src/components/DateFilterHeader.tsx)

## Data Flow and Processing

### Data Fetching Sequence
The dashboard follows a clear sequence for fetching and processing expense and income data, starting from the Convex backend and ending with rendered visualizations.

```mermaid
sequenceDiagram
participant Page as DashboardPage
participant Hook as useDashboardData
participant ConvexExpenses as Convex Query (Expenses)
participant ConvexIncome as Convex Query (Income)
participant DB as Database
Page->>Hook : Initialize with token
Hook->>ConvexExpenses : Query getExpensesByDateRange<br/>with startDate and endDate
Hook->>ConvexIncome : Query getIncomeByDateRange<br/>with startDate and endDate
ConvexExpenses->>DB : Fetch expenses for user
ConvexIncome->>DB : Fetch income for user
DB-->>ConvexExpenses : Return expenses
DB-->>ConvexIncome : Return income
ConvexExpenses-->>Hook : Return result
ConvexIncome-->>Hook : Return result
Hook->>Hook : Process data with useMemo
Hook-->>Page : Return processed monthlyData
Page->>Page : Render SummaryCards, Charts, etc.
```

**Diagram sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)
- [expenses.ts](file://convex/expenses.ts)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts)

### Data Transformation Logic
The `useDashboardData` hook transforms raw expense and income data into structured summaries for display in charts and cards.

```mermaid
flowchart TD
A[Raw Expenses & Income] --> B{Data Available?}
B --> |No| C[Show Loading State]
B --> |Yes| D[Filter out Card Transfer transactions]
D --> E[Calculate Total Income]
E --> F[Calculate Total Expenses]
F --> G[Process Category Totals]
G --> H[Process Daily Totals]
H --> I[Return MonthlyData Object]
I --> J[Render Charts and Cards]
subgraph "Category Totals Processing"
G --> G1[Iterate through each expense]
G1 --> G2[Handle single or array categories]
G2 --> G3[Accumulate amounts by category]
G3 --> G4[Return categoryTotals object]
end
subgraph "Daily Totals Processing"
H --> H1[Iterate through each expense]
H1 --> H2[Format date as 'YYYY-MM-DD']
H2 --> H3[Accumulate amounts by date]
H3 --> H4[Return dailyTotals object]
end
```

**Diagram sources**
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)

**Section sources**
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)

## Performance Considerations
The dashboard implements several performance optimizations to ensure efficient rendering and data processing.

### Memoization Implementation
The `useMemo` hook is used to prevent unnecessary recalculations of expensive operations when the component re-renders.

```mermaid
classDiagram
class useDashboardData {
+monthlyData : MonthlyData | null
+refetchExpenses : () => void
}
useDashboardData --> useMemo : "wraps monthlyData calculation"
useDashboardData --> useCallback : "wraps refetchExpenses"
note right of useDashboardData
monthlyData is memoized based on [expenses, income]
refetchExpenses is memoized with empty dependency array
end
```

**Section sources**
- [useDashboardData.ts](file://src/features/dashboard/hooks/useDashboardData.ts)

### Efficient Re-renders
The dashboard minimizes re-renders through proper state management and dependency tracking.

```typescript
// In useDashboardData.ts
const monthlyData = useMemo<MonthlyData | null>(() => {
  // Expensive data processing operations
  // Only recalculated when expenses or income change
}, [expenses, income]);

const refetchExpenses = useCallback(() => {
  setKey((prevKey) => prevKey + 1); // Force re-query by changing key
}, []);
```

The `refetchExpenses` function is wrapped in `useCallback` to maintain referential equality between renders, preventing unnecessary re-renders of child components that depend on this function. The `monthlyData` calculation is wrapped in `useMemo` to avoid recalculating the category and daily totals whenever the component re-renders due to other state changes.

## Offline Functionality and Synchronization
The application implements robust offline functionality, allowing users to continue adding expenses even without network connectivity.

### Offline Data Flow
```mermaid
sequenceDiagram
participant UI as User Interface
participant Context as OfflineContext
participant Storage as IndexedDB
participant Convex as Convex Mutation
UI->>Context : Add expense while offline
Context->>Storage : Save to pending-expenses queue
Context->>UI : Update pendingExpenses state
UI->>UI : Show OfflineBanner with count
Note over UI,Context : User regains connectivity
UI->>Context : Detect online status
Context->>Context : Automatically sync pending expenses
loop For each pending expense
Context->>Convex : Attempt createExpense mutation
alt Success
Convex-->>Context : Confirm creation
Context->>Storage : Remove from queue
else Failure
Context->>Storage : Update status to 'failed'
end
end
```

**Diagram sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)

### Offline Context Implementation
The `OfflineContext` manages the offline state and pending expenses queue using IndexedDB via localforage.

```mermaid
classDiagram
class OfflineContext {
+isOnline : boolean
+pendingExpenses : PendingExpense[]
+addPendingExpense(expense : Omit<PendingExpense, 'id' | 'status'>) : Promise<void>
+syncPendingExpenses() : Promise<void>
+retryFailedExpense(expenseId : string) : Promise<void>
}
OfflineContext --> localforage : "persists data"
OfflineContext --> window.online/offline : "listens to events"
OfflineContext --> createExpenseMutation : "syncs when online"
note right of OfflineContext
Uses IndexedDB to persist pending expenses
Automatically attempts sync when online
Manual retry available for failed expenses
end
```

**Section sources**
- [OfflineContext.tsx](file://src/contexts/OfflineContext.tsx)

When the dashboard reflects offline changes once synced, the `refetchExpenses` function in `useDashboardData` is automatically triggered through Convex's real-time subscriptions, ensuring the dashboard displays the latest data including the newly synced expenses.

## Edge Cases and UI States
The dashboard handles various edge cases and UI states to provide a robust user experience.

### Empty States
The dashboard displays appropriate messages when no data is available:

```mermaid
flowchart TD
A[Check monthlyData] --> B{monthlyData exists?}
B --> |No| C{expenses undefined?}
C --> |Yes| D[Show loading skeleton]
C --> |No| E[Show 'No expenses for this month']
B --> |Yes| F{categoryTotals has keys?}
F --> |No| G[Hide analytics section]
F --> |Yes| H[Render charts and lists]
```

**Section sources**
- [DashboardPage.tsx](file://src/app/dashboard/page.tsx)

### Loading States
The dashboard implements loading states at multiple levels:

- **Global loading**: When authentication state is being determined
- **Data loading**: When expense and income data is being fetched from Convex
- **Component loading**: Individual components show loading states when waiting for data

```typescript
// In SummaryCards.tsx
if (isLoading) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gray-100 p-4 rounded-xl animate-pulse h-[90px]" />
      <div className="bg-gray-100 p-4 rounded-xl animate-pulse h-[90px]" />
    </div>
  );
}
```

### Error Handling
While not explicitly shown in the provided code, the application likely handles errors through Convex's error handling mechanisms and React's error boundaries. The offline context also includes error handling for failed sync attempts, logging errors to the console and updating the expense status to 'failed'.

## Conclusion
The Dashboard & Analytics feature provides a comprehensive financial overview through a well-structured, modular architecture. By leveraging Convex for real-time data access and implementing performance optimizations through React's memoization hooks, the dashboard delivers a responsive user experience. The component-based design promotes reusability and maintainability, while the offline-first approach ensures users can continue managing their finances even without network connectivity. Key strengths include the efficient data processing in `useDashboardData`, the clear separation of concerns between components, and the robust handling of edge cases and loading states. Future enhancements could include more sophisticated analytics, customizable date ranges, and enhanced offline conflict resolution.