"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, UserPlus, LogIn } from "lucide-react";
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
            // 1. Auth Signup
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
                // 2. Profile Creation (Triggers or Manual)
                // The DB has a trigger on auth.users usually, but let's be explicit if needed.
                // For now, we assume RLS allows this or a trigger handles it.
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || "Failed to sign up");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] text-center p-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <UserPlus className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-2xl font-black mb-2">Check your email</CardTitle>
                    <p className="text-slate-500 font-bold mb-8">We've sent a verification link to {email}.</p>
                    <Button onClick={() => router.push("/login")} className="w-full h-12 rounded-xl bg-primary-900 font-black uppercase">
                        Go to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-primary-950 text-white space-y-1 py-8 text-center">
                    <CardTitle className="text-3xl font-black uppercase italic tracking-tight">Create Account</CardTitle>
                    <CardDescription className="text-primary-100/60 font-bold uppercase text-[10px] tracking-widest">
                        Bingo Operator Portal
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold text-center">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                            <Input
                                placeholder="Admin Name"
                                value={username}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                                required
                                className="h-12 rounded-xl border-slate-100 placeholder:text-slate-300"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                                className="h-12 rounded-xl border-slate-100"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
                            <Input
                                type="password"
                                placeholder="Minimum 6 characters"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="h-12 rounded-xl border-slate-100"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-primary-900 hover:bg-black font-black text-sm transition-all"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            CREATE ACCESS REQUEST
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4 pb-8 border-t border-slate-50 pt-6 mt-4">
                    <p className="text-xs text-slate-400 font-bold">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary-600 hover:underline">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
