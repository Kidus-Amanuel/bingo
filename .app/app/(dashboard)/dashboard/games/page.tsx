"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Gamepad2, 
    Users, 
    Trophy, 
    Clock, 
    DollarSign,
    CheckCircle2,
    XCircle,
    PlayCircle,
    Loader2,
    Search,
    ChevronRight,
    Filter,
    Activity,
    AlertCircle,
    Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function GamesControlPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchRooms = async () => {
        const { data, error } = await supabase
            .from("rooms_engine")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error) setRooms(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchRooms();
        const channel = supabase
            .channel('room_control_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms_engine' }, () => {
                fetchRooms();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleRoomAction = async (id: string, action: 'cancel' | 'start') => {
        setActionLoading(id);
        try {
            if (action === 'cancel') {
                const { error } = await supabase
                    .from('rooms_engine')
                    .update({ status: 'cancelled' })
                    .eq('id', id);
                if (error) throw error;
            } else if (action === 'start') {
                const { error } = await supabase
                    .from('rooms_engine')
                    .update({ status: 'playing', start_time: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
            }
            await fetchRooms();
        } catch (err: any) {
            console.error(err);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return (
        <div className="space-y-4 pt-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Engine...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Gamepad2 size={20} className="text-indigo-600" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Active Rooms</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Coordinate live bingo sessions and engine states.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Find ID..." 
                            className="h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-xs font-semibold w-48 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-2 font-semibold text-slate-600">
                        <Filter size={14} />
                        Filter
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-9 font-semibold shadow-sm">
                        Create New Room
                    </Button>
                </div>
            </div>

            {/* Room List */}
            <div className="grid grid-cols-1 gap-4">
                {rooms.map((room) => {
                    const statusColors = {
                        playing: "bg-emerald-50 text-emerald-700 border-emerald-100",
                        waiting: "bg-indigo-50 text-indigo-700 border-indigo-100",
                        finished: "bg-slate-50 text-slate-500 border-slate-100",
                        cancelled: "bg-rose-50 text-rose-700 border-rose-100",
                    };

                    return (
                        <Card key={room.id} className="border-slate-200 shadow-none rounded-xl overflow-hidden group hover:border-indigo-300 transition-all">
                            <CardContent className="p-0">
                                <div className="flex flex-col lg:flex-row lg:items-center">
                                    {/* ID & Status */}
                                    <div className="p-5 lg:w-72 flex items-center gap-4 shrink-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                            room.status === 'playing' ? "bg-emerald-500 text-white" :
                                            room.status === 'waiting' ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-400"
                                        )}>
                                            <Activity size={20} className={room.status === 'playing' ? "animate-pulse" : ""} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-900 font-mono truncate">#{room.id.substring(0,12).toUpperCase()}</span>
                                                <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] uppercase font-bold tracking-tighter border", statusColors[room.status as keyof typeof statusColors])}>
                                                    {room.status}
                                                </Badge>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created {new Date(room.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50/50 border-y lg:border-y-0 lg:border-x border-slate-100">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jackpot Pool</p>
                                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400 font-normal">ETB</span>
                                                {room.pool}
                                            </p>
                                        </div>
                                        <div className="space-y-0.5 text-right md:text-left">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Player Count</p>
                                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1 md:justify-start justify-end">
                                                <Users size={14} className="text-slate-400" />
                                                <span className="text-indigo-600">--</span> 
                                                <span className="text-slate-300">/ {room.max_players}</span>
                                            </p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Fee</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono">ETB 10.00</p>
                                        </div>
                                        <div className="space-y-0.5 text-right md:text-left">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Profit</p>
                                            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1 md:justify-start justify-end">
                                                <CheckCircle2 size={14} />
                                                ETB {room.company_fee}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="p-5 flex items-center justify-between lg:justify-end gap-3 lg:w-64">
                                        {room.status === 'waiting' ? (
                                            <>
                                                <Button 
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleRoomAction(room.id, 'cancel')}
                                                    className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-100 shadow-none"
                                                >
                                                    Discard
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    className="h-8 flex-1 lg:flex-none text-xs font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-2"
                                                    onClick={() => handleRoomAction(room.id, 'start')}
                                                    disabled={!!actionLoading}
                                                >
                                                    {actionLoading === room.id ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
                                                    Force Start
                                                </Button>
                                            </>
                                        ) : room.status === 'playing' ? (
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-tighter bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                                Live Round
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock size={14} />
                                                {room.status === 'finished' ? 'Completed' : 'Shutdown'}
                                            </div>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg">
                                            <Eye size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {rooms.length === 0 && (
                    <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <Gamepad2 size={48} className="text-slate-200 mx-auto mb-4" />
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Active Sessions</h3>
                        <p className="text-xs text-slate-400 mt-1">Deploy a new bingo room to start accepting players.</p>
                        <Button className="mt-6 bg-indigo-600 font-bold px-6">New Deployment</Button>
                    </div>
                )}
            </div>
        </div>
    );
}
