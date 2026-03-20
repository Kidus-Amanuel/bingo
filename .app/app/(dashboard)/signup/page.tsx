"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UserPlus, ShieldPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,
                        role: 'operator',
                    }
                }
            });
            if (authError) throw authError;
            if (authData.user) {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || "Registration failed. Please contact support.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-xl border-slate-200 rounded-xl text-center p-10 bg-white">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-900 mb-2">Registration Pending</CardTitle>
                    <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                        We've sent a verification link to <span className="text-slate-900 font-bold">{email}</span>. Please verify your email to access the dashboard.
                    </p>
                    <Button onClick={() => router.push("/login")} className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold">
                        Return to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600/50" />
            
            <Card className="w-full max-w-md shadow-xl border-slate-200 rounded-xl overflow-hidden bg-white">
                <CardHeader className="space-y-2 pt-10 pb-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-2">
                        <ShieldPlus className="text-indigo-600 w-7 h-7" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">Create Operator Access</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-500 px-4">
                        Request administrative access to the Bingo platform.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-8 pt-2">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-semibold text-center">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Operator Name</label>
                            <Input
                                placeholder="e.g. Amanuel"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                required
                                className="h-11 rounded-lg border-slate-200 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Work Email</label>
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
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-0.5">Password</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="h-11 rounded-lg border-slate-200 focus:ring-indigo-500"
                            />
                            <p className="text-[10px] text-slate-400 font-medium ml-0.5">Minimum 6 characters required.</p>
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold text-sm shadow-sm transition-all mt-4"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            Request Access
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-10 pt-4 text-center">
                    <p className="text-sm text-slate-500 font-medium">
                        Already have access?{" "}
                        <Link href="/login" className="text-indigo-600 font-bold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
