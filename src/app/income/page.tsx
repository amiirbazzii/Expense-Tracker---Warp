"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BottomNav } from "@/components/BottomNav";
import { HeaderRow } from "@/components/HeaderRow";
import { ArrowLeft, TrendingUp, CreditCard, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function IncomePage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const income = useQuery(api.cardsAndIncome.getIncome, token ? { token } : "skip");
  const cards = useQuery(api.cardsAndIncome.getMyCards, token ? { token } : "skip");

  // Create a map of card IDs to card names for quick lookup
  const cardMap = cards?.reduce((acc, card) => {
    acc[card._id] = card.name;
    return acc;
  }, {} as Record<string, string>) || {};

  const sortedIncome = income?.sort((a, b) => b.date - a.date) || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <HeaderRow
          left={
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft size={20} />
              </motion.button>
              <h1 className="text-xl font-bold text-gray-900">Income History</h1>
            </>
          }
        />
        
        <div className="max-w-md mx-auto p-4 pt-24 pb-20">
          {income === undefined ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : sortedIncome.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No income records found</p>
              <p className="text-sm text-gray-400 mt-2">
                Add income from the Expenses & Income page
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedIncome.map((incomeRecord) => (
                <motion.div
                  key={incomeRecord._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {incomeRecord.source}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <CreditCard className="w-4 h-4 mr-1" />
                        <span>{cardMap[incomeRecord.cardId] || "Unknown Card"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        +${incomeRecord.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{format(new Date(incomeRecord.date), "MMM d, yyyy")}</span>
                    </div>
                    <div className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {incomeRecord.category}
                    </div>
                  </div>
                  
                  {incomeRecord.notes && (
                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Notes:</strong> {incomeRecord.notes}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
