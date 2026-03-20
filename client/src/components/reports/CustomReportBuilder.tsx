import * as React from "react";
import { useState } from "react";
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
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import api from "../../lib/api";
import {
  PlayCircle,
  Save,
  Trash2,
  PieChart as PieIcon,
  BarChart3 as BarIcon,
  TrendingUp as LineIcon,
  Zap,
  LayoutGrid,
  Cpu,
  Wand2,
  ChevronRight,
  Layers,
  Box,
} from "lucide-react";

interface CustomReportBuilderProps {
  filters: any;
  onDrilldown: (title: string, data: any[]) => void;
}

const METRICS = [
  {
    id: "taskCount",
    label: "Volume (Tasks)",
    icon: <LayoutGrid size={16} />,
    color: "var(--color-primary)",
  },
  {
    id: "timeSpent",
    label: "Duration (Hours)",
    icon: <LineIcon size={16} />,
    color: "var(--color-info)",
  },
  {
    id: "completionRate",
    label: "Efficiency (%)",
    icon: <BarIcon size={16} />,
    color: "var(--color-success)",
  },
];

const DIMENSIONS = [
  { id: "project", label: "Project Layer" },
  { id: "employee", label: "Member Focus" },
  { id: "status", label: "Lifecycle Stage" },
  { id: "priority", label: "Action Priority" },
];

const CHART_TYPES = [
  { id: "bar", label: "Column", icon: <BarIcon size={18} /> },
  { id: "line", label: "Timeline", icon: <LineIcon size={18} /> },
  { id: "pie", label: "Composition", icon: <PieIcon size={18} /> },
  { id: "area", label: "Intensity", icon: <Zap size={18} /> },
];

