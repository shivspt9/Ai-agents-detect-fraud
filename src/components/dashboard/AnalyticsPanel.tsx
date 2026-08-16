import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { TrendingUp, PieChart, BarChart3, Layers, Repeat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AnalyticsResponse } from '@/lib/api';
import { CATEGORICAL, CHROME, rampStep, humanize } from './chart-theme';

interface AnalyticsPanelProps {
  analytics?: AnalyticsResponse;
  loading?: boolean;
}

/** Shared dark tooltip. Recharts' default is a white box, unreadable here. */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0B111E]/95 px-3 py-2 shadow-xl backdrop-blur">
      {label && <p className="mb-1 text-xs font-medium text-foreground">{label}</p>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-mono font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof TrendingUp;
  children: React.ReactNode;
}) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-white/5 pb-4">
        <CardTitle className="flex items-center gap-3 text-base">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center text-center">
      <p className="max-w-xs text-sm text-muted-foreground/70">{message}</p>
    </div>
  );
}

const axisProps = {
  stroke: CHROME.axisLine,
  tick: { fill: CHROME.axis, fontSize: 11 },
  tickLine: false,
};

export function AnalyticsPanel({ analytics, loading }: AnalyticsPanelProps) {
  const timeData = useMemo(() => {
    if (!analytics) return [];
    return analytics.conversations_over_time.map((point, i) => ({
      time: new Date(point.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      Conversations: point.count,
      Intelligence: analytics.intelligence_over_time[i]?.count ?? 0,
    }));
  }, [analytics]);

  // Sorted so the ramp reads smallest → largest down the bars.
  const scamTypes = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.scam_type_breakdown)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [analytics]);

  const intelTypes = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.intel_type_breakdown)
      .map(([name, count]) => ({ name: humanize(name), count }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  const hasTimeData = timeData.some((d) => d.Conversations > 0 || d.Intelligence > 0);
  const hasTurns = (analytics?.turn_histogram ?? []).some((b) => b.count > 0);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[340px] rounded-2xl opacity-50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChartCard
        title="Activity over time"
        description="Conversations opened and intelligence extracted, last 24 hours"
        icon={TrendingUp}
      >
        {hasTimeData ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={CHROME.grid} vertical={false} />
              <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" minTickGap={40} />
              <YAxis {...axisProps} allowDecimals={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHROME.axisLine }} />
              <Legend
                iconType="plainline"
                wrapperStyle={{ fontSize: 12, color: CHROME.textSecondary, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="Conversations"
                stroke={CATEGORICAL[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }}
              />
              <Line
                type="monotone"
                dataKey="Intelligence"
                stroke={CATEGORICAL[1]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="No activity in the last 24 hours. Send a message from the API Tester to populate this chart." />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Scam categories"
          description="Which scam types the honeypot is seeing"
          icon={PieChart}
        >
          {scamTypes.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, scamTypes.length * 42)}>
              <BarChart
                data={scamTypes}
                layout="vertical"
                margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
                barCategoryGap={6}
              >
                <CartesianGrid stroke={CHROME.grid} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...axisProps}
                  width={140}
                  tick={{ fill: CHROME.textSecondary, fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Conversations" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {scamTypes.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={rampStep(scamTypes.length - 1 - i, scamTypes.length)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No scams classified yet." />
          )}
        </ChartCard>

        <ChartCard
          title="Intelligence by type"
          description="What the agent has pulled out of scammers"
          icon={Layers}
        >
          {intelTypes.length ? (
            <ResponsiveContainer width="100%" height={Math.max(200, intelTypes.length * 42)}>
              <BarChart
                data={intelTypes}
                layout="vertical"
                margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
                barCategoryGap={6}
              >
                <CartesianGrid stroke={CHROME.grid} horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...axisProps}
                  width={120}
                  tick={{ fill: CHROME.textSecondary, fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Items" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {intelTypes.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={rampStep(intelTypes.length - 1 - i, intelTypes.length)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No intelligence extracted yet." />
          )}
        </ChartCard>

        <ChartCard
          title="Engagement depth"
          description="How many turns the agent sustains per conversation"
          icon={BarChart3}
        >
          {hasTurns ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={analytics?.turn_histogram ?? []}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid stroke={CHROME.grid} vertical={false} />
                <XAxis dataKey="range" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} width={40} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Conversations" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {(analytics?.turn_histogram ?? []).map((entry, i, arr) => (
                    <Cell key={entry.range} fill={rampStep(i, arr.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No engagements recorded yet." />
          )}
        </ChartCard>

        <ChartCard
          title="Repeated identifiers"
          description="Values seen across more than one conversation — likely the same operation"
          icon={Repeat}
        >
          {analytics?.top_targets?.length ? (
            <ScrollArea className="h-[240px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 text-right font-medium">Times seen</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {analytics.top_targets.map((row) => (
                    <tr key={row.value} className="border-b border-white/5 last:border-0">
                      <td className="max-w-0 truncate py-2 pr-4 text-foreground" title={row.value}>
                        {row.value}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        {row.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <EmptyChart message="No repeated identifiers yet." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
