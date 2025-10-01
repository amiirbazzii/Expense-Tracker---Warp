/**
 * Example demonstrating the OfflineQueueManager integration
 */

import React, { useState, useEffect } from 'react';
import { useEnhancedOfflineQueue } from '../hooks/useOfflineQueue';
import { OfflineQueueStatus } from '../components/OfflineQueueStatus';

export const OfflineQueueExample: React.FC = () => {
  const [expenseData, setExpenseData] = useState({
    amount: 100,
    title: 'Test Expense',
    category: ['food'],
    for: ['personal'],
    date: Date.now(),
    cardId: 'card-1'
  });

  const queueManager = useEnhancedOfflineQueue();

  const handleCreateExpense = async () => {
    try {
      const operationId = await queueManager.addExpenseOperation(
        'create',
        `expense-${Date.now()}`,
        expenseData
      );
      
      console.log('Added expense operation to queue:', operationId);
      
      // Update the expense data for next operation
      setExpenseData(prev => ({
        ...prev,
        amount: prev.amount + 10,
        title: `Test Expense ${Date.now()}`
      }));
    } catch (error) {
      console.error('Failed to add expense operation:', error);
    }
  };

  const handleUpdateExpense = async () => {
    try {
      const operationId = await queueManager.addExpenseOperation(
        'update',
        'expense-existing',
        { ...expenseData, amount: expenseData.amount + 50 }
      );
      
      console.log('Added expense update operation to queue:', operationId);
    } catch (error) {
      console.error('Failed to add expense update operation:', error);
    }
  };

  const handleDeleteExpense = async () => {
    try {
      const operationId = await queueManager.addExpenseOperation(
        'delete',
        'expense-to-delete',
        {}
      );
      
      console.log('Added expense delete operation to queue:', operationId);
    } catch (error) {
      console.error('Failed to add expense delete operation:', error);
    }
  };

  const handleCreateIncome = async () => {
    try {
      const operationId = await queueManager.addIncomeOperation(
        'create',
        `income-${Date.now()}`,
        {
          amount: 500,
          cardId: 'card-1',
          date: Date.now(),
          source: 'Salary',
          category: 'work',
          notes: 'Monthly salary'
        }
      );
      
      console.log('Added income operation to queue:', operationId);
    } catch (error) {
      console.error('Failed to add income operation:', error);
    }
  };

  const handleCreateCard = async () => {
    try {
      const operationId = await queueManager.addCardOperation(
        'create',
        `card-${Date.now()}`,
        {
          name: `Test Card ${Date.now()}`
        }
      );
      
      console.log('Added card operation to queue:', operationId);
    } catch (error) {
      console.error('Failed to add card operation:', error);
    }
  };

  const handleBulkOperations = async () => {
    try {
      // Add multiple operations to demonstrate batching
      const operations = [];
      
      for (let i = 0; i < 15; i++) {
        operations.push(
          queueManager.addExpenseOperation(
            'create',
            `bulk-expense-${i}`,
            {
              amount: 10 + i,
              title: `Bulk Expense ${i}`,
              category: ['bulk'],
              for: ['test'],
              date: Date.now() + i,
              cardId: 'card-1'
            }
          )
        );
      }
      
      const operationIds = await Promise.all(operations);
      console.log('Added bulk operations to queue:', operationIds.length);
    } catch (error) {
      console.error('Failed to add bulk operations:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Offline Queue Manager Example</h1>
      
      {/* Queue Status Display */}
      <div className="mb-8">
        <OfflineQueueStatus 
          showDetails={true}
          showControls={true}
          className="mb-4"
        />
      </div>

      {/* Operation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Expense Operations</h3>
          <div className="space-y-2">
            <button
              onClick={handleCreateExpense}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Expense
            </button>
            <button
              onClick={handleUpdateExpense}
              className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Update Expense
            </button>
            <button
              onClick={handleDeleteExpense}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Expense
            </button>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Other Operations</h3>
          <div className="space-y-2">
            <button
              onClick={handleCreateIncome}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create Income
            </button>
            <button
              onClick={handleCreateCard}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Create Card
            </button>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-3">Bulk Operations</h3>
          <div className="space-y-2">
            <button
              onClick={handleBulkOperations}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Add 15 Bulk Operations
            </button>
          </div>
        </div>
      </div>

      {/* Current Expense Data Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Current Expense Data</h3>
        <pre className="text-sm text-gray-700">
          {JSON.stringify(expenseData, null, 2)}
        </pre>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">How to Use</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Click the operation buttons to add items to the offline queue</li>
          <li>• Operations are automatically deduplicated and prioritized</li>
          <li>• Use "Process Queue" to manually trigger sync operations</li>
          <li>• Failed operations can be retried using "Retry Failed"</li>
          <li>• The queue persists across browser sessions</li>
          <li>• Bulk operations demonstrate batching and priority ordering</li>
        </ul>
      </div>
    </div>
  );
};

export default OfflineQueueExample;