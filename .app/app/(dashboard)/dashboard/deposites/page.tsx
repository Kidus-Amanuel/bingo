"use client"

import { useEffect, useState, useCallback } from "react";
import { 
    ArrowDownToLine, 
    CheckCircle2, 
    Clock, 
    Loader2,
    Check,
    X,
    MessageSquare,
    AlertCircle,
    Smartphone,
    Zap,
    Hand,
    RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type ProviderFilter = "all" | "telebirr" | "cbe";

export default function DepositVerificationPage() {
    const [deposits, setDeposits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
    const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");

    const fetchDeposits = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        const params = new URLSearchParams({ type: 'deposit' });
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (providerFilter !== 'all') params.append('provider', providerFilter);

        const res = await fetch(`/api/ledger?${params.toString()}`);
        const json = await res.json();
        setDeposits(json.data || []);
        setLoading(false);
        if (showRefresh) setRefreshing(false);
    }, [statusFilter, providerFilter]);

    useEffect(() => {
        fetchDeposits();
    }, [fetchDeposits]);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const { error } = await supabase.rpc('handle_transaction_approval', {
                p_tx_id: id,
                p_new_status: status
            });
            if (error) throw error;
            await fetchDeposits();
        } catch (err: any) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return (
        <div className="space-y-4 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading deposits...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownToLine size={20} className="text-indigo-600" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deposits</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        SMS-forwarded deposits auto-confirm. Bot submissions need manual approval.
                    </p>
                </div>
                <Button
                    variant="outline" size="sm"
                    className="h-9 gap-2 font-semibold text-slate-600 self-start"
                    onClick={() => fetchDeposits(true)}
                    disabled={refreshing}
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </Button>
            </div>

            {/* Info Banners */}
            <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        <Zap size={14} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-800 mb-0.5">Automatic via SMS Forwarder</p>
                        <p className="text-[11px] text-indigo-600 leading-relaxed">
                            Your SMS forwarder receives Telebirr/CBE notifications and auto-approves matching deposits instantly.
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
                        <Hand size={14} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-800 mb-0.5">Manual via Telegram Bot</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Players paste SMS into the bot. Lands here as "pending" — verify the balance and approve manually.
                        </p>
                    </div>
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
                <span className="ml-auto text-[10px] text-slate-400 font-bold">{deposits.length} results</span>
            </div>

            {/* Deposit Cards */}
            <div className="grid grid-cols-1 gap-4">
                {deposits.map((deposit) => {
                    const isPending = deposit.status === 'pending';
                    const isAuto = deposit.status !== 'pending';

                    return (
                        <Card
                            key={deposit.id}
                            className={cn(
                                "border shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden bg-white",
                                isPending ? "border-amber-200" : "border-slate-200"
                            )}
                        >
                            <div className={cn(
                                "border-l-4",
                                isPending ? "border-amber-500"
                                    : deposit.status === 'approved' ? "border-emerald-500"
                                    : "border-rose-500"
                            )}>
                                <div className="flex flex-col lg:flex-row">
                                    {/* Player & Amount */}
                                    <div className="p-5 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm">
                                                    {deposit.profiles?.username?.[0]?.toUpperCase() || 'P'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">@{deposit.profiles?.username || 'unknown'}</div>
                                                    <div className="text-[10px] font-mono text-slate-400">#{deposit.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className={cn(
                                                    "text-[9px] uppercase font-bold px-2 py-0 h-5",
                                                    deposit.payment_method === 'telebirr' ? "bg-indigo-600" : "bg-amber-600"
                                                )}>
                                                    {deposit.payment_method || '—'}
                                                </Badge>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] uppercase font-bold px-1.5 py-0 h-4",
                                                    isAuto ? "border-emerald-100 text-emerald-600 bg-emerald-50" : "border-amber-100 text-amber-600 bg-amber-50"
                                                )}>
                                                    {isAuto ? <><Zap size={8} className="mr-0.5 inline" />Auto</> : <><Hand size={8} className="mr-0.5 inline" />Manual</>}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount</div>
                                            <div className="text-2xl font-black text-slate-900 leading-none">
                                                <span className="text-xs font-normal text-slate-400 mr-1">ETB</span>
                                                {Number(deposit.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Context */}
                                    <div className="p-5 lg:flex-1 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                    <Smartphone size={9} />
                                                    Phone
                                                </div>
                                                <div className="text-xs font-bold text-slate-700">{deposit.profiles?.phone_number || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                    <AlertCircle size={9} />
                                                    Reference ID
                                                </div>
                                                <div className="text-xs font-mono font-bold text-indigo-600 truncate">{deposit.reference_id || '—'}</div>
                                            </div>
                                        </div>

                                        {deposit.metadata?.raw_message && (
                                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex gap-2.5">
                                                <MessageSquare size={14} className="text-slate-300 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                                    "{deposit.metadata.raw_message}"
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock size={10} />
                                            {new Date(deposit.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-5 lg:w-44 flex lg:flex-col items-center justify-center gap-2.5 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-100">
                                        {isPending ? (
                                            <>
                                                <Button
                                                    onClick={() => handleAction(deposit.id, 'approved')}
                                                    disabled={!!processingId}
                                                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs gap-1.5 shadow-sm"
                                                >
                                                    {processingId === deposit.id
                                                        ? <Loader2 size={13} className="animate-spin" />
                                                        : <Check size={13} />}
                                                    Approve
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleAction(deposit.id, 'rejected')}
                                                    disabled={!!processingId}
                                                    className="w-full h-10 border-slate-200 text-rose-600 hover:bg-rose-50 font-bold text-xs gap-1.5"
                                                >
                                                    <X size={13} />
                                                    Decline
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2",
                                                    deposit.status === 'approved' ? "bg-emerald-50" : "bg-rose-50"
                                                )}>
                                                    {deposit.status === 'approved'
                                                        ? <CheckCircle2 size={20} className="text-emerald-500" />
                                                        : <X size={20} className="text-rose-500" />}
                                                </div>
                                                <div className={cn(
                                                    "text-[10px] font-bold uppercase tracking-widest",
                                                    deposit.status === 'approved' ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {deposit.status}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}

                {deposits.length === 0 && (
                    <div className="py-28 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={28} className="text-slate-200" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            No deposits found
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your status or provider filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
