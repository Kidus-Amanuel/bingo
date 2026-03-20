"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Gamepad2, 
    Users, 
    Trophy, 
    Clock, 
    DollarSign,
    MoreVertical,
    CheckCircle2,
    XCircle,
    PlayCircle,
    Loader2,
    Search,
    UserCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

        // Subscribe to room updates
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
            alert(err.message || "Failed to update room");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="h-96 flex items-center justify-center animate-pulse"><Loader2 className="w-8 h-8 animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">Game Control</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        <Gamepad2 className="w-3 h-3 text-primary-500" />
                        Manage active rooms, player pools, and engine state
                    </p>
                </div>
                <div className="flex gap-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search By Room ID..." 
                        className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {rooms.map((room) => (
                    <Card key={room.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="flex flex-col lg:flex-row lg:items-center">
                            {/* Room Identity Section */}
                            <div className="p-8 lg:w-1/3 border-b lg:border-b-0 lg:border-r border-slate-100 bg-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/10 transition-transform group-hover:scale-110",
                                        room.status === 'playing' ? "bg-green-500" :
                                        room.status === 'waiting' ? "bg-primary-500" : "bg-slate-400 pointer-events-none grayscale"
                                    )}>
                                        <Gamepad2 size={24} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Room Reference</div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tighter">#{room.id.substring(0,8).toUpperCase()}</h3>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className={cn(
                                        "rounded-lg px-2 text-[8px] font-bold uppercase tracking-widest h-5",
                                        room.status === 'playing' ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                        room.status === 'waiting' ? "bg-blue-100 text-blue-700 hover:bg-blue-100" :
                                        "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                    )}>
                                        {room.status}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-lg px-2 text-[8px] font-bold uppercase tracking-widest text-slate-400 h-5">
                                        Max: {room.max_players}
                                    </Badge>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div className="flex-1 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50/50">
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <DollarSign size={10} className="text-emerald-500" />
                                        Current Pool
                                    </div>
                                    <div className="text-lg font-black text-slate-900 leading-none">ETB {room.pool}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Users size={10} className="text-primary-500" />
                                        Players
                                    </div>
                                    <div className="text-lg font-black text-slate-900 leading-none">-- / {room.max_players}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Trophy size={10} className="text-amber-500" />
                                        Profit
                                    </div>
                                    <div className="text-lg font-black text-slate-900 leading-none">ETB {room.company_fee}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Clock size={10} className="text-slate-400" />
                                        Time
                                    </div>
                                    <div className="text-lg font-black text-slate-900 leading-none">
                                        {room.start_time ? new Date(room.start_time).toLocaleTimeString() : '--:--'}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Section */}
                            <div className="p-8 bg-white lg:min-w-[200px] flex items-center lg:justify-center">
                                {room.status === 'waiting' && (
                                    <div className="flex gap-2 w-full lg:flex-col">
                                        <Button 
                                            size="sm"
                                            disabled={!!actionLoading}
                                            onClick={() => handleRoomAction(room.id, 'start')}
                                            className="flex-1 rounded-xl bg-primary-950 font-black text-[10px] uppercase h-10 shadow-lg shadow-primary-950/20"
                                        >
                                            {actionLoading === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1.5" />}
                                            Force Start
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            disabled={!!actionLoading}
                                            onClick={() => handleRoomAction(room.id, 'cancel')}
                                            className="flex-1 rounded-xl border-slate-200 text-red-500 font-black text-[10px] uppercase h-10 hover:bg-red-50"
                                        >
                                            <XCircle className="w-4 h-4 mr-1.5" />
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                                {room.status === 'playing' && (
                                    <div className="text-center w-full">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-black text-[10px] uppercase tracking-widest border border-green-100">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Live In-Engine
                                        </div>
                                    </div>
                                )}
                                {room.status === 'finished' && (
                                    <div className="text-center w-full opacity-40">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-500 rounded-lg font-black text-[10px] uppercase tracking-widest border border-slate-100">
                                            <CheckCircle2 size={12} />
                                            Archived
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

