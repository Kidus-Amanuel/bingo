"use client"

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
    ArrowUpFromLine, 
    Clock, 
    Search,
    Loader2,
    Check,
    X,
    ExternalLink,
    Smartphone,
    RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type ProviderFilter = "all" | "telebirr" | "cbe";

export default function WithdrawalsPage() {
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");

    const fetchWithdrawals = useCallback(async () => {
        const params = new URLSearchParams({ type: 'withdrawal' });
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (providerFilter !== 'all') params.append('provider', providerFilter);

        const res = await fetch(`/api/ledger?${params.toString()}`);
        const json = await res.json();
        setWithdrawals(json.data || []);
        setLoading(false);
    }, [statusFilter, providerFilter]);

    useEffect(() => {
        fetchWithdrawals();

        const channel = supabase
            .channel('withdrawals-realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'transactions_ledger',
                filter: "type=eq.withdrawal"
            }, () => fetchWithdrawals())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [providerFilter]);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const { error } = await supabase.rpc('handle_transaction_approval', {
                p_tx_id: id,
                p_new_status: status
            });
            if (error) throw error;
            await fetchWithdrawals();
        } catch (err: any) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const filtered = withdrawals.filter(w =>
        w.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pending = withdrawals.filter(w => w.status === 'pending');

    if (loading) return (
        <div className="space-y-4 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Withdrawals...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpFromLine size={20} className="text-rose-600" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Withdrawal Requests</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        Verify and process player payout requests from <code className="text-[11px] bg-slate-100 rounded px-1">transactions_ledger</code>.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {pending.length > 0 && (
                        <Badge variant="outline" className="h-9 px-3 gap-2 border-rose-100 bg-rose-50 text-rose-700 font-bold uppercase tracking-widest text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {pending.length} Pending
                        </Badge>
                    )}
                    <Button
                        variant="outline" size="sm"
                        className="h-9 gap-2 font-semibold text-slate-600"
                        onClick={() => fetchWithdrawals()}
                    >
                        <RefreshCw size={14} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Status</span>
                    {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                statusFilter === s
                                    ? s === 'pending' ? "bg-amber-500 text-white"
                                        : s === 'approved' ? "bg-emerald-600 text-white"
                                        : s === 'rejected' ? "bg-rose-600 text-white"
                                        : "bg-indigo-600 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="w-px h-5 bg-slate-200 hidden md:block" />
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Provider</span>
                    {(["all", "telebirr", "cbe"] as ProviderFilter[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setProviderFilter(p)}
                            className={cn(
                                "px-3 h-7 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                providerFilter === p
                                    ? "bg-slate-800 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                        >
                            {p === 'cbe' ? 'CBE Birr' : p}
                        </button>
                    ))}
                </div>
                <div className="relative ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search player..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium w-40 outline-none focus:ring-1 focus:ring-rose-400 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Player</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {filtered.map((w) => (
                                <tr key={w.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700 font-bold text-xs uppercase border border-rose-100">
                                                {w.profiles?.username?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 leading-none mb-1">@{w.profiles?.username || 'unknown'}</div>
                                                <div className="text-[10px] font-mono text-slate-400">#{w.id.substring(0, 8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                            <Smartphone size={12} className="text-slate-300" />
                                            {w.profiles?.phone_number || '—'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={cn(
                                            "px-1.5 py-0 text-[9px] uppercase font-bold tracking-tighter border",
                                            w.payment_method === 'telebirr' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                        )}>
                                            {w.payment_method}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-rose-600">
                                            ETB {Math.abs(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={cn(
                                            "px-1.5 py-0 text-[9px] uppercase font-bold tracking-tighter border",
                                            w.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            w.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                            "bg-rose-50 text-rose-700 border-rose-100"
                                        )}>
                                            {w.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                            <Clock size={11} className="text-slate-300" />
                                            {new Date(w.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400">{new Date(w.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {w.status === 'pending' ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(w.id, 'rejected')}
                                                    className="h-8 px-3 text-rose-600 hover:bg-rose-50 border-rose-100 shadow-none text-xs font-bold"
                                                >
                                                    <X size={13} className="mr-1" />
                                                    Decline
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(w.id, 'approved')}
                                                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold shadow-sm"
                                                >
                                                    {processingId === w.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} className="mr-1" />}
                                                    Confirm
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600">
                                                <ExternalLink size={13} />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-24 text-center">
                            <ArrowUpFromLine size={40} className="text-slate-100 mx-auto mb-4" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Withdrawal Requests</h3>
                            <p className="text-xs text-slate-400 mt-1">Refine your filters or check back later.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
