# API Reference

<cite>
**Referenced Files in This Document**   
- [auth.ts](file://convex/auth.ts)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts)
- [expenses.ts](file://convex/expenses.ts)
- [userSettings.ts](file://convex/userSettings.ts)
- [schema.ts](file://convex/schema.ts)
</cite>

## Table of Contents
1. [Authentication API](#authentication-api)
2. [Cards & Income API](#cards--income-api)
3. [Expenses API](#expenses-api)
4. [User Settings API](#user-settings-api)
5. [Error Codes](#error-codes)
6. [Rate Limiting Policies](#rate-limiting-policies)

## Authentication API

The Authentication API handles user registration, login, logout, and password recovery functionality.

### Register User
Creates a new user account with username and password.

**Endpoint**: `mutation auth.register`  
**Authentication**: Not required  

**Request Parameters**:
- `username` (string): Desired username (case-insensitive)
- `password` (string): Password for the account

**Response**:
```json
{
  "userId": "document_id",
  "token": "authentication_token"
}
```

**Usage Example**:
```javascript
const result = await api.auth.register({
  username: "john_doe",
  password: "secure_password"
});
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L78-L109)

### Login User
Authenticates a user with their credentials and returns an authentication token.

**Endpoint**: `mutation auth.login`  
**Authentication**: Not required  

**Request Parameters**:
- `username` (string): Username (case-insensitive)
- `password` (string): Password

**Response**:
```json
{
  "userId": "document_id",
  "token": "authentication_token"
}
```

**Usage Example**:
```javascript
const result = await api.auth.login({
  username: "john_doe",
  password: "secure_password"
});
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L111-L145)

### Get Current User
Retrieves the currently authenticated user's information.

**Endpoint**: `query auth.getCurrentUser`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Valid authentication token

**Response**:
```json
{
  "_id": "document_id",
  "username": "username"
}
```
Returns null if the token is invalid or expired.

**Usage Example**:
```javascript
const user = await api.auth.getCurrentUser({ token: userToken });
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L147-L170)

### Logout User
Invalidates the current authentication token.

**Endpoint**: `mutation auth.logout`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Current authentication token

**Response**:
```json
{
  "success": true
}
```

**Usage Example**:
```javascript
await api.auth.logout({ token: userToken });
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L172-L195)

### Generate Recovery Code
Generates a recovery code for password reset purposes.

**Endpoint**: `mutation auth.generateRecoveryCode`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Valid authentication token

**Response**:
```json
{
  "recoveryCode": "AB12-CD34-EF"
}
```

**Usage Example**:
```javascript
const result = await api.auth.generateRecoveryCode({ token: userToken });
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L197-L222)

### Check Recovery Code Status
Determines if the user has already generated a recovery code.

**Endpoint**: `query auth.hasRecoveryCode`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Valid authentication token

**Response**:
```json
true | false
```

**Usage Example**:
```javascript
const hasCode = await api.auth.hasRecoveryCode({ token: userToken });
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L224-L243)

### Validate Recovery Code
Verifies a recovery code and returns user information if valid.

**Endpoint**: `mutation auth.validateRecoveryCode`  
**Authentication**: Not required  

**Request Parameters**:
- `recoveryCode` (string): 10-character alphanumeric recovery code

**Response**:
```json
{
  "userId": "document_id",
  "username": "username"
}
```

**Usage Example**:
```javascript
const result = await api.auth.validateRecoveryCode({ 
  recoveryCode: "AB12-CD34-EF" 
});
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L245-L261)

### Reset Password with Recovery Code
Resets the user's password using a valid recovery code.

**Endpoint**: `mutation auth.resetPasswordWithRecoveryCode`  
**Authentication**: Not required  

**Request Parameters**:
- `recoveryCode` (string): Valid recovery code
- `newPassword` (string): New password (minimum 6 characters)

**Response**:
```json
{
  "userId": "document_id",
  "token": "new_authentication_token"
}
```

**Usage Example**:
```javascript
const result = await api.auth.resetPasswordWithRecoveryCode({
  recoveryCode: "AB12-CD34-EF",
  newPassword: "new_secure_password"
});
```

**Section sources**
- [auth.ts](file://convex/auth.ts#L263-L294)

## Cards & Income API

The Cards & Income API manages financial cards and income records.

### Add Card
Creates a new card for the user.

**Endpoint**: `mutation cardsAndIncome.addCard`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `name` (string): Name of the card

**Response**: Returns the created card document.

**Usage Example**:
```javascript
const card = await api.cardsAndIncome.addCard({
  token: userToken,
  name: "Main Account"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L34-L52)

### Get My Cards
Retrieves all cards belonging to the user.

**Endpoint**: `query cardsAndIncome.getMyCards`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of card objects with their properties.

**Usage Example**:
```javascript
const cards = await api.cardsAndIncome.getMyCards({ token: userToken });
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L54-L68)

### Delete Card
Removes a card from the user's account.

**Endpoint**: `mutation cardsAndIncome.deleteCard`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `cardId` (id): ID of the card to delete

**Response**:
```json
{ "success": true }
```

**Notes**: Cannot delete a card that is used in any income or expense records.

**Usage Example**:
```javascript
await api.cardsAndIncome.deleteCard({
  token: userToken,
  cardId: "card_document_id"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L70-L109)

### Create Income
Adds a new income record to a card.

**Endpoint**: `mutation cardsAndIncome.createIncome`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `amount` (number): Income amount
- `cardId` (id): ID of the card receiving income
- `date` (number): Unix timestamp of income date
- `source` (string): Source of income
- `category` (string): Income category
- `notes` (string, optional): Additional notes

**Response**: Returns the created income document.

**Usage Example**:
```javascript
const income = await api.cardsAndIncome.createIncome({
  token: userToken,
  amount: 5000,
  cardId: "card_document_id",
  date: Date.now(),
  source: "Salary",
  category: "Salary"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L111-L158)

### Get Income
Retrieves all income records for the user.

**Endpoint**: `query cardsAndIncome.getIncome`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of income objects with their properties.

**Usage Example**:
```javascript
const incomeRecords = await api.cardsAndIncome.getIncome({ token: userToken });
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L160-L174)

### Get Income by Date Range
Retrieves income records within a specific date range.

**Endpoint**: `query cardsAndIncome.getIncomeByDateRange`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `startDate` (number): Unix timestamp of start date
- `endDate` (number): Unix timestamp of end date
- `key` (number, optional): Cache busting key

**Response**: Array of income objects within the specified date range.

**Usage Example**:
```javascript
const income = await api.cardsAndIncome.getIncomeByDateRange({
  token: userToken,
  startDate: startOfMonth,
  endDate: endOfMonth
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L176-L198)

### Get Unique Income Categories
Retrieves all unique income categories for the user.

**Endpoint**: `query cardsAndIncome.getUniqueIncomeCategories`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of income category names as strings.

**Usage Example**:
```javascript
const categories = await api.cardsAndIncome.getUniqueIncomeCategories({ 
  token: userToken 
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L200-L218)

### Get Income by ID
Retrieves a specific income record by its ID.

**Endpoint**: `query cardsAndIncome.getIncomeById`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `incomeId` (id): ID of the income record

**Response**: The income document if found and authorized.

**Usage Example**:
```javascript
const income = await api.cardsAndIncome.getIncomeById({
  token: userToken,
  incomeId: "income_document_id"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L220-L238)

### Update Income
Modifies an existing income record.

**Endpoint**: `mutation cardsAndIncome.updateIncome`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `incomeId` (id): ID of the income record to update
- `amount` (number): New amount
- `source` (string): New source
- `category` (string): New category
- `date` (number): New date (Unix timestamp)
- `cardId` (id): New card ID
- `notes` (string, optional): New notes

**Response**:
```json
{ "success": true }
```

**Usage Example**:
```javascript
await api.cardsAndIncome.updateIncome({
  token: userToken,
  incomeId: "income_document_id",
  amount: 5500,
  source: "Bonus Salary",
  category: "Salary"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L240-L288)

### Delete Income
Removes an income record from the system.

**Endpoint**: `mutation cardsAndIncome.deleteIncome`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `incomeId` (id): ID of the income record to delete

**Response**:
```json
{ "success": true }
```

**Usage Example**:
```javascript
await api.cardsAndIncome.deleteIncome({
  token: userToken,
  incomeId: "income_document_id"
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L290-L314)

### Get Card Balances
Calculates and returns the balance for each card.

**Endpoint**: `query cardsAndIncome.getCardBalances`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of card balance objects containing:
- `cardId`: Card document ID
- `cardName`: Name of the card
- `totalIncome`: Sum of all income to this card
- `totalExpenses`: Sum of all expenses from this card
- `balance`: Net balance (income - expenses)

**Usage Example**:
```javascript
const balances = await api.cardsAndIncome.getCardBalances({ token: userToken });
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L316-L368)

### Transfer Funds
Transfers funds between two cards by creating corresponding expense and income records.

**Endpoint**: `mutation cardsAndIncome.transferFunds`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `fromCardId` (id): ID of the card to transfer from
- `toCardId` (id): ID of the card to transfer to
- `amount` (number): Amount to transfer

**Response**:
```json
{ "success": true }
```

**Validation Rules**:
- Cannot transfer to the same card
- Amount must be positive
- Sufficient funds must be available in the source card
- Both cards must belong to the user

**Usage Example**:
```javascript
await api.cardsAndIncome.transferFunds({
  token: userToken,
  fromCardId: "source_card_id",
  toCardId: "destination_card_id",
  amount: 100
});
```

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L370-L424)

## Expenses API

The Expenses API manages expense records, categories, and related data.

### Create Expense
Creates a new expense record.

**Endpoint**: `mutation expenses.createExpense`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `amount` (number): Expense amount
- `title` (string): Title/description of expense
- `category` (array[string]): Array of category names
- `for` (array[string]): Array of "for" values (who/what the expense was for)
- `date` (number): Unix timestamp of expense date
- `cardId` (id, optional): ID of the card used for this expense

**Response**: Returns the created expense document.

**Usage Example**:
```javascript
const expense = await api.expenses.createExpense({
  token: userToken,
  amount: 50,
  title: "Grocery Shopping",
  category: ["Food"],
  for: ["Family"],
  date: Date.now()
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L33-L84)

### Get Expenses
Retrieves all expenses for the user, optionally filtered by month and year.

**Endpoint**: `query expenses.getExpenses`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `month` (number, optional): Month (1-12) to filter by
- `year` (number, optional): Year to filter by

**Response**: Array of expense objects. When month and year are provided, only expenses from that period are returned.

**Usage Example**:
```javascript
// Get all expenses
const allExpenses = await api.expenses.getExpenses({ token: userToken });

// Get expenses for specific month/year
const monthlyExpenses = await api.expenses.getExpenses({
  token: userToken,
  month: 1,
  year: 2024
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L86-L124)

### Get Expenses by Date Range
Retrieves expenses within a specific date range.

**Endpoint**: `query expenses.getExpensesByDateRange`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `startDate` (number): Unix timestamp of start date
- `endDate` (number): Unix timestamp of end date
- `key` (number, optional): Cache busting key

**Response**: Array of expense objects within the specified date range.

**Usage Example**:
```javascript
const expenses = await api.expenses.getExpensesByDateRange({
  token: userToken,
  startDate: startOfWeek,
  endDate: endOfWeek
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L126-L150)

### Update Expense
Modifies an existing expense record.

**Endpoint**: `mutation expenses.updateExpense`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `expenseId` (id): ID of the expense to update
- `amount` (number): New amount
- `title` (string): New title
- `category` (array[string]): New array of categories
- `for` (array[string]): New array of "for" values
- `date` (number): New date (Unix timestamp)
- `cardId` (id, optional): New card ID

**Response**:
```json
{ "success": true }
```

**Usage Example**:
```javascript
await api.expenses.updateExpense({
  token: userToken,
  expenseId: "expense_document_id",
  amount: 55,
  title: "Updated Grocery Shopping"
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L152-L200)

### Get Expense by ID
Retrieves a specific expense record by its ID.

**Endpoint**: `query expenses.getExpenseById`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `expenseId` (id): ID of the expense record

**Response**: The expense document if found and authorized.

**Usage Example**:
```javascript
const expense = await api.expenses.getExpenseById({
  token: userToken,
  expenseId: "expense_document_id"
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L202-L218)

### Get Categories
Retrieves all expense categories for the user.

**Endpoint**: `query expenses.getCategories`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of category objects with their properties.

**Usage Example**:
```javascript
const categories = await api.expenses.getCategories({ token: userToken });
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L220-L234)

### Delete Expense
Removes an expense record from the system.

**Endpoint**: `mutation expenses.deleteExpense`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `expenseId` (id): ID of the expense to delete

**Response**:
```json
{ "success": true }
```

**Usage Example**:
```javascript
await api.expenses.deleteExpense({
  token: userToken,
  expenseId: "expense_document_id"
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L236-L265)

### Create Category
Creates a new expense category if it doesn't already exist.

**Endpoint**: `mutation expenses.createCategory`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `name` (string): Name of the category

**Response**: Returns the ID of the created category or existing category.

**Notes**: Category names are formatted with proper capitalization and trimmed of whitespace.

**Usage Example**:
```javascript
const categoryId = await api.expenses.createCategory({
  token: userToken,
  name: "Entertainment"
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L267-L304)

### Create For Value
Creates a new "for" value if it doesn't already exist.

**Endpoint**: `mutation expenses.createForValue`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `value` (string): "For" value text

**Response**: Returns the ID of the created "for" value or existing one.

**Notes**: "For" values are formatted with proper capitalization and trimmed of whitespace.

**Usage Example**:
```javascript
const forValueId = await api.expenses.createForValue({
  token: userToken,
  value: "Personal"
});
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L306-L343)

### Get For Values
Retrieves all "for" values for the user.

**Endpoint**: `query expenses.getForValues`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: Array of "for" value objects with their properties.

**Usage Example**:
```javascript
const forValues = await api.expenses.getForValues({ token: userToken });
```

**Section sources**
- [expenses.ts](file://convex/expenses.ts#L345-L364)

## User Settings API

The User Settings API manages user preferences and settings.

### Get Settings
Retrieves the user's current settings.

**Endpoint**: `query userSettings.get`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token

**Response**: User settings object or null if not found.

```json
{
  "currency": "USD",
  "calendar": "gregorian",
  "language": "en",
  "updatedAt": 1234567890
}
```

**Usage Example**:
```javascript
const settings = await api.userSettings.get({ token: userToken });
```

**Section sources**
- [userSettings.ts](file://convex/userSettings.ts#L8-L27)

### Update Settings
Updates the user's settings.

**Endpoint**: `mutation userSettings.update`  
**Authentication**: Required (token)  

**Request Parameters**:
- `token` (string): Authentication token
- `currency` (string, optional): Currency code ("USD", "EUR", "GBP", "IRR")
- `calendar` (string, optional): Calendar type ("gregorian", "jalali")
- `language` (string, optional): Language code ("en", "fa")

**Response**: No return value on success.

**Notes**: Only provided fields are updated. Default values are used when settings are first created.

**Usage Example**:
```javascript
await api.userSettings.update({
  token: userToken,
  currency: "EUR",
  language: "en"
});
```

**Section sources**
- [userSettings.ts](file://convex/userSettings.ts#L29-L62)

## Error Codes

The API uses standardized error responses for various failure conditions.

### Common Error Structure
All errors follow this structure:
```json
{
  "message": "Descriptive error message"
}
```

### Authentication Errors
- **Username already exists**: Returned when attempting to register with an existing username.
- **Username not found**: Returned when login username doesn't exist.
- **Incorrect password**: Returned when password doesn't match.
- **Authentication required**: Returned when a token is missing or invalid.
- **Invalid recovery code**: Returned when a recovery code doesn't match any user.

**Section sources**
- [auth.ts](file://convex/auth.ts#L88-L92)
- [auth.ts](file://convex/auth.ts#L125-L127)
- [auth.ts](file://convex/auth.ts#L132-L134)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L17-L20)
- [auth.ts](file://convex/auth.ts#L255-L257)

### Validation Errors
- **Password must be at least 6 characters long**: Returned when resetting password with insufficient length.
- **Category name cannot be empty**: Returned when creating a category with empty name.
- **'For' value cannot be empty**: Returned when creating a "for" value with empty text.

**Section sources**
- [auth.ts](file://convex/auth.ts#L273-L275)
- [expenses.ts](file://convex/expenses.ts#L287-L289)
- [expenses.ts](file://convex/expenses.ts#L323-L325)

### Business Logic Errors
- **Cannot delete card used in expenses**: Prevents deletion of cards with associated expenses.
- **Cannot delete card used in income**: Prevents deletion of cards with associated income.
- **One or both cards not found or not authorized**: Invalid card IDs or cards don't belong to user.
- **Insufficient funds for the transfer**: Source card doesn't have enough balance.
- **Cannot transfer funds to the same card**: Prevents self-transfers.
- **Transfer amount must be positive**: Prevents zero or negative transfers.

**Section sources**
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L90-L92)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L97-L99)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L390-L392)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L405-L407)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L378-L380)
- [cardsAndIncome.ts](file://convex/cardsAndIncome.ts#L383-L385)

## Rate Limiting Policies

The application implements rate limiting and retry policies through its sync mechanism.

### Retry Mechanism
The frontend implements exponential backoff with jitter for failed operations:

- **Base delay**: 1000ms
- **Backoff factor**: 2x increase per retry
- **Maximum retries**: Configurable (default 3)
- **Maximum delay**: Configurable (default 10000ms)
- **Jitter**: 10% random variation to prevent thundering herd

**Retryable Errors**:
- Network errors
- Timeout errors
- Rate limiting (HTTP 429)
- Server errors (HTTP 5xx)

**Non-Retryable Errors**:
- Authentication errors (HTTP 401)
- Authorization errors (HTTP 403)
- Bad request errors (HTTP 400)

**Section sources**
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts#L477-L518)

### Caching Strategy
The application uses client-side caching to reduce server load:

- **Query caching**: Enabled for frequently accessed data
- **Cache TTL**: Configurable based on data type
- **Cache size limit**: Maximum number of cached entries
- **Eviction policy**: Least Recently Used (LRU)

**Section sources**
- [PerformanceOptimizer.ts](file://src/lib/optimization/PerformanceOptimizer.ts#L357-L417)

### Offline Support
The application supports offline-first functionality:

- Operations are queued when offline
- Automatic synchronization when connection is restored
- Conflict detection and resolution
- Local storage of critical data

**Section sources**
- [OfflineFirstProvider.tsx](file://src/providers/OfflineFirstProvider.tsx)
- [CloudSyncManager.ts](file://src/lib/sync/CloudSyncManager.ts)