'use client';

import { useState, useEffect } from 'react';
import { Plus, ShoppingCart, Car, Home, Gamepad2, Utensils, User, HelpCircle, Trash2 } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { CATEGORY_OPTIONS } from '@/constants/categories';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getCurrencyFormatter } from '@/lib/currency';
import { convertCurrency } from '@/lib/currencyConversion';
import MonthSelector from '@/components/MonthSelector';
import { useMonth } from '@/context/MonthContext';

const getBudgetIcon = (iconType: string) => {
  const lowerType = iconType.toLowerCase();

  if (lowerType.includes('food') || lowerType.includes('dining')) {
    return Utensils;
  } else if (lowerType.includes('groceries')) {
    return ShoppingCart;
  } else if (lowerType.includes('transport')) {
    return Car;
  } else if (lowerType.includes('entertainment')) {
    return Gamepad2;
  } else if (lowerType.includes('shopping')) {
    return ShoppingCart;
  } else if (lowerType.includes('utilities')) {
    return Home;
  } else if (lowerType.includes('healthcare') || lowerType.includes('health')) {
    return User;
  } else if (lowerType.includes('housing') || lowerType.includes('rent')) {
    return Home;
  } else if (lowerType.includes('personal')) {
    return User;
  } else {
    return HelpCircle;
  }
};

const getProgressBarColor = (percentage: number) => {
  // Red if exceeded, blue otherwise
  if (percentage > 100) {
    return 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.35)]';
  }
  return 'bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-hover)] shadow-[0_0_12px_rgba(59,130,246,0.35)]';
};

const normalizeCurrencyCode = (code?: string) => {
  if (!code) return 'USD';
  const upper = code.toUpperCase();
  if (upper === 'RM') return 'MYR';
  return upper;
};

