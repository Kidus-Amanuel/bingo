"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { 
    LayoutDashboard, 
    Gamepad2, 
    Wallet, 
    ArrowUpFromLine, 
    Settings, 
    LogOut,
    Menu,
    X,
    User,
    ShieldCheck,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Games Control", href: "/dashboard/games", icon: Gamepad2 },
    { label: "Finances", href: "/dashboard/finances", icon: Wallet },
    { label: "Withdrawals", href: "/dashboard/withdrawals", icon: ArrowUpFromLine },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                if (pathname !== "/login" && pathname !== "/signup") {
                    router.push("/login");
                }
                setIsLoading(false);
                return;
            }

            setUser(session.user);

            // Check role
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();
            
            if (profile) {
                setRole(profile.role);
                if (profile.role === "player") {
                    // Players shouldn't be here
                    router.push("/lobby");
                }
            } else {
                // No profile? Maybe a new signup. 
                // We'll let them see the empty dashboard for now if they are 'operator' by default in DB.
            }

            setIsLoading(false);
        };

        checkAuth();
    }, [router, pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Authenticating...</p>
            </div>
        );
    }

    // Skip layout for auth pages
    if (pathname === "/login" || pathname === "/signup") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
            
            {/* 📱 Mobile Header */}
            <header className="md:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-primary-900 p-1.5 rounded-lg text-white">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="font-black text-slate-900 uppercase tracking-tighter">Bingo Admin</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500">
                    {isSidebarOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* 🏰 Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-primary-950 text-white transform transition-transform duration-300 md:relative md:translate-x-0 shadow-2xl",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="p-8 hidden md:block">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-primary-500 p-2 rounded-xl text-white shadow-lg shadow-primary-500/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <span className="font-black text-xl tracking-tighter uppercase italic">Control</span>
                        </div>
                        <p className="text-[10px] font-black text-primary-300/50 uppercase tracking-[0.2em] leading-none">Management Suite</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 space-y-1 py-4 md:py-0">
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all group",
                                        isActive 
                                            ? "bg-white text-primary-900 shadow-xl shadow-primary-900/40" 
                                            : "text-primary-100/40 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5", isActive ? "text-primary-600" : "group-hover:scale-110 transition-transform")} />
                                    <span className="tracking-wide">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-6 mt-auto">
                        <div className="bg-white/5 rounded-3xl p-4 mb-4 border border-white/10">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-primary-900 font-black text-xs uppercase">
                                    {user?.email?.[0] || <User className="w-4 h-4" />}
                                </div>
                                <div className="flex flex-col truncate">
                                    <span className="text-[10px] font-black text-primary-300 uppercase leading-none mb-1">Signed in as</span>
                                    <span className="text-xs font-bold text-white truncate">{user?.email}</span>
                                </div>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[9px] font-black uppercase tracking-widest border border-primary-500/30">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {role || 'Operator'}
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-2xl font-bold transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* 🌪 Overlay for mobile */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-primary-950/60 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* 🍱 Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
