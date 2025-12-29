'use client';

import { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid
} from 'recharts';
import { getCurrencyFormatter } from '@/lib/currency';

export interface ChartDataPoint {
    name: string;
    value: number;
    value2?: number; // For comparison charts (e.g., income vs expenses)
    color?: string;
    [key: string]: unknown;
}

export interface ChatChartData {
    type: 'bar' | 'line' | 'pie';
    data: ChartDataPoint[];
    title: string;
    currency: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    series?: Array<{ key: string; name: string; color: string }>;
}

interface ChatChartProps {
    chartData: ChatChartData;
}

// Brighter color palette for better visibility on dark backgrounds
const CHART_COLORS = [
    '#60A5FA', // Bright Blue
    '#34D399', // Bright Emerald
    '#FBBF24', // Bright Amber
    '#A78BFA', // Bright Purple
    '#F87171', // Bright Red
    '#22D3EE', // Bright Cyan
    '#F472B6', // Bright Pink
    '#2DD4BF', // Bright Teal
];

export default function ChatChart({ chartData }: ChatChartProps) {
    const { type, data, title, currency, series } = chartData;

    const formatCurrency = useMemo(
        () => getCurrencyFormatter(currency || 'USD'),
        [currency]
    );

    // Custom tooltip component with better visibility
    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string; color?: string }>; label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900/95 backdrop-blur-md rounded-lg px-4 py-3 text-sm shadow-xl border border-white/20">
                    <p className="font-semibold text-white mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-white/90 font-medium" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Pie chart custom label with white text
    const renderPieLabel = (entry: { name?: string; percent?: number }) => {
        if (!entry.name || entry.percent === undefined) return '';
        return `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`;
    };

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 500 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 500 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                                tickLine={false}
                                tickFormatter={(value) => formatCurrency(value).replace(/\.00$/, '')}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                            {series ? (
                                series.map((s) => (
                                    <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} />
                                ))
                            ) : (
                                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            )}
                            {series && <Legend wrapperStyle={{ fontSize: '12px', color: '#ffffff' }} />}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={data} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#ffffff', fontSize: 12, fontWeight: 500 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: '#ffffff', fontSize: 11, fontWeight: 500 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                                tickLine={false}
                                tickFormatter={(value) => formatCurrency(value).replace(/\.00$/, '')}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {series ? (
                                series.map((s) => (
                                    <Line
                                        key={s.key}
                                        type="monotone"
                                        dataKey={s.key}
                                        name={s.name}
                                        stroke={s.color}
                                        strokeWidth={3}
                                        dot={{ fill: s.color, strokeWidth: 2, r: 5, stroke: '#fff' }}
                                        activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                                    />
                                ))
                            ) : (
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#60A5FA"
                                    strokeWidth={3}
                                    dot={{ fill: '#60A5FA', strokeWidth: 2, r: 5, stroke: '#fff' }}
                                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                                />
                            )}
                            {series && <Legend wrapperStyle={{ fontSize: '12px', color: '#ffffff' }} />}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                                label={renderPieLabel}
                                labelLine={{ stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1 }}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                                        stroke="rgba(255,255,255,0.2)"
                                        strokeWidth={1}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return <p className="text-white/70 text-sm">Unknown chart type</p>;
        }
    };

    if (!data || data.length === 0) {
        return (
            <div className="mt-3 p-4 rounded-xl bg-black/30 border border-white/10">
                <p className="text-white/60 text-sm text-center">No data available for chart</p>
            </div>
        );
    }

    return (
        <div className="mt-3 p-4 rounded-xl bg-black/30 border border-white/15 backdrop-blur-sm">
            {title && (
                <h4 className="text-sm font-bold text-white mb-4">{title}</h4>
            )}
            <style jsx global>{`
                .recharts-pie-label-text {
                    fill: #ffffff !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                }
                .recharts-legend-item-text {
                    color: #ffffff !important;
                }
            `}</style>
            {renderChart()}
        </div>
    );
}