const CustomReportBuilder = ({
  filters,
  onDrilldown,
}: CustomReportBuilderProps): React.JSX.Element => {
  const [config, setConfig] = useState({
    metric: "taskCount",
    dimension: "project",
    chartType: "bar",
  });
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/reports/custom", {
        ...config,
        ...filters,
      });
      setReportData(data.data);
    } catch (err) {
      console.error("Failed to run custom report", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    "#6366f1",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  const renderChart = () => {
    if (!reportData)
      return (
        <div className="h-full flex flex-col items-center justify-center text-text-tertiary p-12 text-center opacity-40">
          <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-border flex items-center justify-center mb-6">
            <Wand2 size={32} className="text-primary" />
          </div>
          <h4 className="text-lg font-bold text-text mb-2 tracking-tight">
            Report Engine Ready
          </h4>
          <p className="text-sm max-w-xs leading-relaxed">
            Select your preferred telemetry metrics and dimension origins to
            generate a custom data visualization.
          </p>
        </div>
      );

    const ChartComponent =
      config.chartType === "line"
        ? LineChart
        : config.chartType === "area"
          ? AreaChart
          : config.chartType === "pie"
            ? PieChart
            : BarChart;

    return (
      <div className="h-full w-full animate-fade-in relative py-6">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={reportData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-border)"
              opacity={0.4}
            />
            <XAxis
              dataKey="_id"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fontWeight: 600,
                fill: "var(--color-text-tertiary)",
              }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 11,
                fontWeight: 600,
                fill: "var(--color-text-tertiary)",
              }}
            />
            <ReTooltip
              contentStyle={{
                backgroundColor: "var(--color-surface)",
                borderRadius: "12px",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xl)",
                padding: "16px",
                fontSize: "13px",
              }}
            />
            {config.chartType === "pie" ? (
              <Pie
                data={reportData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={6}
                dataKey="value"
                nameKey="_id"
                stroke="none"
              >
                {reportData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    cornerRadius={4}
                  />
                ))}
              </Pie>
            ) : config.chartType === "line" ? (
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 5, fill: "var(--color-primary)" }}
                name={METRICS.find((m) => m.id === config.metric)?.label}
              />
            ) : config.chartType === "area" ? (
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-primary)"
                strokeWidth={3}
                fill="var(--color-primary)"
                fillOpacity={0.1}
                name={METRICS.find((m) => m.id === config.metric)?.label}
              />
            ) : (
              <Bar
                dataKey="value"
                fill="var(--color-primary)"
                radius={[8, 8, 0, 0]}
                barSize={40}
                name={METRICS.find((m) => m.id === config.metric)?.label}
              />
            )}
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                paddingTop: "30px",
                fontWeight: 600,
              }}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Parameters Sidebar */}
        <div className="xl:col-span-1 space-y-8">
          <div className="card p-8 bg-surface/50 border-border/60 hover:shadow-lg transition-all group/side relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] text-primary group-hover:scale-110 transition-transform duration-700">
              <Layers size={100} />
            </div>
            <div className="space-y-8 relative z-10">
              {/* Metric Selector */}
              <div>
                <label className="text-[11px] font-black uppercase text-text-tertiary tracking-[0.2em] mb-4 block flex items-center gap-2">
                  <Box size={14} className="text-primary" /> Metrics
                </label>
                <div
                  className="grid grid-cols-1 gap-2"
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {METRICS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setConfig({ ...config, metric: m.id })}
                      style={{
                        padding: "10px",
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        config.metric === m.id
                          ? "bg-primary/5 border-primary text-primary shadow-sm"
                          : "bg-surface hover:bg-surface-hover border-border text-text-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg transition-colors ${config.metric === m.id ? "bg-primary text-white" : "bg-surface-hover text-text-tertiary"}`}
                        >
                          {m.icon}
                        </div>
                        <span className="font-bold text-sm">{m.label}</span>
                      </div>
                      {config.metric === m.id && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension Selector */}
              <div>
                <label className="text-[11px] font-black uppercase text-text-tertiary tracking-[0.2em] mb-4 block flex items-center gap-2">
                  <Cpu size={14} className="text-info" /> Dimensions
                </label>
                <div
                  className="grid grid-cols-1 gap-2"
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setConfig({ ...config, dimension: d.id })}
                      style={{
                        padding: "10px",
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                        config.dimension === d.id
                          ? "bg-info/5 border-info text-info shadow-sm"
                          : "bg-surface hover:bg-surface-hover border-border text-text-secondary"
                      }`}
                    >
                      <span className="font-bold text-sm tracking-tight">
                        {d.label}
                      </span>
                      {config.dimension === d.id && (
                        <div className="w-2 h-2 rounded-full bg-info" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Type Selector */}
              <div>
                <label className="text-[11px] font-black uppercase text-text-tertiary tracking-[0.2em] mb-4 block flex items-center gap-2">
                  <BarIcon size={14} className="text-warning" /> Visualization
                </label>
                <div
                  className="grid grid-cols-4 gap-2"
                  style={{
                    marginTop: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {CHART_TYPES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setConfig({ ...config, chartType: c.id })}
                      className={`h-11 rounded-xl flex items-center justify-center border-2 transition-all ${
                        config.chartType === c.id
                          ? "bg-warning/10 border-warning text-warning shadow-sm"
                          : "bg-surface hover:bg-surface-hover border-border text-text-tertiary"
                      }`}
                      title={c.label}
                    >
                      {c.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={runReport}
              disabled={loading}
              className={`mt-10 py-4 btn btn-primary w-full flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all ${loading ? "opacity-80" : "hover:scale-[1.02]"}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <PlayCircle size={20} />
              )}
              {loading ? "Processing..." : "Run Analysis"}
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-3">
          <div className="card p-8 h-[650px] flex flex-col bg-surface/50 border-border/60 hover:shadow-lg transition-all group/main relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] text-primary group-hover:rotate-[-5deg] transition-transform duration-1000">
              <Layers size={180} />
            </div>
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/40 relative z-10">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-text">
                  Analytics Workspace
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  Insight Status:{" "}
                  <span
                    className={
                      reportData
                        ? "text-success font-bold"
                        : "text-text-tertiary italic"
                    }
                  >
                    {reportData ? "Success" : "Ready"}
                  </span>
                </p>
              </div>
              {reportData && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onDrilldown("Report Data", reportData)}
                    className="btn btn-secondary btn-sm h-10 px-4 gap-2 rounded-lg"
                  >
                    <Save size={14} /> Preserve
                  </button>
                  <button
                    onClick={() => setReportData(null)}
                    className="btn btn-ghost btn-sm h-10 px-4 gap-2 text-danger hover:bg-danger/5 hover:text-danger rounded-lg"
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-h-0 relative z-10">
              {renderChart()}
            </div>

            {reportData && (
              <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                    Real-time Stream Connected
                  </span>
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                  Data Points:{" "}
                  <span className="text-primary ml-1">
                    {reportData.length} instances detected
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
