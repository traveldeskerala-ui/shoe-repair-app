import { createClient } from '@supabase/supabase-js';
import { Store } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

const ADMIN_PASSWORD = 'Admin@6282';

export const StoreService = {
    /**
     * Verify admin password for store creation
     */
    verifyAdminPassword: (password: string): boolean => {
        return password === ADMIN_PASSWORD;
    },

    /**
     * Create a new store
     */
    createStore: async (name: string, password: string): Promise<Store | null> => {
        if (!supabase) return null;

        try {
            // Simple password hashing (in production, use bcrypt on backend)
            const password_hash = btoa(password); // Base64 encoding (NOT secure for production)

            const { data, error } = await supabase
                .from('stores')
                .insert({
                    name,
                    password_hash
                } as any)
                .select()
                .single();

            if (error) {
                console.error('Error creating store:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error creating store:', error);
            return null;
        }
    },

    /**
     * Authenticate store by password
     * Returns store if password matches
     */
    authenticateStore: async (password: string): Promise<Store | null> => {
        if (!supabase) return null;

        try {
            // Get all stores
            const { data: stores, error } = await supabase
                .from('stores')
                .select('*') as any;

            if (error || !stores) {
                console.error('Error fetching stores:', error);
                return null;
            }

            // Check password against all stores
            const password_hash = btoa(password);
            const matchingStore = stores.find((store: any) => store.password_hash === password_hash);

            return matchingStore || null;
        } catch (error) {
            console.error('Error authenticating store:', error);
            return null;
        }
    },

    /**
     * Get all stores
     */
    getAllStores: async (): Promise<Store[]> => {
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching stores:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error fetching stores:', error);
            return [];
        }
    },

    /**
     * Get store by ID
     */
    getStoreById: async (id: string): Promise<Store | null> => {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('stores')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching store:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error fetching store:', error);
            return null;
        }
    },

    /**
     * Update store name
     */
    updateStoreName: async (id: string, newName: string): Promise<Store | null> => {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('stores')
                .update({
                    name: newName,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating store:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error updating store:', error);
            return null;
        }
    },

    /**
     * Delete store (only if no orders exist)
     */
    deleteStore: async (id: string): Promise<boolean> => {
        if (!supabase) return false;

        try {
            // Check if store has orders
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('id')
                .eq('store_id', id)
                .limit(1);

            if (ordersError) {
                console.error('Error checking orders:', ordersError);
                return false;
            }

            if (orders && orders.length > 0) {
                console.error('Cannot delete store with existing orders');
                return false;
            }

            // Delete store
            const { error } = await supabase
                .from('stores')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting store:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error deleting store:', error);
            return false;
        }
    },

    /**
     * Get order count for a store
     */
    getStoreOrderCount: async (storeId: string): Promise<number> => {
        if (!supabase) return 0;

        try {
            const { count, error } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId);

            if (error) {
                console.error('Error counting orders:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            console.error('Error counting orders:', error);
            return 0;
        }
    }
};
