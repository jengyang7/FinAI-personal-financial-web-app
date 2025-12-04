import { supabase } from './supabase';

/**
 * Month-End Savings Transfer Utilities
 * 
 * These functions handle the automatic/manual transfer of monthly net balance
 * (total_income - total_expenses) to a "Saving" asset (Cash type).
 */

export interface MonthEndSavingsLog {
    id: string;
    user_id: string;
    month: string;
    total_income: number;
    total_expenses: number;
    net_balance: number;
    currency: string;
    saving_asset_id: string;
    saving_asset_previous_amount: number;
    saving_asset_new_amount: number;
    transferred_at: string;
    created_at: string;
}

export interface TransferResult {
    success: boolean;
    month?: string;
    total_income?: number;
    total_expenses?: number;
    net_balance?: number;
    currency?: string;
    saving_asset_id?: string;
    previous_amount?: number;
    new_amount?: number;
    error?: string;
    existing_transfer_id?: string;
}

/**
 * Manually trigger month-end savings transfer for a specific month
 * Note: This will only work if running on the server side or with service role key
 * For client-side, use the Edge Function endpoint
 * 
 * @param targetMonth - The month to process (as Date or YYYY-MM-DD string)
 * @returns Transfer result
 */
export async function triggerMonthEndSavingsTransfer(
    targetMonth?: Date | string
): Promise<TransferResult> {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        // Calculate target month (default to previous month)
        let monthDate: Date;
        if (targetMonth) {
            monthDate = typeof targetMonth === 'string'
                ? new Date(targetMonth)
                : targetMonth;
        } else {
            const now = new Date();
            monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }

        const monthString = monthDate.toISOString().split('T')[0];

        // Call the RPC function
        const { data, error } = await supabase.rpc('transfer_month_end_savings', {
            target_user_id: user.id,
            target_month: monthString
        });

        if (error) {
            console.error('Error transferring month-end savings:', error);
            return { success: false, error: error.message };
        }

        return data as TransferResult;
    } catch (error) {
        console.error('Error in triggerMonthEndSavingsTransfer:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get month-end savings transfer history for the current user
 * 
 * @param limit - Maximum number of records to return (default: 12)
 * @returns Array of transfer logs
 */
export async function getMonthEndSavingsHistory(
    limit: number = 12
): Promise<MonthEndSavingsLog[]> {
    try {
        const { data, error } = await supabase
            .from('month_end_savings_log')
            .select('*')
            .order('month', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching month-end savings history:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getMonthEndSavingsHistory:', error);
        return [];
    }
}

/**
 * Check if a month-end transfer has already been made for a specific month
 * 
 * @param month - The month to check (as Date or YYYY-MM-DD string)
 * @returns Boolean indicating if transfer exists
 */
export async function hasMonthEndTransfer(
    month: Date | string
): Promise<boolean> {
    try {
        const monthDate = typeof month === 'string' ? new Date(month) : month;
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthString = monthStart.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('month_end_savings_log')
            .select('id')
            .eq('month', monthString)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking month-end transfer:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Error in hasMonthEndTransfer:', error);
        return false;
    }
}

/**
 * Get months that don't have transfers yet
 * Useful for showing which months can still be processed
 * 
 * @param monthsBack - How many months to check (default: 6)
 * @returns Array of month strings (YYYY-MM) without transfers
 */
export async function getMissingTransferMonths(
    monthsBack: number = 6
): Promise<string[]> {
    try {
        const now = new Date();
        const months: string[] = [];

        // Generate list of past months (excluding current month)
        for (let i = 1; i <= monthsBack; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(monthDate.toISOString().split('T')[0]);
        }

        // Get existing transfers
        const { data, error } = await supabase
            .from('month_end_savings_log')
            .select('month')
            .in('month', months);

        if (error) {
            console.error('Error fetching existing transfers:', error);
            return months;
        }

        const existingMonths = new Set(data?.map(t => t.month) || []);

        return months.filter(m => !existingMonths.has(m));
    } catch (error) {
        console.error('Error in getMissingTransferMonths:', error);
        return [];
    }
}

/**
 * Delete a month-end savings transfer log entry
 * This allows users to re-run transfers for testing purposes
 * 
 * @param logId - The ID of the log entry to delete
 * @returns Object with success status and optional error message
 */
export async function deleteMonthEndSavingsLog(
    logId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('month_end_savings_log')
            .delete()
            .eq('id', logId);

        if (error) {
            console.error('Error deleting month-end savings log:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in deleteMonthEndSavingsLog:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
