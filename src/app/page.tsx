'use client';

import Link from 'next/link';
import {
    Brain,
    Play,
    Github,
    Zap,
    Database,
    Code2,
    Cpu
} from 'lucide-react';
import Image from 'next/image';
import LandingHeader from '@/components/LandingHeader';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] transition-colors duration-300">
            <LandingHeader />

            {/* Hero Section - Asymmetric Layout */}
            <section id="demo" className="relative pt-28 md:pt-36 pb-12 md:pb-20 px-4 md:px-6">
                <div className="relative z-10 max-w-6xl mx-auto">
                    {/* Desktop: Asymmetric two-column, Mobile: Stacked */}
                    <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
                        {/* Left Column - Text Content */}
                        <div className="md:col-span-2 text-center md:text-left">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
                                <span className="text-[var(--logo-wallet)]">Wallet</span><span className="text-[var(--logo-ai)]">AI</span>
                            </h1>
                            <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-3">
                                A personal finance app that actually understands you.
                            </p>
                            <p className="text-sm text-[var(--text-tertiary)] mb-6">
                                Track expenses with natural language. Get AI-powered insights. No spreadsheets required.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <Link
                                    href="/login?demo=true"
                                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md transition-colors duration-200 flex items-center gap-2"
                                >
                                    <Play className="h-4 w-4" />
                                    <span>Try Demo</span>
                                </Link>
                                <a
                                    href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 border border-[var(--card-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--card-hover)] transition-colors duration-200 flex items-center gap-2"
                                >
                                    <Github className="h-4 w-4" />
                                    <span>Source</span>
                                </a>
                            </div>
                        </div>

                        {/* Right Column - Demo Video */}
                        <div className="md:col-span-3">
                            <div className="rounded-2xl overflow-hidden aspect-video border border-[var(--card-border)] shadow-lg bg-[var(--background-elevated)]">
                                <iframe
                                    className="w-full h-full"
                                    src="https://www.youtube.com/embed/q61iecM_Gro?autoplay=1&mute=1&loop=1&playlist=q61iecM_Gro"
                                    title="WalletAI Demo Video"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section - Varied Layout */}
            <section id="features" className="py-16 md:py-24 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-5xl mx-auto">
                    {/* Section Header */}
                    <div className="mb-12">
                        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2">
                            What it does
                        </h2>
                        <p className="text-[var(--text-secondary)]">
                            Built for people who want to understand their money without the hassle.
                        </p>
                    </div>

                    {/* Featured: AI Chat - Full Width */}
                    <div className="mb-8 rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                        <div className="grid md:grid-cols-2">
                            <div className="aspect-[4/3] md:aspect-auto overflow-hidden">
                                <img
                                    src="/screenshots/ai-chat.png"
                                    alt="AI Chat Interface"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-6 md:p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <Brain className="h-5 w-5 text-[var(--accent-primary)]" />
                                    <span className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide">Core Feature</span>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">AI Assistant</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4">
                                    Ask questions in plain English. "How much did I spend on food last month?" or "Show me my biggest expenses this year." The AI queries your data and responds with insights, not just numbers.
                                </p>
                                <ul className="text-sm text-[var(--text-tertiary)] space-y-1">
                                    <li>• Creates expenses from natural language input</li>
                                    <li>• Generates charts on request</li>
                                    <li>• 8 integrated financial functions</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Two-column grid for remaining features */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Dashboard */}
                        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                            <div className="aspect-[16/10] overflow-hidden">
                                <img
                                    src="/screenshots/dashboard.png"
                                    alt="Dashboard Overview"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Dashboard</h3>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    Net worth, cash flow, spending by category. Everything in one view.
                                </p>
                            </div>
                        </div>

                        {/* Smart Input */}
                        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--background-elevated)]">
                            <div className="aspect-[16/10] overflow-hidden">
                                <img
                                    src="/screenshots/expense-input.png"
                                    alt="Smart Expense Input"
                                    className="w-full h-full object-cover object-top"
                                />
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">Smart Input</h3>
                                <p className="text-[var(--text-secondary)] text-sm">
                                    Type "coffee $5" or scan a receipt. AI handles the rest.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional capabilities - Simple list */}
                    <div className="mt-10 pt-8 border-t border-[var(--card-border)]">
                        <p className="text-sm font-medium text-[var(--text-primary)] mb-4">Also includes:</p>
                        <div className="flex flex-wrap gap-3">
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Multi-currency (7+)</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Portfolio tracking</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Receipt OCR</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Budget tracking</span>
                            <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)] bg-[var(--background-elevated)] rounded-lg border border-[var(--card-border)]">Semantic search</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tech Stack Section - Compact Horizontal */}
            <section id="tech" className="py-12 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Built with:</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded bg-black flex items-center justify-center text-white text-xs font-bold">N</span>
                                Next.js 15
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="text-[#61DAFB]">⚛</span>
                                React 19
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Code2 className="h-4 w-4 text-[#3178C6]" />
                                TypeScript
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Database className="h-4 w-4 text-[#3ECF8E]" />
                                Supabase
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Cpu className="h-4 w-4 text-[var(--accent-primary)]" />
                                Gemini AI
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technical Highlights Section - Condensed */}
            <section id="highlights" className="py-12 md:py-16 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                        Under the hood
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-[var(--accent-primary)]" />
                                <h3 className="font-semibold text-[var(--text-primary)] text-sm">AI Function Calling</h3>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">
                                8 Gemini-powered functions handle database queries via natural language. Ask a question, get data back.
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-[var(--accent-warning)]" />
                                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Hybrid Parser</h3>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">
                                Keyword parsing handles simple inputs in &lt;2ms. Complex natural language falls back to AI.
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="h-4 w-4 text-[var(--accent-success)]" />
                                <h3 className="font-semibold text-[var(--text-primary)] text-sm">Row-Level Security</h3>
                            </div>
                            <p className="text-[var(--text-secondary)] text-sm">
                                PostgreSQL RLS policies ensure data isolation per user. No API-level auth bugs possible.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section - Clean */}
            <section className="py-16 md:py-20 px-4 md:px-6 border-t border-[var(--card-border)]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-3">
                        Try it yourself
                    </h2>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Demo account has sample data to explore. Or grab the source and run it locally.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/login?demo=true"
                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center gap-2"
                        >
                            <Play className="h-4 w-4" />
                            <span>Try Demo</span>
                        </Link>
                        <a
                            href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 border border-[var(--card-border)] text-[var(--text-primary)] font-medium rounded-xl hover:bg-[var(--card-hover)] transition-colors duration-200 flex items-center gap-2"
                        >
                            <Github className="h-4 w-4" />
                            <span>View Source</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 md:py-12 px-4 md:px-6 border-t border-[var(--glass-border)]">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
                        {/* Logo */}
                        <div className="flex items-end">
                            <Image
                                src="/wallet-ai-logo.png"
                                alt="WalletAI Logo"
                                width={34}
                                height={34}
                                className="logo relative top-[4px]"
                            />
                            <span className="ml-1 text-xl font-bold leading-none"><span className="text-[var(--logo-wallet)]">Wallet</span><span className="text-[var(--logo-ai)]">AI</span></span>
                        </div>

                        {/* Links */}
                        <div className="flex items-center space-x-6">
                            <a href="#features" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Features
                            </a>
                            <a href="#tech" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">
                                Tech Stack
                            </a>
                            <a
                                href="https://github.com/jengyang7/WalletAI-personal-financial-web-app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm flex items-center gap-1"
                            >
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        </div>

                        {/* Copyright */}
                        <p className="text-[var(--text-tertiary)] text-sm">
                            © {new Date().getFullYear()} WalletAI
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
