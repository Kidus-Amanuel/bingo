"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            // Successfully logged in
            router.push("/dashboard"); // Redirect to Overview
        } catch (err: any) {
            setError(err.message || "Failed to sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-primary-900 text-white space-y-1 py-8 text-center">
                    <CardTitle className="text-3xl font-black uppercase italic tracking-tight">Bingo Admin</CardTitle>
                    <CardDescription className="text-primary-100/60 font-bold uppercase text-[10px] tracking-widest">
                        Dashboard Access
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold text-center animate-in fade-in zoom-in duration-300">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                                className="h-12 rounded-xl border-slate-100 focus:ring-primary-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                className="h-12 rounded-xl border-slate-100 focus:ring-primary-500"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-primary-900 hover:bg-black font-black text-sm transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                            SIGN IN TO DASHBOARD
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-8 border-t border-slate-50 pt-6 mt-4">
                    <p className="text-xs text-slate-400 font-bold">
                        Don't have an account?{" "}
                        <Link href="/signup" className="text-primary-600 hover:underline">
                            Request Access
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
