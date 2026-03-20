"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Gamepad2,
    Wallet,
    ArrowUpFromLine,
    ArrowDownToLine,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    ShieldCheck,
    Loader2,
    Bell,
    ChevronDown,
    Search
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Games Control", href: "/dashboard/games", icon: Gamepad2 },
    { label: "Financial Hub", href: "/dashboard/finances", icon: Wallet },
    { label: "Deposits", href: "/dashboard/deposites", icon: ArrowDownToLine },
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

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            if (profile) {
                setRole(profile.role);
                if (profile.role === "player") {
                    router.push("/lobby");
                }
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
            <div className="h-screen flex items-center justify-center bg-white flex-col gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Initialising Suite...</p>
            </div>
        );
    }

    if (pathname === "/login" || pathname === "/signup") {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans antialiased text-slate-900">

            {/* 🏰 Desktop Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 border-r border-slate-800",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary-500 p-1.5 rounded-lg text-white">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">Bingo<span className="text-primary-400">Hub</span></span>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-3 py-6 space-y-1">
                        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Core Management</p>
                        {NAV_ITEMS.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-slate-800 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                    )}
                                >
                                    <item.icon className={cn("w-4.5 h-4.5", isActive ? "text-primary-400" : "text-slate-500")} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-primary-400 font-bold text-xs uppercase">
                                    {user?.email?.[0]}
                                </div>
                                <div className="flex flex-col truncate">
                                    <span className="text-xs font-semibold text-white truncate">{user?.email?.split('@')[0]}</span>
                                    <span className="text-[10px] text-slate-500 uppercase font-medium">{role || 'Operator'}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 🍱 Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-slate-500">
                            {isSidebarOpen ? <X /> : <Menu />}
                        </button>
                        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span className="hover:text-slate-600 cursor-pointer text-slate-500">Suite</span>
                            <span>/</span>
                            <span className="text-slate-900 capitalize">{pathname.split('/').pop() || 'Overview'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="h-9 w-64 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 rounded-full h-9 w-9">
                            <Bell className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-2 pl-2 group cursor-pointer">
                            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-[10px]">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50/50">
                    <div className="p-4 md:p-8">
                        <div className="max-w-[1600px] mx-auto">
                            {children}
                        </div>
                    </div>
                </main>
            </div>

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
