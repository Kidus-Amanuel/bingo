import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
    Trophy,
    Users,
    Gamepad2,
    ArrowRight,
    ShieldCheck,
    Zap
} from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Hero Section */}
            <section className="relative py-24 px-4 overflow-hidden bg-hero-gradient text-white">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-30" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl opacity-20" />

                <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-500">
                        <Zap className="w-4 h-4 fill-current text-secondary-400" />
                        <span>Next Generation Bingo Platform</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tight leading-tight drop-shadow-sm">
                        The Ultimate <span className="text-secondary-400 italic">Bingo</span> <br className="hidden md:block" />
                        Experience
                    </h1>

                    <p className="max-w-2xl mx-auto text-xl text-white/90 font-medium">
                        A premium, real-time gaming platform designed for startups and B2B rentals.
                        Engage 1000+ simultaneous users with Indigo-powered trust.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                        <Link href="/lobby">
                            <Button size="lg" className="h-14 px-10 text-lg font-bold bg-secondary-500 hover:bg-secondary-600 text-secondary-900 border-none rounded-xl shadow-xl hover:scale-105 transition-all group">
                                Join Game <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold bg-white/10 backdrop-blur-md border-white/40 hover:bg-white/20 text-white rounded-xl shadow-xl">
                            View Dashboard
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Why Choose Our Platform?</h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">Everything you need to run a successful bingo business with vibrant Indigo engagement.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        <Card className="p-8 border-none shadow-2xl shadow-indigo-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-8">
                                <Gamepad2 className="w-7 h-7 text-primary-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 dark:text-white text-primary-900">Real-time Engine</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Low-latency game synchronization using the latest serverless technologies and Indigo-powered reliability.
                            </p>
                        </Card>

                        <Card className="p-8 border-none shadow-2xl shadow-amber-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mb-8">
                                <ShieldCheck className="w-7 h-7 text-secondary-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 dark:text-white text-secondary-900">Fair Play</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Deterministic and verifiable random number generation for maximum trust and Amber-level excitement.
                            </p>
                        </Card>

                        <Card className="p-8 border-none shadow-2xl shadow-pink-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center mb-8">
                                <Users className="w-7 h-7 text-accent-600" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 dark:text-white text-accent-900">Winner Rewards</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                Celebrating Every Win with Pink-accented animations and instant payout verifications for all players.
                            </p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Social Proof */}
            <section className="py-16 bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <div className="flex flex-wrap justify-center gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-700 items-center">
                        <div className="flex items-center gap-3 text-2xl font-black text-primary-700">INDIGO <span className="font-light">BRAND</span></div>
                        <div className="flex items-center gap-3 text-2xl font-black text-secondary-700">AMBER <span className="font-light">PLAY</span></div>
                        <div className="flex items-center gap-3 text-2xl font-black text-accent-700">PINK <span className="font-light">WIN</span></div>
                    </div>
                </div>
            </section>
        </main>
    );
}
