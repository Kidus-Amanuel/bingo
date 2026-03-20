"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    TrendingUp, 
    Users, 
    Gamepad2, 
    ArrowUpRight, 
    DollarSign,
    Zap,
    Clock,
    Award,
    Wallet,
    ArrowRight,
    Activity,
    LineChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardOverview() {
    const [stats, setStats] = useState<any>(null);
    const [recentGames, setRecentGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const { data: finance } = await supabase
                .from("company_finances")
                .select("*")
                .single();

            const { count: activePlayers } = await supabase
                .from("room_cards")
                .select("*", { count: 'exact', head: true });

            const { data: games } = await supabase
                .from("rooms_engine")
                .select("id, status, pool, company_fee, end_time")
                .order("end_time", { ascending: false })
                .limit(5);

            setStats({
                finance,
                activePlayers: activePlayers || 0,
            });
            setRecentGames(games || []);
            setLoading(false);
        };

        fetchDashboardData();
        
        const channel = supabase
            .channel('dashboard_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'company_finances' }, (payload) => {
                setStats((prev: any) => ({ ...prev, finance: payload.new }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return (
        <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white border border-slate-100 rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 bg-white border border-slate-100 rounded-xl" />
                <div className="h-96 bg-white border border-slate-100 rounded-xl" />
            </div>
        </div>
    );

    const cards = [
        { 
            title: "Telebirr Revenue", 
            value: `ETB ${stats?.finance?.tele_profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`, 
            description: "Commission from Telebirr",
            icon: TrendingUp,
            color: "text-indigo-600",
            bg: "bg-indigo-50"
        },
        { 
            title: "CBE Revenue", 
            value: `ETB ${stats?.finance?.cbe_profit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`, 
            description: "Commission from CBE Birr",
            icon: LineChart,
            color: "text-amber-600",
            bg: "bg-amber-50"
        },
        { 
            title: "Active Players", 
            value: stats?.activePlayers || 0, 
            description: "Live across all rooms",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        { 
            title: "Total Liquidity", 
            value: `ETB ${(Number(stats?.finance?.tele_balance || 0) + Number(stats?.finance?.cbe_balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
            description: "Total available balance",
            icon: Wallet,
            color: "text-emerald-600",
            bg: "bg-emerald-50"
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Systems Overview</h1>
                    <p className="text-sm text-slate-500 font-medium">Real-time performance metrics and financial data.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="font-semibold h-9">Export Audit</Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 font-semibold h-9 shadow-sm">Initialize Round</Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, i) => (
                    <Card key={i} className="border-slate-200 shadow-none rounded-xl overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-lg shrink-0", card.bg, card.color)}>
                                <card.icon size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</p>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{card.value}</h3>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{card.description}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Rounds Table */}
                <Card className="lg:col-span-2 border-slate-200 shadow-none rounded-xl overflow-hidden flex flex-col">
                    <CardHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Activity size={16} className="text-indigo-500" />
                                Recent Activity
                            </CardTitle>
                            <CardDescription className="text-xs">Latest rounds processed by the engine</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-400 hover:text-indigo-600 h-8">View Records</Button>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Round ID</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pool Size</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentGames.map((game) => (
                                    <tr key={game.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-900">#{game.id.substring(0,8).toUpperCase()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-600 font-mono">ETB {game.pool}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-emerald-600">ETB {game.company_fee}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-[10px] font-medium text-slate-400">
                                                {game.end_time ? new Date(game.end_time).toLocaleTimeString() : 'Active...'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {recentGames.length === 0 && (
                            <div className="p-12 text-center">
                                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Awaiting Engine Data...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Regional Split/Provider Status */}
                <Card className="border-slate-200 shadow-none rounded-xl overflow-hidden flex flex-col">
                    <CardHeader className="px-6 py-4 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Zap size={16} className="text-amber-500" />
                            Provider Status
                        </CardTitle>
                        <CardDescription className="text-xs">Liquidity distribution per method</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                        {/* Telebirr */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telebirr API</span>
                                    <p className="text-xs font-bold text-slate-900">ETB {stats?.finance?.tele_balance?.toLocaleString()}</p>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-500">
                                    {Math.round((stats?.finance?.tele_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100) || 0}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-500 transition-all duration-1000" 
                                    style={{ width: `${(stats?.finance?.tele_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100}%` }} 
                                />
                            </div>
                        </div>

                        {/* CBE */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CBE Birr API</span>
                                    <p className="text-xs font-bold text-slate-900">ETB {stats?.finance?.cbe_balance?.toLocaleString()}</p>
                                </div>
                                <span className="text-[10px] font-bold text-amber-500">
                                    {Math.round((stats?.finance?.cbe_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100) || 0}%
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 transition-all duration-1000" 
                                    style={{ width: `${(stats?.finance?.cbe_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100}%` }} 
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mt-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Engine Profitability</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Yield Status</span>
                                    <div className="text-sm font-bold text-emerald-600">+12.4%</div>
                                </div>
                                <div className="w-px h-6 bg-slate-200" />
                                <div className="flex-1 text-right md:text-left">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Latency</span>
                                    <div className="text-sm font-bold text-slate-900 italic leading-none">Healthy</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
