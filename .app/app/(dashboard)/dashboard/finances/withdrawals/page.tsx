"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Wallet, 
    ArrowUpFromLine, 
    Calendar,
    Search,
    Filter,
    Loader2,
    CheckCircle2,
    Shapes,
    BarChart3,
    ArrowUpRight,
    Users,
    Download,
    History
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function WithdrawalsLedgerPage() {
    const [finance, setFinance] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [providerFilter, setProviderFilter] = useState<string>("all");

    const fetchData = async () => {
        const { data: fin } = await supabase
            .from("company_finances")
            .select("*")
            .single();

        let query = supabase
            .from("transactions_ledger")
            .select("*, profiles(username)")
            .eq('type', 'withdrawal')
            .order("created_at", { ascending: false });

        if (providerFilter !== "all") {
            query = query.eq('payment_method', providerFilter.toLowerCase());
        }

        const { data: txns } = await query;

        setFinance(fin);
        setWithdrawals(txns || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [providerFilter]);

    const filteredWithdrawals = withdrawals.filter(d => 
        (d.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         d.id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return (
        <div className="space-y-6 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Withdrawal Ledger...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Context Navigation */}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <Link href="/dashboard/finances" className="hover:text-indigo-600 transition-colors">Finances</Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900">Withdrawals</span>
            </div>

            {/* Sub Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <Link 
                    href="/dashboard/finances" 
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                >
                    Overview
                </Link>
                <Link 
                    href="/dashboard/finances/deposits" 
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                >
                    Deposits
                </Link>
                <Link 
                    href="/dashboard/finances/withdrawals" 
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-600 border-b-2 border-indigo-600 transition-all"
                >
                    Withdrawals
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpFromLine size={20} className="text-rose-600" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Withdrawal Ledger</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Audit payout history and system liquidity outflows.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold text-slate-600">
                        <Download size={14} />
                        Export Ledger
                    </Button>
                </div>
            </div>

            {/* Consolidated Summary Card */}
            <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                    <div className="p-6 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Shapes size={12} className="text-indigo-600" />
                            Telebirr Balance
                        </div>
                        <p className="text-xl font-bold text-slate-900">
                            <span className="text-xs font-normal text-slate-400 mr-1.5">ETB</span>
                            {finance?.tele_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-6 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <BarChart3 size={12} className="text-amber-600" />
                            CBE Birr Balance
                        </div>
                        <p className="text-xl font-bold text-slate-900">
                            <span className="text-xs font-normal text-slate-400 mr-1.5">ETB</span>
                            {finance?.cbe_balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-6 space-y-2 bg-indigo-50/30">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                            <TrendingUp size={12} />
                            Telebirr Profit
                        </div>
                        <p className="text-xl font-bold text-indigo-700">
                            <span className="text-xs font-normal opacity-50 mr-1">ETB</span>
                            {finance?.tele_profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="p-6 space-y-2 bg-amber-50/30">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                            <TrendingUp size={12} />
                            CBE Profit
                        </div>
                        <p className="text-xl font-bold text-amber-700">
                            <span className="text-xs font-normal opacity-50 mr-1">ETB</span>
                            {finance?.cbe_profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filter by player or TXID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-sm font-medium w-full outline-none focus:ring-1 focus:ring-rose-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={providerFilter}
                        onChange={(e) => setProviderFilter(e.target.value)}
                        className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-wider outline-none focus:ring-1 focus:ring-rose-500 shadow-sm"
                    >
                        <option value="all">All Providers</option>
                        <option value="telebirr">Telebirr</option>
                        <option value="cbe birr">CBE Birr</option>
                    </select>
                    <Button variant="outline" className="h-10 gap-2 font-semibold shadow-sm">
                        <Calendar size={14} />
                        Date
                    </Button>
                </div>
            </div>

            {/* Withdrawals Table */}
            <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execution ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipient</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endpoint</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Settled At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {filteredWithdrawals.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span className="text-[10px] font-mono font-bold text-slate-900 uppercase">#{tx.id.substring(0,10)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-600">@{tx.profiles?.username || 'system'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={cn(
                                            "px-1.5 py-0 text-[9px] uppercase font-bold tracking-tighter border",
                                            tx.payment_method === 'telebirr' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-amber-50 text-amber-700 border-amber-100"
                                        )}>
                                            {tx.payment_method}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-rose-600">
                                            - ETB {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                        <div className="text-[9px] font-medium text-slate-300 uppercase tracking-tighter mt-1">{new Date(tx.created_at).toLocaleDateString()}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredWithdrawals.length === 0 && (
                        <div className="py-24 text-center">
                            <History size={48} className="text-slate-100 mx-auto mb-4" />
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Withdrawals Logged</h3>
                            <p className="text-xs text-slate-400 mt-1">Review your filters or search criteria.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
