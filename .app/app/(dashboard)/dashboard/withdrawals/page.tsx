"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    ArrowUpFromLine, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    User, 
    CreditCard,
    MoreHorizontal,
    Search,
    Filter,
    Loader2,
    Check,
    X,
    ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function WithdrawalsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from("withdrawal_requests")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) setRequests(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const { error } = await supabase.rpc('handle_transaction_approval', {
                p_tx_id: id,
                p_new_status: status
            });
            if (error) throw error;
            await fetchRequests();
        } catch (err: any) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return (
        <div className="space-y-4 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Requests...</p>
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
                    <p className="text-sm text-slate-500 font-medium">Verify and process player payout requests.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search user..." 
                            className="h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs font-semibold w-48 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold text-slate-600">
                        <Filter size={14} />
                        Filter
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Player</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Details</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase border border-indigo-100">
                                                {request.username?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 leading-none mb-1">@{request.username || 'unknown'}</div>
                                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">ID: {request.id.substring(0,8).toUpperCase()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-900 mb-1">ETB {request.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        <Badge variant="outline" className={cn(
                                            "px-1.5 py-0 text-[9px] uppercase font-bold tracking-tighter border",
                                            request.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                            request.status === 'approved' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                            "bg-rose-50 text-rose-700 border-rose-100"
                                        )}>
                                            {request.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                request.payment_method === 'telebirr' ? "bg-indigo-500" : "bg-amber-500"
                                            )} />
                                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{request.payment_method}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[11px] font-bold text-slate-900 mb-0.5">{request.account_number || "---"}</div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[140px] leading-tight capitalize">{request.account_name?.toLowerCase() || "unnamed account"}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                            <Clock size={12} className="text-slate-300" />
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(request.created_at).toLocaleTimeString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {request.status === 'pending' ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button 
                                                    size="sm" 
                                                    variant="secondary"
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(request.id, 'rejected')}
                                                    className="h-8 px-3 text-rose-600 hover:bg-rose-50 border border-rose-100 shadow-none text-xs font-bold"
                                                >
                                                    <X size={14} className="mr-1" />
                                                    Decline
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(request.id, 'approved')}
                                                    className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold shadow-sm"
                                                >
                                                    {processingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="mr-1" />}
                                                    Confirm
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600">
                                                <ExternalLink size={14} />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {requests.length === 0 && (
                        <div className="py-24 text-center">
                            <ArrowUpFromLine size={48} className="text-slate-100 mx-auto mb-4" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Payout Requests</h3>
                            <p className="text-xs text-slate-400 mt-1">Player withdrawal queue is currently empty.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
