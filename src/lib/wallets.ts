import { supabase } from './supabase';

/**
 * Wallet Management Utilities
 */

export interface Wallet {
    id: string;
    user_id: string;
    name: string;
    type: string;
    currency: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface WalletAdjustment {
    id: string;
    wallet_id: string;
    previous_balance: number;
    adjustment: number;
    new_balance: number;
    description?: string;
    created_at: string;
}

export interface WalletWithBalance extends Wallet {
    balance: number;
    adjustments_total: number;
}

/**
 * Ensure a default wallet exists for the user
 * Creates one if it doesn't exist
 */
export async function ensureDefaultWallet(
    userId: string,
    currency: string = 'USD'
): Promise<Wallet | null> {
    try {
        // Check if default wallet exists
        const { data: existing, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', true)
            .single();

        if (existing) {
            return existing as Wallet;
        }

        // Create default wallet if not exists (ignore PGRST116 "no rows returned" error)
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking default wallet:', fetchError);
            return null;
        }

        const { data: newWallet, error: insertError } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                name: 'Default Wallet',
                type: 'Cash',
                currency: currency,
                is_default: true
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating default wallet:', insertError);
            return null;
        }

        return newWallet as Wallet;
    } catch (error) {
        console.error('Error in ensureDefaultWallet:', error);
        return null;
    }
}

/**
 * Get all wallets for a user
 */
export async function getWallets(userId: string): Promise<Wallet[]> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching wallets:', error);
            return [];
        }

        return (data || []) as Wallet[];
    } catch (error) {
        console.error('Error in getWallets:', error);
        return [];
    }
}

/**
 * Calculate wallet balance
 * Balance = sum of adjustments + income - expenses for this wallet
 * All amounts are converted to the wallet's currency
 */
export async function calculateWalletBalance(
    walletId: string,
    profileCurrency: string = 'USD'
): Promise<{ balance: number; adjustmentsTotal: number }> {
    try {
        // First get the wallet to know its currency
        const { data: wallet } = await supabase
            .from('wallets')
            .select('currency')
            .eq('id', walletId)
            .single();

        const walletCurrency = wallet?.currency || profileCurrency;

        // Import currency conversion
        const { convertCurrency } = await import('./currencyConversion');

        // Get sum of adjustments (already in wallet currency)
        const { data: adjustments } = await supabase
            .from('wallet_adjustments')
            .select('adjustment')
            .eq('wallet_id', walletId);

        const adjustmentsTotal = (adjustments || []).reduce(
            (sum, adj) => sum + (adj.adjustment || 0),
            0
        );

        // Get income for this wallet and convert to wallet currency
        const { data: income } = await supabase
            .from('income')
            .select('amount, currency')
            .eq('wallet_id', walletId);

        const incomeTotal = (income || []).reduce((sum, inc) => {
            const incomeCurrency = inc.currency || 'USD';
            const convertedAmount = convertCurrency(inc.amount || 0, incomeCurrency, walletCurrency);
            return sum + convertedAmount;
        }, 0);

        // Get expenses for this wallet and convert to wallet currency
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, currency')
            .eq('wallet_id', walletId);

        const expensesTotal = (expenses || []).reduce((sum, exp) => {
            const expenseCurrency = exp.currency || 'USD';
            const convertedAmount = convertCurrency(exp.amount || 0, expenseCurrency, walletCurrency);
            return sum + convertedAmount;
        }, 0);

        const balance = adjustmentsTotal + incomeTotal - expensesTotal;

        return { balance, adjustmentsTotal };
    } catch (error) {
        console.error('Error calculating wallet balance:', error);
        return { balance: 0, adjustmentsTotal: 0 };
    }
}

/**
 * Add a balance adjustment to a wallet
 */
export async function addBalanceAdjustment(
    walletId: string,
    adjustment: number,
    description?: string
): Promise<WalletAdjustment | null> {
    try {
        // Get current balance to record previous
        const { balance } = await calculateWalletBalance(walletId);
        const previousBalance = balance;
        const newBalance = previousBalance + adjustment;

        const { data, error } = await supabase
            .from('wallet_adjustments')
            .insert({
                wallet_id: walletId,
                previous_balance: previousBalance,
                adjustment: adjustment,
                new_balance: newBalance,
                description: description || 'Manual adjustment'
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding balance adjustment:', error);
            return null;
        }

        return data as WalletAdjustment;
    } catch (error) {
        console.error('Error in addBalanceAdjustment:', error);
        return null;
    }
}

/**
 * Get balance adjustment history for a wallet
 */
export async function getWalletAdjustments(
    walletId: string
): Promise<WalletAdjustment[]> {
    try {
        const { data, error } = await supabase
            .from('wallet_adjustments')
            .select('*')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching wallet adjustments:', error);
            return [];
        }

        return (data || []) as WalletAdjustment[];
    } catch (error) {
        console.error('Error in getWalletAdjustments:', error);
        return [];
    }
}

/**
 * Update a balance adjustment
 */
export async function updateWalletAdjustment(
    adjustmentId: string,
    adjustment: number,
    description?: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('wallet_adjustments')
            .update({
                adjustment,
                description
            })
            .eq('id', adjustmentId);

        if (error) {
            console.error('Error updating wallet adjustment:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in updateWalletAdjustment:', error);
        return false;
    }
}

/**
 * Delete a balance adjustment
 */
export async function deleteWalletAdjustment(
    adjustmentId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('wallet_adjustments')
            .delete()
            .eq('id', adjustmentId);

        if (error) {
            console.error('Error deleting wallet adjustment:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteWalletAdjustment:', error);
        return false;
    }
}

/**
 * Create a new wallet
 */
export async function createWallet(
    userId: string,
    name: string,
    type: string = 'Cash',
    currency: string = 'USD'
): Promise<Wallet | null> {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .insert({
                user_id: userId,
                name,
                type,
                currency,
                is_default: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating wallet:', error);
            return null;
        }

        return data as Wallet;
    } catch (error) {
        console.error('Error in createWallet:', error);
        return null;
    }
}

/**
 * Update a wallet (only name allowed for default wallet)
 */
export async function updateWallet(
    walletId: string,
    updates: Partial<Pick<Wallet, 'name' | 'type' | 'currency'>>
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('wallets')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', walletId);

        if (error) {
            console.error('Error updating wallet:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in updateWallet:', error);
        return false;
    }
}

/**
 * Delete a wallet (not allowed for default wallet)
 */
export async function deleteWallet(walletId: string): Promise<boolean> {
    try {
        // Check if it's default wallet
        const { data: wallet } = await supabase
            .from('wallets')
            .select('is_default')
            .eq('id', walletId)
            .single();

        if (wallet?.is_default) {
            console.error('Cannot delete default wallet');
            return false;
        }

        const { error } = await supabase
            .from('wallets')
            .delete()
            .eq('id', walletId);

        if (error) {
            console.error('Error deleting wallet:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in deleteWallet:', error);
        return false;
    }
}
