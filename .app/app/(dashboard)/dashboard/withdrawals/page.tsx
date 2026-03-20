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
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            
            // Refresh list
            await fetchRequests();
        } catch (err: any) {
            alert(err.message || "Failed to process withdrawal");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center animate-pulse"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Withdrawals</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <ArrowUpFromLine className="w-3 h-3 text-red-500" />
                        Manage pending payout requests from players
                    </p>
                </div>
                <div className="flex gap-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search By Username..." 
                        className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold w-64 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Player</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Details</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {requests.map((request) => (
                                <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs uppercase border border-slate-200">
                                                {request.username?.[0] || <User size={16} />}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900 leading-none">{request.username}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: {request.id.substring(0,8)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-sm font-black text-slate-900 leading-none">ETB {request.amount}</div>
                                        <Badge variant="outline" className={cn(
                                            "mt-1.5 text-[8px] font-black uppercase tracking-widest h-5",
                                            request.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            request.status === 'approved' ? "bg-green-50 text-green-600 border-green-100" :
                                            "bg-red-50 text-red-600 border-red-100"
                                        )}>
                                            {request.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                request.payment_method === 'telebirr' ? "bg-blue-500" : "bg-purple-500"
                                            )} />
                                            <span className="text-xs font-black text-slate-700 uppercase">{request.payment_method}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <CreditCard size={14} className="flex-shrink-0" />
                                            <div>
                                                <div className="text-[11px] font-black text-slate-800 leading-none mb-1">{request.account_number || "XXXXXXXXXX"}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{request.account_name || "Account Holder Name"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(request.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {request.status === 'pending' ? (
                                            <div className="flex gap-2 justify-center">
                                                <Button 
                                                    size="sm" 
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(request.id, 'approved')}
                                                    className="h-9 px-4 rounded-xl bg-primary-950 hover:bg-black font-black text-[10px] uppercase shadow-lg shadow-primary-950/20"
                                                >
                                                    {processingId === request.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                    Approve
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    disabled={!!processingId}
                                                    onClick={() => handleAction(request.id, 'rejected')}
                                                    className="h-9 px-4 rounded-xl border-slate-200 text-red-500 hover:text-red-600 font-black text-[10px] uppercase bg-white"
                                                >
                                                    <XCircle className="w-3 h-3 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center opacity-40 grayscale pointer-events-none scale-90">
                                                <Button size="icon" variant="ghost" className="rounded-xl"><MoreHorizontal size={16} /></Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {requests.length === 0 && (
                        <div className="p-12 text-center">
                            <ArrowUpFromLine className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                            <h3 className="text-lg font-black text-slate-300 uppercase">No Withdrawal Requests Found</h3>
                            <p className="text-xs font-bold text-slate-400 mt-2">All payout requests have been processed.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
