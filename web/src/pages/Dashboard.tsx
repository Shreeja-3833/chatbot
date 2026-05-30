import axios from "axios";
import { useEffect, useState } from "react";
import { API_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";

type ModelStat = {
  model_name: string;
  requests: number;
  errors: number;
  total_tokens: number;
  avg_latency_ms: number | null;
};

type Summary = {
  window_minutes: number;
  total_requests: number;
  success: number;
  errors: number;
  error_rate: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  throughput_per_min: number;
  models: ModelStat[];
};

const WINDOWS = [
  { label: "Last 1h", value: 60 },
  { label: "Last 6h", value: 360 },
  { label: "Last 24h", value: 1440 },
];

const Card = ({ title, value }: { title: string; value: string }) => (
  <div className="flex-[1_1_160px] bg-white rounded-xl p-4 shadow-sm">
    <div className="text-[13px] text-[#666]">{title}</div>
    <div className="text-[26px] font-bold text-[#111]">{value}</div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [window, setWindow] = useState(60);
  const [loading, setLoading] = useState(false);

  const load = async (w: number) => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL + "metrics/summary", {
        params: { window: w },
        withCredentials: true,
      });
      setSummary(res.data);
    } catch (err: any) {
      if (err?.response?.status === 401) navigate("/login");
      else console.error(err, "couldn't load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(window);
  }, [window]);

  const maxReq = summary?.models.reduce((m, s) => Math.max(m, s.requests), 0) || 1;

  return (
    <div className="min-h-screen bg-[#f0f2f5] p-6 box-border">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-bold text-[#111]">Metrics Dashboard</h1>
        <div className="flex gap-2 items-center">
          <select
            value={window}
            onChange={(e) => setWindow(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-[#ddd] bg-white text-black"
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="px-3.5 py-1.5 rounded-lg border border-[#007bff] bg-white text-[#007bff] cursor-pointer"
          >
            Back to chat
          </button>
        </div>
      </div>

      {loading && <p className="text-[#666]">Loading…</p>}

      {summary && (
        <>
          <div className="flex flex-wrap gap-3">
            <Card title="Total requests" value={String(summary.total_requests)} />
            <Card
              title="Throughput"
              value={`${summary.throughput_per_min}/min`}
            />
            <Card
              title="Avg latency"
              value={summary.avg_latency_ms != null ? `${summary.avg_latency_ms} ms` : "—"}
            />
            <Card
              title="p95 latency"
              value={summary.p95_latency_ms != null ? `${summary.p95_latency_ms} ms` : "—"}
            />
            <Card
              title="Errors"
              value={`${summary.errors} (${(summary.error_rate * 100).toFixed(1)}%)`}
            />
          </div>

          <h2 className="text-base font-semibold mt-6 mb-3 text-[#111]">
            Per-model breakdown
          </h2>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[#666]">
                  <th className="p-2">Model</th>
                  <th className="p-2">Requests</th>
                  <th className="p-2">Errors</th>
                  <th className="p-2">Avg latency</th>
                  <th className="p-2">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {summary.models.length === 0 && (
                  <tr>
                    <td className="p-2 text-[#999]" colSpan={5}>
                      No data in this window yet.
                    </td>
                  </tr>
                )}
                {summary.models.map((m) => (
                  <tr key={m.model_name} className="border-t border-[#eee]">
                    <td className="p-2 text-[#111]">{m.model_name}</td>
                    <td className="p-2 text-[#111]">
                      <div
                        className="bg-[#e6efff] rounded min-w-[24px] px-1.5 py-0.5 text-[#0050c8]"
                        style={{ width: `${(m.requests / maxReq) * 100}%` }}
                      >
                        {m.requests}
                      </div>
                    </td>
                    <td className={`p-2 ${m.errors ? "text-[#c0392b]" : "text-[#111]"}`}>
                      {m.errors}
                    </td>
                    <td className="p-2 text-[#111]">
                      {m.avg_latency_ms != null ? `${m.avg_latency_ms} ms` : "—"}
                    </td>
                    <td className="p-2 text-[#111]">{m.total_tokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
