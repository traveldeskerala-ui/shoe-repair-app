"use client";

import { useEffect, useState } from "react";
import { SupabaseService as MockService } from "@/lib/supabase-service";
import { Order, Complaint, OrderStatus, OrderGroup } from "@/lib/types";
import { NewOrderForm } from "@/components/store/NewOrderForm";
import { KanbanBoard } from "@/components/shared/KanbanBoard";
import { Plus, LayoutTemplate, RefreshCw, LogOut, Settings, Trash2, Layers, MessageCircle, X } from "lucide-react";
import { cn, POINTS_TO_CURRENCY, openWhatsApp } from "@/lib/utils";
import { logout } from "../login/actions";
import { useCurrentStore } from "@/hooks/useCurrentStore";
import { SearchBar } from "@/components/shared/SearchBar";

function ProfitLossView({ orders, onRefresh }: { orders: Order[], onRefresh: () => void }) {
    const [dateFilter, setDateFilter] = useState<'this_month' | 'prev_month' | 'custom'>('this_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Filter completed orders
    const completedOrders = orders.filter(o => o.is_completed);

    // Apply date filtering
    const filteredOrders = completedOrders.filter(order => {
        const orderDate = new Date(order.updated_at);
        const now = new Date();

        if (dateFilter === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return orderDate >= startOfMonth;
        } else if (dateFilter === 'prev_month') {
            const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return orderDate >= startOfPrevMonth && orderDate <= endOfPrevMonth;
        } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59);
            return orderDate >= start && orderDate <= end;
        }
        return true;
    });

    // Calculate totals
    const totalOrders = filteredOrders.length;
    const totalProfit = filteredOrders.reduce((sum, order) => {
        const profit = (order.total_price || 0) - (order.hub_price || 0) - (order.expense || 0);
        return sum + profit;
    }, 0);
    const avgProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-200">Profit & Loss</h2>

            {/* Date Filter Controls */}
            <div className="glass-panel p-4 rounded-2xl space-y-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setDateFilter('this_month')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            dateFilter === 'this_month'
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                        )}
                    >
                        This Month
                    </button>
                    <button
                        onClick={() => setDateFilter('prev_month')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            dateFilter === 'prev_month'
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                        )}
                    >
                        Previous Month
                    </button>
                    <button
                        onClick={() => setDateFilter('custom')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            dateFilter === 'custom'
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                        )}
                    >
                        Custom Range
                    </button>
                </div>

                {/* Custom Date Range Inputs */}
                {dateFilter === 'custom' && (
                    <div className="flex gap-3 items-center">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                        <span className="text-slate-400 text-sm">to</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                    </div>
                )}
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <p className="text-xs text-slate-500 uppercase mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-white">{totalOrders}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <p className="text-xs text-slate-500 uppercase mb-1">Total Profit/Loss</p>
                    <p className={cn(
                        "text-2xl font-bold font-mono",
                        totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                        {POINTS_TO_CURRENCY(totalProfit)}
                    </p>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <p className="text-xs text-slate-500 uppercase mb-1">Average Profit</p>
                    <p className={cn(
                        "text-2xl font-bold font-mono",
                        avgProfit >= 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                        {POINTS_TO_CURRENCY(avgProfit)}
                    </p>
                </div>
            </div>

            {/* Orders List */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <h3 className="text-lg font-bold text-slate-100">Completed Orders</h3>
                    <p className="text-sm text-slate-400">Click an order to view details</p>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 italic">
                        No completed orders in selected period
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5 border-b border-white/10">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Customer</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Shoe Model</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Store Price</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Hub Cost</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Expenses</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-400 uppercase">Profit/Loss</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Completed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredOrders.map(order => {
                                    const profit = (order.total_price || 0) - (order.hub_price || 0) - (order.expense || 0);
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-3 text-sm text-slate-200">{order.customer_name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">{order.shoe_model}</td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-cyan-300">
                                                {POINTS_TO_CURRENCY(order.total_price)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-slate-400">
                                                {POINTS_TO_CURRENCY(order.hub_price || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-mono text-orange-400">
                                                {POINTS_TO_CURRENCY(order.expense || 0)}
                                            </td>
                                            <td className={cn(
                                                "px-4 py-3 text-sm text-right font-mono font-bold",
                                                profit >= 0 ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                {POINTS_TO_CURRENCY(profit)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {new Date(order.updated_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedOrder.customer_name}</h3>
                                <p className="text-sm text-slate-400">Order Details</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">WhatsApp</p>
                                    <p className="text-sm text-white font-mono">{selectedOrder.whatsapp_number}</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">Serial #</p>
                                    <p className="text-sm text-cyan-400 font-mono">{selectedOrder.serial_number || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-black/20 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase">Shoe Model</p>
                                <p className="text-sm text-white">{selectedOrder.shoe_model}</p>
                            </div>

                            <div className="bg-black/20 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase">Service</p>
                                <p className="text-sm text-white">{selectedOrder.custom_complaint || 'Standard Service'}</p>
                            </div>

                            <div className="bg-black/20 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 uppercase mb-2">Profit Breakdown</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Customer Price:</span>
                                        <span className="text-cyan-300 font-mono">{POINTS_TO_CURRENCY(selectedOrder.total_price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Hub Cost:</span>
                                        <span className="text-red-300 font-mono">- {POINTS_TO_CURRENCY(selectedOrder.hub_price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Expenses:</span>
                                        <span className="text-orange-300 font-mono">- {POINTS_TO_CURRENCY(selectedOrder.expense || 0)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-white/10">
                                        <span className="text-white font-semibold">Profit:</span>
                                        <span className={cn(
                                            "font-mono font-bold",
                                            ((selectedOrder.total_price || 0) - (selectedOrder.hub_price || 0) - (selectedOrder.expense || 0)) >= 0
                                                ? "text-emerald-400"
                                                : "text-red-400"
                                        )}>
                                            {POINTS_TO_CURRENCY((selectedOrder.total_price || 0) - (selectedOrder.hub_price || 0) - (selectedOrder.expense || 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.expected_return_date && (
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">Expected Return</p>
                                    <p className="text-sm text-white">{new Date(selectedOrder.expected_return_date).toLocaleDateString()}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => openWhatsApp(selectedOrder.whatsapp_number, `Hi ${selectedOrder.customer_name}, regarding your ${selectedOrder.shoe_model} repair...`)}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <MessageCircle size={16} />
                                WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StorePage() {
    const [view, setView] = useState<'new' | 'kanban' | 'profit_loss' | 'config'>('new');
    const [orders, setOrders] = useState<Order[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const { storeId } = useCurrentStore();
    const [searchQuery, setSearchQuery] = useState("");

    // Complaint Config State
    const [newComplaintDesc, setNewComplaintDesc] = useState("");
    const [newComplaintPrice, setNewComplaintPrice] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (storeId) {
            MockService.getOrders(storeId).then(setOrders);
        }
        MockService.getComplaints().then(setComplaints);
    }, [refreshKey, storeId]);

    // Filter orders based on search query
    const filteredOrders = searchQuery.trim()
        ? orders.filter(order => {
            const query = searchQuery.toLowerCase();
            return (
                order.customer_name?.toLowerCase().includes(query) ||
                order.whatsapp_number?.includes(searchQuery) ||
                order.shoe_model?.toLowerCase().includes(query) ||
                order.serial_number?.toLowerCase().includes(query)
            );
        })
        : orders;

    const handleRefresh = () => setRefreshKey(k => k + 1);

    const handlePriceUpdate = async (orderId: string, newPrice: number) => {
        // Optimistic update - show new price immediately
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, total_price: newPrice, is_price_unknown: false }
                    : order
            )
        );

        // Sync with database in background
        try {
            await MockService.updateOrderPrice(orderId, newPrice);
        } catch (error) {
            // Revert on error and refresh from server
            handleRefresh();
        }
    };

    const handleHubPriceUpdate = async (orderId: string, newPrice: number) => {
        // Optimistic update - show new hub price immediately
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, hub_price: newPrice }
                    : order
            )
        );

        // Sync with database in background
        try {
            await MockService.updateHubPrice(orderId, newPrice);
        } catch (error) {
            // Revert on error and refresh from server
            handleRefresh();
        }
    };

    const handleExpenseUpdate = async (orderId: string, newExpense: number) => {
        // Optimistic update - show new expense immediately
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, expense: newExpense }
                    : order
            )
        );

        // Sync with database in background
        try {
            await MockService.updateExpense(orderId, newExpense);
        } catch (error) {
            // Revert on error and refresh from server
            handleRefresh();
        }
    };

    const handleBalancePayment = async (orderId: string, amount: number, paymentMethod: string) => {
        // Optimistic update - show payment immediately
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, balance_paid: amount, balance_payment_method: paymentMethod }
                    : order
            )
        );

        // Sync with database in background
        try {
            await MockService.updateBalancePayment(orderId, amount, paymentMethod);
        } catch (error) {
            // Revert on error and refresh from server
            handleRefresh();
        }
    };

    const handleAddComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComplaintDesc || !newComplaintPrice) return;
        setIsAdding(true);
        await MockService.addComplaint(newComplaintDesc, Number(newComplaintPrice));
        setNewComplaintDesc("");
        setNewComplaintPrice("");
        setIsAdding(false);
        handleRefresh();
    };

    const onOrderMove = async (orderId: string, newStatus: OrderStatus) => {
        // Optimistic update - move order immediately in UI
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, status: newStatus }
                    : order
            )
        );

        // Sync with database in background
        try {
            await MockService.updateOrderStatus(orderId, newStatus);

            // Check if moving to "In Store" (Final Stage) for WhatsApp notification
            if (newStatus === 'in_store') {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    const message = `Hello ${order.customer_name}, your shoes ${order.shoe_model} (SN: ${order.serial_number}) have arrived at the store and are ready for pickup!`;
                    openWhatsApp(order.whatsapp_number, message);
                }
            }
        } catch (error) {
            // Revert on error and refresh from server
            handleRefresh();
        }
    };

    const handleGroupExpense = async (orderIds: string[], note: string, amount: number) => {
        if (orderIds.length === 0 || amount <= 0) return;

        const perOrderCost = amount / orderIds.length;

        // Parallel updates for Expense field (not customer price)
        await Promise.all(orderIds.map(async (id) => {
            const order = orders.find(o => o.id === id);
            if (!order) return;

            // Add to expense field, not customer price
            const currentExpense = order.expense || 0;
            const newExpense = currentExpense + perOrderCost;

            await MockService.updateExpense(id, newExpense);
        }));

        alert(`Added expense "${note}" (${amount}) distributed to ${orderIds.length} orders.`);
        handleRefresh();
    }

    const handleCreateGroup = async (orderIds: string[]) => {
        const name = prompt("Enter a name for this group (e.g., 'Bulk Order Dec 25'):");
        if (name && orderIds.length > 0) {
            await MockService.createGroup(name, orderIds);
            alert("Group created successfully! View it in the 'Groups' tab.");
            handleRefresh();
        }
    }

    const handleBulkStageChange = async (orderIds: string[], newStatus: OrderStatus) => {
        const success = await MockService.bulkUpdateStatus(orderIds, newStatus);
        if (success) {
            handleRefresh();
        } else {
            alert("Failed to update orders. Please try again.");
        }
    }

    const handleDeleteComplaint = async (id: string) => {
        if (confirm("Are you sure you want to delete this preset?")) {
            await MockService.deleteComplaint(id);
            handleRefresh();
        }
    }


    const handleCompletionToggle = async (orderId: string, isCompleted: boolean) => {
        // Optimistic update - update UI immediately
        setOrders(prevOrders =>
            prevOrders.map(order =>
                order.id === orderId
                    ? { ...order, is_completed: isCompleted }
                    : order
            )
        );

        // Sync with database in background
        try {
            const result = await MockService.updateOrderCompletion(orderId, isCompleted);
            if (!result) {
                // Revert on error
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order.id === orderId
                            ? { ...order, is_completed: !isCompleted }
                            : order
                    )
                );
            }
        } catch (error) {
            // Revert on error
            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId
                        ? { ...order, is_completed: !isCompleted }
                        : order
                )
            );
        }
    }


    return (
        <div className="min-h-screen p-6 md:p-12 space-y-8 relative z-10" suppressHydrationWarning>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" suppressHydrationWarning>
                <div suppressHydrationWarning>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 neon-text">Store Portal</h1>
                    <p className="text-slate-400 mt-1">Manage intake and track repairs</p>
                </div>

                <div className="flex items-center gap-3" suppressHydrationWarning>
                    <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg" suppressHydrationWarning>
                        <button
                            onClick={() => setView('new')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all",
                                view === 'new' ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <Plus size={16} />
                            <span>New Order</span>
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all",
                                view === 'kanban' ? "bg-blue-500/20 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <LayoutTemplate size={16} />
                            <span>My Orders</span>
                        </button>
                        <button
                            onClick={() => setView('profit_loss')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all",
                                view === 'profit_loss' ? "bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <Layers size={16} />
                            <span>Profit & Loss</span>
                        </button>
                        <button
                            onClick={() => setView('config')}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all",
                                view === 'config' ? "bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                            )}
                        >
                            <Settings size={16} />
                            <span>Configuration</span>
                        </button>
                    </div>

                    <form action={logout}>
                        <button className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-xl border border-white/10 text-slate-400 transition-colors shadow-lg backdrop-blur-sm" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Search Bar */}
            {(view === 'kanban' || view === 'profit_loss') && (
                <div className="max-w-2xl mx-auto px-6 mb-4">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by name, phone, model, or serial..."
                        resultsCount={filteredOrders.length}
                        totalCount={orders.length}
                    />
                </div>
            )}

            {/* Content */}
            <div className="relative" suppressHydrationWarning>
                {view === 'new' && (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300" suppressHydrationWarning>
                        <NewOrderForm onSuccess={() => setView('kanban')} storeId={storeId} />
                    </div>
                )}

                {view === 'kanban' && (
                    <div className="h-[calc(100vh-250px)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-4 flex justify-end">
                            <button onClick={handleRefresh} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors backdrop-blur-sm border border-white/10">
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <KanbanBoard
                            orders={filteredOrders}
                            readOnly={false}
                            onOrderMove={onOrderMove}
                            userRole="store"
                            allowPriceEdit={true}
                            onPriceUpdate={handlePriceUpdate}
                            onHubPriceUpdate={handleHubPriceUpdate}
                            onExpenseUpdate={handleExpenseUpdate}
                            onBalancePayment={handleBalancePayment}
                            onGroupExpense={handleGroupExpense}
                            onCreateGroup={handleCreateGroup}
                            onBulkStageChange={handleBulkStageChange}
                            onCompletionToggle={handleCompletionToggle}
                        />
                    </div>
                )}

                {view === 'profit_loss' && (
                    <ProfitLossView orders={filteredOrders} onRefresh={handleRefresh} />
                )}

                {view === 'config' && (
                    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Add New */}
                        <div className="glass-panel p-6 rounded-2xl">
                            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center">
                                <Plus className="mr-2 text-cyan-400" size={20} />
                                Add New Complaint Preset
                            </h2>
                            <form onSubmit={handleAddComplaint} className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Description"
                                    className="flex-1 p-3 rounded-xl border border-white/10 bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                                    value={newComplaintDesc}
                                    onChange={e => setNewComplaintDesc(e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-32 p-3 rounded-xl border border-white/10 bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                                    value={newComplaintPrice}
                                    onChange={e => setNewComplaintPrice(e.target.value)}
                                />
                                <button
                                    disabled={isAdding}
                                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </form>
                        </div>

                        {/* List */}
                        <div className="glass-panel rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h2 className="text-lg font-bold text-slate-100">Existing Presets</h2>
                                <p className="text-sm text-slate-400">Manage standard repair types and base prices.</p>
                            </div>
                            <div className="divide-y divide-white/5">
                                {complaints.map(c => (
                                    <div key={c.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors group">
                                        <div>
                                            <p className="font-medium text-slate-200">{c.description}</p>
                                            <p className="text-sm text-slate-500 font-mono text-cyan-400">{POINTS_TO_CURRENCY(c.default_price)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteComplaint(c.id)}
                                            className="p-2 text-slate-500 group-hover:text-red-400 group-hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Delete Preset"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                                {complaints.length === 0 && (
                                    <div className="p-8 text-center text-slate-500 italic">
                                        No presets found. Add one above.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
