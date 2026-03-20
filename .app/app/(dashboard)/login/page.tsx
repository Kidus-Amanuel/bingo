"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
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
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Invalid credentials. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
            
            <Card className="w-full max-w-md shadow-xl border-slate-200 rounded-xl overflow-hidden bg-white">
                <CardHeader className="space-y-2 pt-10 pb-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-2">
                        <ShieldCheck className="text-indigo-600 w-7 h-7" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Bingo Operator</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500">
                        Sign in to manage rooms and liquidity.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-8">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-semibold text-center animate-in fade-in slide-in-from-top-1">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Operator Email</label>
                            <Input
                                type="email"
                                placeholder="operator@bingo.app"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                                className="h-11 rounded-lg border-slate-200 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Password</label>
                                <Link href="#" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Forgot?</Link>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                className="h-11 rounded-lg border-slate-200 focus:ring-indigo-500"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-sm shadow-sm transition-all mt-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                            Access Dashboard
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-10 pt-4 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        New operator?{" "}
                        <Link href="/signup" className="text-indigo-600 font-bold hover:underline">
                            Request account
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
