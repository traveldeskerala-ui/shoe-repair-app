import { supabase } from './supabase';
import { Complaint, Order, OrderStatus, OrderGroup, GroupExpense } from './types';

export const SupabaseService = {
    getComplaints: async (): Promise<Complaint[]> => {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('complaints')
            .select('*')
            .order('description');

        if (error) {
            console.error('Error fetching complaints:', JSON.stringify(error, null, 2));
            return [];
        }

        return data || [];
    },

    getOrders: async (storeId?: string): Promise<Order[]> => {
        if (!supabase) return [];

        // Fetch orders and their related complaints and store
        let query = supabase
            .from('orders')
            .select(`
        *,
        store:stores(name),
        complaints:order_complaints(
          complaint:complaints(*)
        )
      `);

        // Filter by store if storeId is provided AND is a valid UUID
        // UUID format: 8-4-4-4-12 hex characters
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (storeId && uuidRegex.test(storeId)) {
            query = query.eq('store_id', storeId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
            console.error('Full error details:', JSON.stringify(error, null, 2));
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error details:', error.details);
            return [];
        }

        return data.map((item: any) => ({
            ...item,
            store_name: item.store?.name,
            complaints: item?.complaints?.map((c: any) => c.complaint) || []
        }));
    },

    createOrder: async (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>): Promise<Order | null> => {
        if (!supabase) return null;

        // Validate store_id is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (order.store_id && !uuidRegex.test(order.store_id)) {
            console.error('Invalid store_id format:', order.store_id);
            throw new Error('Invalid store ID. Please log in again.');
        }

        // 1. Insert Order
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_name: order.customer_name,
                whatsapp_number: order.whatsapp_number,
                shoe_model: order.shoe_model,
                serial_number: order.serial_number,
                custom_complaint: order.custom_complaint,
                is_price_unknown: order.is_price_unknown,
                total_price: order.total_price,
                status: order.status,
                expected_return_date: order.expected_return_date,
                store_id: order.store_id,
                advance_amount: order.advance_amount || 0,
                payment_method: order.payment_method || null,
                is_in_house: order.is_in_house || false
            })
            .select()
            .single();

        if (orderError || !orderData) {
            console.error('Error creating order:', orderError);
            console.error('Full error details:', JSON.stringify(orderError, null, 2));
            if (orderError && orderError.code === '23505') { // Unique violation
                throw new Error("Duplicate Serial Number. Please refresh and try again.");
            }
            if (orderError && orderError.message) {
                throw new Error(orderError.message);
            }
            return null;
        }

        // 2. Insert Order Complaints Relations if any
        if (order.complaints && order.complaints.length > 0) {
            const links = order.complaints.map(c => ({
                order_id: orderData.id,
                complaint_id: c.id
            }));

            const { error: linkError } = await supabase
                .from('order_complaints')
                .insert(links);

            if (linkError) {
                console.error('Error linking complaints:', linkError);
            }
        }

        return { ...orderData, complaints: order.complaints || [] };
    },

    getNextSerialNumber: async (): Promise<string> => {
        if (!supabase) return "LW01";

        const { data, error } = await supabase
            .from('orders')
            .select('serial_number')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error("Error fetching last serial number:", error);
            return "LW01";
        }

        if (!data || data.length === 0 || !data[0].serial_number) {
            return "LW01";
        }

        const lastSerial = data[0].serial_number;
        // Extract numeric part (assuming format LWxx)
        const match = lastSerial.match(/LW(\d+)/i);

        if (match && match[1]) {
            const currentNum = parseInt(match[1], 10);
            const nextNum = currentNum + 1;
            // Pad with leading zero if less than 10
            return `LW${nextNum.toString().padStart(2, '0')}`;
        }

        // Fallback if format is unexpected, but maybe try to parse any number
        return "LW01";
    },

    updateOrderStatus: async (id: string, status: OrderStatus): Promise<Order | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating status:', JSON.stringify(error, null, 2));
            return null;
        }

        // WhatsApp notification would be sent here for in_store status

        return data;
    },

    updateOrderPrice: async (id: string, price: number): Promise<Order | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('orders')
            .update({
                total_price: price,
                is_price_unknown: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating price:', error);
            return null;
        }

        // WhatsApp notification would be sent here
        return data;
    },

    updateHubPrice: async (id: string, price: number): Promise<Order | null> => {
        if (!supabase) {
            console.error('Supabase not initialized');
            return null;
        }

        const { data, error } = await supabase
            .from('orders')
            .update({
                hub_price: price,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating hub price:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return null;
        }

        return data;
    },

    updateExpense: async (id: string, expense: number): Promise<Order | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('orders')
            .update({
                expense: expense,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating expense:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return null;
        }

        return data;
    },

    updateBalancePayment: async (id: string, balancePaid: number, paymentMethod: string): Promise<Order | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('orders')
            .update({
                balance_paid: balancePaid,
                balance_payment_method: paymentMethod,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating balance payment:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return null;
        }

        return data;
    },

    addComplaint: async (description: string, default_price: number): Promise<Complaint | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('complaints')
            .insert({ description, default_price })
            .select()
            .single();

        if (error) {
            console.error("Error adding complaint:", error);
            return null;
        }
        return data;
    },

    deleteComplaint: async (id: string): Promise<boolean> => {
        if (!supabase) return false;

        const { error } = await supabase
            .from('complaints')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting complaint:", error);
            return false;
        }
        return true;
    },

    // Group Service Methods
    createGroup: async (name: string, orderIds: string[]): Promise<OrderGroup | null> => {
        if (!supabase) return null;

        // 1. Create Group
        const { data: group, error: groupError } = await supabase
            .from('order_groups')
            .insert({ name })
            .select()
            .single();

        if (groupError || !group) {
            console.error('Error creating group:', JSON.stringify(groupError, null, 2));
            return null;
        }

        // 2. Link Orders
        if (orderIds.length > 0) {
            const { error: linkError } = await supabase
                .from('orders')
                .update({ group_id: group.id })
                .in('id', orderIds);

            if (linkError) {
                console.error('Error linking orders to group:', JSON.stringify(linkError, null, 2));
            }
        }

        return group;
    },

    getGroups: async (): Promise<OrderGroup[]> => {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('order_groups')
            .select(`
                *,
                orders (*),
                expenses:group_expenses (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching groups:', JSON.stringify(error, null, 2));
            return [];
        }

        return data as OrderGroup[];
    },

    addGroupExpense: async (groupId: string, description: string, amount: number): Promise<void> => {
        if (!supabase) return;

        // 1. Add Expense Record
        const { error: expError } = await supabase
            .from('group_expenses')
            .insert({ group_id: groupId, description, amount });

        if (expError) {
            console.error('Error adding group expense:', JSON.stringify(expError, null, 2));
            return;
        }

        // 2. Distribute cost to orders
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('group_id', groupId);

        if (ordersError || !orders || orders.length === 0) return;

        const perOrderCost = amount / orders.length;

        await Promise.all(orders.map(async (order) => {
            if (!supabase) return;
            const currentExpense = order.expense || 0;
            const newExpense = currentExpense + perOrderCost;

            await supabase
                .from('orders')
                .update({ expense: newExpense })
                .eq('id', order.id);
        }));
    },

    bulkUpdateStatus: async (orderIds: string[], status: OrderStatus): Promise<boolean> => {
        if (!supabase || orderIds.length === 0) return false;

        const { error } = await supabase
            .from('orders')
            .update({ status, updated_at: new Date().toISOString() })
            .in('id', orderIds);

        if (error) {
            console.error('Error bulk updating status:', error);
            return false;
        }
        return true;
    },

    updateOrderCompletion: async (id: string, isCompleted: boolean): Promise<Order | null> => {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('orders')
            .update({
                is_completed: isCompleted,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating order completion:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                fullError: JSON.stringify(error, null, 2)
            });

            // Check if it's a missing column error
            if (error.message && error.message.includes('is_completed')) {
                console.error('⚠️ MISSING COLUMN: The is_completed column does not exist in the orders table.');
                console.error('📝 ACTION REQUIRED: Run the migration file: migration_add_is_completed.sql');
            }

            return null;
        }

        return data;
    },



    deleteGroup: async (groupId: string): Promise<boolean> => {
        if (!supabase) return false;

        // 1. Unlink orders (set group_id to null)
        const { error: unlinkError } = await supabase
            .from('orders')
            .update({ group_id: null })
            .eq('group_id', groupId);

        if (unlinkError) {
            console.error('Error unlinking orders:', unlinkError);
            return false;
        }

        // 2. Delete expenses (manually to ensure cleanup if no cascade)
        const { error: expError } = await supabase
            .from('group_expenses')
            .delete()
            .eq('group_id', groupId);

        if (expError) {
            console.error('Error deleting group expenses:', expError);
            return false;
        }

        // 3. Delete group
        const { error } = await supabase
            .from('order_groups')
            .delete()
            .eq('id', groupId);

        if (error) {
            console.error('Error deleting group:', error);
            return false;
        }

        return true;
    }
};
