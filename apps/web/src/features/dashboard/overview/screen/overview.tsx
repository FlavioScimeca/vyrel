"use client";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChecklist,
  IconCurrencyDollar,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Progress,
  ProgressLabel,
  ProgressValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vyrel/shared/ui";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const kpiCards = [
  {
    title: "Revenue",
    value: "$48,290",
    change: "+12.4%",
    trend: "up" as const,
    description: "vs last month",
    icon: IconCurrencyDollar,
  },
  {
    title: "Active users",
    value: "2,847",
    change: "+8.1%",
    trend: "up" as const,
    description: "vs last month",
    icon: IconUsers,
  },
  {
    title: "Open tasks",
    value: "126",
    change: "-4.2%",
    trend: "down" as const,
    description: "vs last month",
    icon: IconChecklist,
  },
  {
    title: "Conversion",
    value: "3.8%",
    change: "+0.6%",
    trend: "up" as const,
    description: "vs last month",
    icon: IconWorld,
  },
] as const;

const activityData = [
  { month: "Jan", signups: 186, sessions: 420 },
  { month: "Feb", signups: 305, sessions: 510 },
  { month: "Mar", signups: 237, sessions: 480 },
  { month: "Apr", signups: 273, sessions: 540 },
  { month: "May", signups: 209, sessions: 460 },
  { month: "Jun", signups: 314, sessions: 620 },
];

const activityChartConfig = {
  signups: {
    label: "Signups",
    color: "var(--chart-1)",
  },
  sessions: {
    label: "Sessions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const channelData = [
  { channel: "Organic", visitors: 420 },
  { channel: "Referral", visitors: 280 },
  { channel: "Social", visitors: 190 },
  { channel: "Email", visitors: 150 },
  { channel: "Paid", visitors: 320 },
];

const channelChartConfig = {
  visitors: {
    label: "Visitors",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const recentActivity = [
  {
    id: "ACT-1042",
    user: "Ava Chen",
    action: "Created project",
    status: "Completed",
    date: "Jul 27",
  },
  {
    id: "ACT-1041",
    user: "Marcus Lee",
    action: "Invited teammate",
    status: "Pending",
    date: "Jul 27",
  },
  {
    id: "ACT-1040",
    user: "Sofia Rossi",
    action: "Updated billing",
    status: "Completed",
    date: "Jul 26",
  },
  {
    id: "ACT-1039",
    user: "Jonah Park",
    action: "Closed task #88",
    status: "Completed",
    date: "Jul 26",
  },
  {
    id: "ACT-1038",
    user: "Nina Blake",
    action: "Exported report",
    status: "Failed",
    date: "Jul 25",
  },
] as const;

const goals = [
  { label: "Onboarding completion", value: 78 },
  { label: "Weekly active rate", value: 64 },
  { label: "Support SLA", value: 91 },
] as const;

function statusVariant(status: (typeof recentActivity)[number]["status"]) {
  if (status === "Completed") {
    return "default" as const;
  }
  if (status === "Pending") {
    return "secondary" as const;
  }
  return "destructive" as const;
}

export default function OverviewScreen() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">
          Mock snapshot of workspace activity — placeholder data only.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon =
            card.trend === "up" ? IconArrowUpRight : IconArrowDownRight;

          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="font-mono text-2xl tracking-tight">
                    {card.value}
                  </CardTitle>
                </div>
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-muted-foreground text-xs">
                <span
                  className={
                    card.trend === "up" ? "text-foreground" : "text-destructive"
                  }
                >
                  <TrendIcon className="mr-0.5 inline size-3.5" />
                  {card.change}
                </span>
                <span>{card.description}</span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              Signups and sessions over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="aspect-auto h-65 w-full"
              config={activityChartConfig}
            >
              <AreaChart
                accessibilityLayer
                data={activityData}
                margin={{ left: 8, right: 8, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  width={36}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="sessions"
                  fill="var(--color-sessions)"
                  fillOpacity={0.15}
                  stroke="var(--color-sessions)"
                  strokeWidth={2}
                  type="monotone"
                />
                <Area
                  dataKey="signups"
                  fill="var(--color-signups)"
                  fillOpacity={0.35}
                  stroke="var(--color-signups)"
                  strokeWidth={2}
                  type="monotone"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Traffic by channel</CardTitle>
            <CardDescription>Visitors this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              className="aspect-auto h-65 w-full"
              config={channelChartConfig}
            >
              <BarChart
                accessibilityLayer
                data={channelData}
                margin={{ left: 8, right: 8, top: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="channel"
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  width={36}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="visitors"
                  fill="var(--color-visitors)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest workspace events</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell>{row.user}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>Progress toward weekly targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {goals.map((goal) => (
              <Progress key={goal.label} value={goal.value}>
                <ProgressLabel>{goal.label}</ProgressLabel>
                <ProgressValue />
              </Progress>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
