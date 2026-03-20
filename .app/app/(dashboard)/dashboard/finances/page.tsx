"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Wallet, 
    TrendingUp, 
    ArrowUpFromLine, 
    ArrowDownToLine, 
    History,
    CreditCard,
    DollarSign,
    Loader2,
    Shapes,
    BarChart3,
    ArrowRight,
    Search,
    Filter,
    Activity,
    CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function FinancesPage() {
    const [finance, setFinance] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const { data: fin } = await supabase
            .from("company_finances")
            .select("*")
            .single();

        const { data: txns } = await supabase
            .from("transactions_ledger")
            .select("*, profiles(username)")
            .in('type', ['deposit', 'withdrawal'])
            .order("created_at", { ascending: false })
            .limit(10);

        setFinance(fin);
        setHistory(txns || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('finance_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'company_finances' }, (payload) => {
                setFinance(payload.new);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return (
        <div className="space-y-6 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Auditing Ledgers...</p>
        </div>
    );

    const providers = [
        { 
            name: "Telebirr", 
            balance: finance?.tele_balance, 
            profit: finance?.tele_profit, 
            color: "text-indigo-600", 
            bg: "bg-indigo-50",
            icon: Shapes,
            status: "Connected"
        },
        { 
            name: "CBE Birr", 
            balance: finance?.cbe_balance, 
            profit: finance?.cbe_profit, 
            color: "text-amber-600", 
            bg: "bg-amber-50",
            icon: BarChart3,
            status: "Connected"
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Sub Navigation */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                <Link 
                    href="/dashboard/finances" 
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-indigo-600 border-b-2 border-indigo-600 transition-all"
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
                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
                >
                    Withdrawals
                </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Wallet size={20} className="text-indigo-600" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Hub</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Liquidity monitoring and revenue audit trail.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold text-slate-600">
                        <History size={14} />
                        Full Ledger
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-9 font-semibold shadow-sm">
                        Manual Entry
                    </Button>
                </div>
            </div>

            {/* Providers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {providers.map((p) => (
                    <Card key={p.name} className="border-slate-200 shadow-none rounded-xl overflow-hidden flex flex-col group hover:border-indigo-300 transition-all">
                        <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", p.bg, p.color)}>
                                    <p.icon size={18} />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{p.status}</CardDescription>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-indigo-600">
                                <ArrowRight size={16} />
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Liquidity</span>
                                    <p className="text-2xl font-bold text-slate-900 leading-none">
                                        <span className="text-sm font-normal text-slate-400 mr-1.5">ETB</span>
                                        {p.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-right space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">YTD Profit</span>
                                    <p className={cn("text-lg font-bold leading-none italic", p.color)}>
                                        <span className="text-xs font-normal opacity-50 mr-1">ETB</span>
                                        {p.profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee Margin</p>
                                    <p className="text-sm font-bold text-slate-900">10.00%</p>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Score</p>
                                    <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                        <Activity size={12} />
                                        Stable
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Transaction Table */}
            <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden">
                <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100">
                    <div>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <CreditCard size={16} className="text-indigo-500" />
                            Recent Ledger Activity
                        </CardTitle>
                        <CardDescription className="text-xs">Latest deposits and withdrawals across all methods</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {history.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={cn(
                                            "capitalize text-[10px] font-bold tracking-tighter px-2",
                                            tx.type === 'deposit' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                        )}>
                                            {tx.type}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                            <span className="text-xs font-bold text-slate-900 uppercase">{tx.payment_method}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-semibold text-slate-500 truncate max-w-[120px] block">@{tx.profiles?.username || 'System'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "text-xs font-bold font-mono",
                                            tx.type === 'deposit' ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {tx.type === 'deposit' ? '+' : '-'} ETB {tx.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                        <div className="text-[9px] font-medium text-slate-300 uppercase tracking-tighter">{new Date(tx.created_at).toLocaleDateString()}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
