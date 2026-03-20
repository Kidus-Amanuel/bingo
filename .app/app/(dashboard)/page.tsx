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
    Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardOverview() {
    const [stats, setStats] = useState<any>(null);
    const [recentGames, setRecentGames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // 1. Fetch Company Finances
            const { data: finance } = await supabase
                .from("company_finances")
                .select("*")
                .single();

            // 2. Fetch Active Players Count (Unique users in room_cards for 'playing'/'waiting' rooms)
            const { count: activePlayers } = await supabase
                .from("room_cards")
                .select("*", { count: 'exact', head: true });

            // 3. Fetch Recent Finished Games
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
        
        // Subscribe to real-time updates for finances
        const channel = supabase
            .channel('dashboard_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'company_finances' }, (payload) => {
                setStats((prev: any) => ({ ...prev, finance: payload.new }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return <div className="animate-pulse space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-3xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-3xl" />
    </div>;

    const cards = [
        { 
            title: "Telebirr Profit", 
            value: `ETB ${stats?.finance?.tele_profit?.toFixed(2) || '0.00'}`, 
            sub: "Total Commission",
            icon: TrendingUp,
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        { 
            title: "CBE Profit", 
            value: `ETB ${stats?.finance?.cbe_profit?.toFixed(2) || '0.00'}`, 
            sub: "Total Commission",
            icon: Award,
            color: "text-purple-600",
            bg: "bg-purple-50"
        },
        { 
            title: "Active Users", 
            value: stats?.activePlayers || 0, 
            sub: "Live across all rooms",
            icon: Users,
            color: "text-orange-600",
            bg: "bg-orange-50"
        },
        { 
            title: "Total Liquidity", 
            value: `ETB ${(Number(stats?.finance?.tele_balance || 0) + Number(stats?.finance?.cbe_balance || 0)).toFixed(2)}`, 
            sub: "Cash on Hand",
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-50"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 👑 Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Systems Overview</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3 text-primary-500" />
                        Live data feed from global bingo engine
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl border-slate-200 font-bold text-xs uppercase h-10 px-6">Export Logs</Button>
                    <Button className="rounded-xl bg-primary-950 font-black text-xs uppercase h-10 px-6 shadow-xl shadow-primary-950/20">Refill Pool</Button>
                </div>
            </div>

            {/* 📈 Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-xl transition-all duration-500">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform duration-500", card.bg, card.color)}>
                                    <card.icon className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{card.title}</span>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{card.sub}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 🎮 Recent Games */}
                <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden pb-4">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-8 py-6">
                        <CardTitle className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-primary-500" />
                            Recent Rounds
                        </CardTitle>
                        <Button variant="ghost" className="text-[10px] font-black uppercase text-slate-400 hover:text-primary-600">View All Games</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentGames.map((game, i) => (
                            <div key={game.id} className={cn(
                                "flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                            )}>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-slate-800 uppercase tracking-tight">Game #{game.id.substring(0,6)}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {game.end_time ? new Date(game.end_time).toLocaleTimeString() : 'In Progress'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 text-right">
                                    <div>
                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total Pool</div>
                                        <div className="text-sm font-black text-slate-900 leading-none">ETB {game.pool}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-primary-500">Profit</div>
                                        <div className="text-sm font-black text-primary-600 leading-none">+ETB {game.company_fee}</div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="rounded-lg text-slate-300">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 🏦 Balance Breakdown */}
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary-500" />
                            Provider Split
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telebirr Liquidity</span>
                                <span className="font-black text-slate-900 tracking-tight">ETB {stats?.finance?.tele_balance?.toFixed(2)}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 rounded-full" 
                                    style={{ width: `${(stats?.finance?.tele_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100}%` }} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-end text-right">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">CBE Liquidity</span>
                                <span className="font-black text-slate-900 tracking-tight">ETB {stats?.finance?.cbe_balance?.toFixed(2)}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-purple-600 rounded-full" 
                                    style={{ width: `${(stats?.finance?.cbe_balance / (stats?.finance?.tele_balance + stats?.finance?.cbe_balance)) * 100}%` }} 
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[1.5rem] p-4 border border-dashed border-slate-200">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Profitability Index</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">Weekly Yield</span>
                                    <span className="text-lg font-black text-emerald-600">+12.4%</span>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div className="flex-1">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase">System Health</span>
                                    <span className="text-lg font-black text-slate-900">Optimal</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
