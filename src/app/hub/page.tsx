"use client";

import { useEffect, useState } from "react";
import { SupabaseService as MockService } from "@/lib/supabase-service";
import { Order, OrderStatus, Store } from "@/lib/types";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { PriceUpdateModal } from "@/components/hub/PriceUpdateModal";
import { RefreshCw, Layers, LogOut, Store as StoreIcon } from "lucide-react";
import { openWhatsApp } from "@/lib/utils";
import { logout } from "../login/actions";
import { StoreService } from "@/lib/store-service";
import { SearchBar } from "@/components/shared/SearchBar";

export default function HubPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        MockService.getOrders().then(setOrders);
        StoreService.getAllStores().then(setStores);
    }, [refreshKey]);

    // Filter orders by selected store and exclude in-house orders
    const storeFilteredOrders = (selectedStoreId === 'all'
        ? orders
        : orders.filter(o => o.store_id === selectedStoreId)
    ).filter(o => !o.is_in_house); // Exclude in-house orders from hub view

    // Apply search filter
    const filteredOrders = searchQuery.trim()
        ? storeFilteredOrders.filter(order => {
            const query = searchQuery.toLowerCase();
            return (
                order.customer_name?.toLowerCase().includes(query) ||
                order.whatsapp_number?.includes(searchQuery) ||
                order.shoe_model?.toLowerCase().includes(query) ||
                order.serial_number?.toLowerCase().includes(query)
            );
        })
        : storeFilteredOrders;

    const handleRefresh = () => setRefreshKey(k => k + 1);

    const onOrderMove = async (orderId: string, newStatus: OrderStatus) => {
        await MockService.updateOrderStatus(orderId, newStatus);

        // Check if moving to "In Store" (Final Stage)
        if (newStatus === 'in_store') {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const message = `Hello ${order.customer_name}, your shoes ${order.shoe_model} (SN: ${order.serial_number}) have arrived at the store and are ready for pickup!`;
                openWhatsApp(order.whatsapp_number, message);
            }
        }

        handleRefresh();
    };

    const handlePriceUpdate = async (orderId: string, newPrice: number) => {
        const result = await MockService.updateHubPrice(orderId, newPrice);
        if (result) {
            handleRefresh();
        } else {
            console.error('Failed to update hub price');
            alert('Failed to update price. Please try again.');
        }
    }

    const handleGroupExpense = async (orderIds: string[], note: string, amount: number) => {
        if (orderIds.length === 0 || amount <= 0) return;

        const perOrderCost = amount / orderIds.length;

        // Parallel updates
        // Note: In a real app, this should be a bulk DB transaction or RPC call.
        // Here we'll just loop.
        await Promise.all(orderIds.map(async (id) => {
            const order = orders.find(o => o.id === id);
            if (!order) return;

            // "Don't contrast" -> Append to existing.
            // Assumption: Adding to Hub Price (Cost).
            const currentPrice = order.hub_price || 0;
            const newPrice = currentPrice + perOrderCost;

            await MockService.updateHubPrice(id, newPrice);
        }));

        alert(`Added expense "${note}" (${amount}) distributed to ${orderIds.length} orders.`);
        handleRefresh();
    }

    const handleBulkStageChange = async (orderIds: string[], newStatus: OrderStatus) => {
        const success = await MockService.bulkUpdateStatus(orderIds, newStatus);
        if (success) {
            handleRefresh();
        } else {
            alert("Failed to update orders. Please try again.");
        }
    }

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden relative z-10">
            {/* Header */}
            <header className="glass-panel border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-lg z-20">
                <div className="flex items-center space-x-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 neon-text">Central Hub</h1>
                        <p className="text-xs text-slate-400">Workflow Management</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button onClick={handleRefresh} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors" title="Refresh">
                        <RefreshCw size={20} />
                    </button>
                    <form action={logout}>
                        <button className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-400 transition-colors" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </form>
                </div>
            </header>

            {/* Store Selector */}
            <div className="px-6 pt-4 pb-2">
                <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-300">
                        <StoreIcon size={18} className="text-purple-400" />
                        <label className="text-sm font-medium">View Store:</label>
                    </div>
                    <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer"
                    >
                        <option value="all">All Stores</option>
                        {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                    <div className="text-sm text-slate-400">
                        Showing {filteredOrders.length} of {orders.length} orders
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pb-2">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by name, phone, model, or serial..."
                    resultsCount={filteredOrders.length}
                    totalCount={storeFilteredOrders.length}
                />
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-hidden px-6 pb-2">
                <KanbanBoard
                    orders={filteredOrders}
                    onOrderMove={onOrderMove}
                    onCardClick={setSelectedOrder}
                    allowPriceEdit={true}
                    onPriceUpdate={handlePriceUpdate}
                    onGroupExpense={handleGroupExpense}
                    onBulkStageChange={handleBulkStageChange}
                    userRole="hub"
                    showStoreBadge={selectedStoreId === 'all'}
                />
            </div>

            {selectedOrder && (
                <PriceUpdateModal
                    isOpen={!!selectedOrder}
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdate={handleRefresh}
                />
            )}
        </div>
    );
}
