"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
import { cn } from "@/lib/utils";

type TabType = "pending" | "all";

export default function DepositVerificationPage() {
    const [deposits, setDeposits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("pending");
    const [refreshing, setRefreshing] = useState(false);

    const fetchDeposits = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        const query = supabase
            .from("transactions_ledger")
            .select("*, profiles(username, phone_number, telegram_id)")
            .eq('type', 'deposit')
            .order("created_at", { ascending: false });

        const { data, error } = await query;

        if (!error) setDeposits(data || []);
        setLoading(false);
        if (showRefresh) setRefreshing(false);
    };

    useEffect(() => {
        fetchDeposits();

        const channel = supabase
            .channel('deposits-realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'transactions_ledger',
                filter: "type=eq.deposit"
            }, () => fetchDeposits())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

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

    const pending = deposits.filter(d => d.status === 'pending');
    const displayed = activeTab === 'pending' ? pending : deposits;

    if (loading) return (
        <div className="space-y-4 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading deposit queue...</p>
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
                        SMS-forwarded deposits are auto-processed. Bot submissions await manual approval.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {pending.length > 0 && (
                        <Badge variant="outline" className="h-9 px-3 gap-2 border-amber-100 bg-amber-50 text-amber-700 font-bold uppercase tracking-widest text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {pending.length} Needs Approval
                        </Badge>
                    )}
                    <Button 
                        variant="outline" size="sm" 
                        className="h-9 gap-2 font-semibold text-slate-600"
                        onClick={() => fetchDeposits(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* How it Works Banner */}
            <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        <Zap size={14} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-800 mb-0.5">Automatic via SMS Forwarder</p>
                        <p className="text-[11px] text-indigo-600 leading-relaxed">
                            Your SMS forwarder app receives Telebirr/CBE payment notifications and auto-approves matching pending deposits instantly.
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
                            Players paste their payment SMS into the bot. The deposit lands here as "pending" for you to verify and confirm.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={cn(
                        "px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'pending'
                            ? "text-amber-600 border-b-2 border-amber-500"
                            : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Clock size={12} />
                    Pending Approval
                    {pending.length > 0 && (
                        <span className="bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 leading-none">
                            {pending.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                        "px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'all'
                            ? "text-indigo-600 border-b-2 border-indigo-600"
                            : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    All Deposits
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 leading-none">
                        {deposits.length}
                    </span>
                </button>
            </div>

            {/* Deposit Cards */}
            <div className="grid grid-cols-1 gap-4">
                {displayed.map((deposit) => {
                    const isAutoApproved = deposit.status !== 'pending';
                    const isPending = deposit.status === 'pending';

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
                                isPending ? "border-amber-500" : deposit.status === 'approved' ? "border-emerald-500" : "border-rose-500"
                            )}>
                                <div className="flex flex-col lg:flex-row">
                                    {/* Left: Player & Amount */}
                                    <div className="p-5 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/30">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-sm shadow-sm">
                                                    {deposit.profiles?.username?.[0]?.toUpperCase() || 'P'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">@{deposit.profiles?.username || 'unknown'}</div>
                                                    <div className="text-[10px] font-mono text-slate-400">#{deposit.id.substring(0,8)}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className={cn(
                                                    "text-[9px] uppercase font-bold px-2 py-0 h-5",
                                                    deposit.payment_method === 'telebirr' ? "bg-indigo-600" : "bg-amber-600"
                                                )}>
                                                    {deposit.payment_method}
                                                </Badge>
                                                {/* Source Tag */}
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] uppercase font-bold px-1.5 py-0 h-4",
                                                    isAutoApproved ? "border-emerald-100 text-emerald-600 bg-emerald-50" : "border-amber-100 text-amber-600 bg-amber-50"
                                                )}>
                                                    {isAutoApproved ? <><Zap size={8} className="mr-0.5 inline" />Auto</> : <><Hand size={8} className="mr-0.5 inline" />Manual</>}
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

                                    {/* Middle: Context */}
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
                                                <p className="text-[11px] text-slate-500 leading-relaxed italic line-clamp-2">
                                                    "{deposit.metadata.raw_message}"
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock size={10} />
                                            {new Date(deposit.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Right: Action or Status */}
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
                                                        : <Check size={13} />
                                                    }
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
                                                        : <X size={20} className="text-rose-500" />
                                                    }
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

                {displayed.length === 0 && (
                    <div className="py-28 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={28} className="text-slate-200" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            {activeTab === 'pending' ? 'No Pending Deposits' : 'No Deposits Yet'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {activeTab === 'pending'
                                ? 'All deposits have been processed. Great work!'
                                : 'Deposits will appear here once players top up.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