export default function Budget() {
  const { budgets, expenses, reloadBudgets } = useFinance();
  const { user } = useAuth();
  const { selectedMonth, setSelectedMonth } = useMonth();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ id: string; category: string; allocated_amount: number; currency?: string } | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    allocated_amount: '',
    currency: 'USD'
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [userSettings, setUserSettings] = useState<{ currency?: string;[key: string]: unknown } | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    budgetId: string;
    category: string;
    allocatedAmount: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    // Use master category list instead of deriving from expenses
    setAvailableCategories(CATEGORY_OPTIONS);
    if (!newBudget.category && CATEGORY_OPTIONS.length > 0) {
      setNewBudget(prev => ({ ...prev, category: CATEGORY_OPTIONS[0] }));
    }
  }, [newBudget.category]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        const normalizedCurrency = normalizeCurrencyCode(data.currency);
        const normalizedSettings = { ...data, currency: normalizedCurrency };
        setUserSettings(normalizedSettings);
        setNewBudget(prev => ({ ...prev, currency: normalizedCurrency || 'USD' }));
      }
    };
    loadSettings();
  }, [user]);

  const profileCurrency = normalizeCurrencyCode(userSettings?.currency);
  const formatBy = (code?: string) => getCurrencyFormatter(code || profileCurrency);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBudget.category && newBudget.allocated_amount && user) {
      try {
        const { error } = await supabase
          .from('budgets')
          .insert({
            user_id: user.id,
            name: newBudget.category,
            category: newBudget.category,
            allocated_amount: parseFloat(newBudget.allocated_amount),
            currency: newBudget.currency || userSettings?.currency || 'USD'
          });

        if (error) throw error;

        setNewBudget({
          category: availableCategories[0] || '',
          allocated_amount: '',
          currency: userSettings?.currency || 'USD'
        });
        setShowAddBudget(false);
        await reloadBudgets();
      } catch (error) {
        console.error('Error adding budget:', error);
        alert('Failed to add budget');
      }
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget || !user) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          name: editingBudget.category,
          category: editingBudget.category,
          allocated_amount: editingBudget.allocated_amount,
          currency: editingBudget.currency || userSettings?.currency || 'USD'
        })
        .eq('id', editingBudget.id);

      if (error) throw error;

      setEditingBudget(null);
      await reloadBudgets();
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget');
    }
  };

  const showDeleteConfirm = (budget: { id: string; category: string; allocated_amount: number; currency?: string }) => {
    setDeleteConfirmModal({
      show: true,
      budgetId: budget.id,
      category: budget.category,
      allocatedAmount: budget.allocated_amount,
      currency: normalizeCurrencyCode(budget.currency)
    });
  };

  const confirmDeleteBudget = async () => {
    if (!deleteConfirmModal) return;
    const budgetId = deleteConfirmModal.budgetId;
    setDeleteConfirmModal(null);
    setDeletingBudget(budgetId);
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
      await reloadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    } finally {
      setDeletingBudget(null);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex animate-slide-in-up flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="pl-16 lg:pl-0">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Budgets</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">Manage your spending with personalized budgets.</p>
        </div>
        <MonthSelector
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          showAllOption
        />
      </div>

      {/* Add Button Row */}
      <div className="mb-6 md:mb-8 flex justify-end animate-slide-in-up">
        <button
          onClick={() => setShowAddBudget(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </button>
      </div>


      <div className="space-y-4">
        {budgets.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-[var(--text-secondary)]">No budgets set yet. Add a budget to start tracking your spending!</p>
          </div>
        ) : (
          budgets.map((budget, index) => {
            const IconComponent = getBudgetIcon(budget.category.toLowerCase());
            const budgetCurrency = normalizeCurrencyCode(budget.currency);

            // Filter expenses for the selected month and this category
            // AND convert all expenses to the budget's currency
            const monthSpent = expenses
              .filter((e) => {
                const d = new Date(e.date);
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                return ym === selectedMonth && e.category === budget.category;
              })
              .reduce((sum, e) => {
                // Convert expense amount to budget currency
                const expenseCurrency = normalizeCurrencyCode(e.currency);
                const convertedAmount = convertCurrency(e.amount, expenseCurrency, budgetCurrency);
                return sum + convertedAmount;
              }, 0);

            const percentage = budget.allocated_amount > 0 ? Math.round((monthSpent / budget.allocated_amount) * 100) : 0;
            const remaining = budget.allocated_amount - monthSpent;

            return (
              <div
                key={budget.id}
                onClick={() => setEditingBudget(budget)}
                className="glass-card rounded-2xl p-6 hover:bg-[var(--card-hover)] hover:scale-102 transition-all duration-300 cursor-pointer animate-scale-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center flex-1">
                    <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                      <IconComponent className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{budget.category}</h3>
                      <p className={`text-sm ${remaining < 0 ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>
                        {remaining < 0 ? `Overspent: ${formatBy(budgetCurrency)(Math.abs(remaining))}` : `Remaining: ${formatBy(budgetCurrency)(remaining)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{percentage}%</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showDeleteConfirm(budget);
                        }}
                        disabled={deletingBudget === budget.id}
                        className="p-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete budget"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-[var(--text-secondary)] mb-2">
                    <span>{formatBy(budgetCurrency)(monthSpent)} spent</span>
                    <span>{formatBy(budgetCurrency)(budget.allocated_amount)} budget</span>
                  </div>
                  <div className="w-full bg-[var(--card-border)]/60 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal?.show && (
        <div
          className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setDeleteConfirmModal(null)}
        >
          <div className="solid-modal rounded-2xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Delete Budget</h3>
            </div>

            <p className="text-[var(--text-secondary)] mb-3">
              Are you sure you want to delete this budget?
            </p>

            {/* Budget Card Preview */}
            <div className="glass-card rounded-xl p-4 mb-6 border border-[var(--card-border)]">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[var(--text-primary)] font-medium truncate">{deleteConfirmModal.category}</h4>
                  <p className="text-[var(--text-tertiary)] text-sm">
                    Budget: {formatBy(deleteConfirmModal.currency)(deleteConfirmModal.allocatedAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 bg-[var(--card-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold border border-[var(--card-border)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBudget}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div
          className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddBudget(false)}
        >
          <div
            className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Add New Budget</h3>

            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Category (from your expenses)
                </label>
                {availableCategories.length > 0 ? (
                  <select
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">No expense categories available. Add some expenses first!</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Monthly Budget
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={newBudget.allocated_amount}
                    onChange={(e) => setNewBudget({ ...newBudget, allocated_amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full glass-card border border-[var(--card-border)] rounded-lg pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={newBudget.currency || 'USD'}
                  onChange={(e) => setNewBudget({ ...newBudget, currency: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddBudget(false)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Add Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div
          className="fixed inset-0 modal-overlay animate-fade-in flex items-center justify-center z-50 p-4"
          onClick={() => setEditingBudget(null)}
        >
          <div
            className="solid-modal rounded-2xl p-6 w-full max-w-md animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Edit Budget</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category</label>
                <input
                  type="text"
                  value={editingBudget.category}
                  disabled
                  className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-secondary)] cursor-not-allowed"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Category cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Monthly Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[var(--text-secondary)]">$</span>
                  <input
                    type="number"
                    value={editingBudget.allocated_amount}
                    onChange={(e) => setEditingBudget({ ...editingBudget, allocated_amount: parseFloat(e.target.value) })}
                    step="0.01"
                    className="w-full glass-card border border-[var(--card-border)] rounded-lg pl-14 pr-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Currency</label>
                <select
                  value={normalizeCurrencyCode(editingBudget?.currency) || userSettings?.currency || 'USD'}
                  onChange={(e) => setEditingBudget({ ...editingBudget, currency: e.target.value })}
                  className="w-full glass-card border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setEditingBudget(null)}
                  className="flex-1 glass-card hover:bg-[var(--card-hover)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all duration-300 font-medium liquid-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateBudget}
                  className="flex-1 bg-[var(--accent-primary)] hover:opacity-90 text-white py-2.5 px-4 rounded-xl transition-all duration-300 font-semibold shadow-lg liquid-button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
