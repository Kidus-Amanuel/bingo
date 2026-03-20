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
    BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

    if (loading) return <div className="h-96 flex items-center justify-center animate-pulse"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    const providers = [
        { 
            name: "Telebirr", 
            balance: finance?.tele_balance, 
            profit: finance?.tele_profit, 
            color: "text-blue-600", 
            bg: "bg-blue-50",
            icon: Shapes
        },
        { 
            name: "CBE Birr", 
            balance: finance?.cbe_balance, 
            profit: finance?.cbe_profit, 
            color: "text-purple-600", 
            bg: "bg-purple-50",
            icon: BarChart3
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Financial Hub</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Wallet className="w-3 h-3 text-primary-500" />
                        Audit liquidity and track revenue per provider
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {providers.map((p) => (
                    <Card key={p.name} className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white hover:shadow-xl transition-all duration-500">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <div className={cn("p-4 rounded-2xl shadow-lg shadow-black/5", p.bg, p.color)}>
                                    <p.icon size={28} />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1 block">Provider Status</span>
                                    <Badge className="bg-green-50 text-green-600 border-green-100 uppercase text-[9px] font-black tracking-widest">Connected</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            <div className="flex justify-between items-end border-b border-slate-50 pb-8">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">{p.name}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Primary Liquidity Pool</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Current Balance</span>
                                    <div className="text-3xl font-black text-slate-900 leading-none">ETB {p.balance?.toFixed(2)}</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 pt-2">
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-between h-32">
                                    <TrendingUp size={20} className={cn(p.color)} />
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-2">Total Profit</span>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums leading-none italic tracking-tight">ETB {p.profit?.toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col justify-between h-32">
                                    <History size={20} className="text-slate-400" />
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-2">Margin</span>
                                        <div className="text-2xl font-black text-slate-900 tabular-nums leading-none tracking-tight">10.0%</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button className="flex-1 h-12 rounded-2xl bg-primary-950 font-black text-xs uppercase shadow-xl shadow-primary-950/20">Manual Deposit</Button>
                                <Button variant="outline" className="flex-1 h-12 rounded-2xl border-slate-100 font-black text-xs uppercase bg-white">Audit Trail</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Cashflow Table */}
            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                        <History size={20} className="text-primary-500" />
                        Recent Cashflow
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Process</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {history.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-xl flex items-center justify-center",
                                                    tx.type === 'deposit' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                                )}>
                                                    {tx.type === 'deposit' ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none block mb-1">{tx.payment_method}</span>
                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{tx.type}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                <span className="text-xs font-bold text-slate-500">{tx.profiles?.username || 'System'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={cn(
                                                "text-sm font-black italic tracking-tighter leading-none",
                                                tx.type === 'deposit' ? "text-green-600" : "text-red-500"
                                            )}>
                                                {tx.type === 'deposit' ? '+' : '-'} ETB {tx.amount}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter mt-1">{new Date(tx.created_at).toLocaleDateString()}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

