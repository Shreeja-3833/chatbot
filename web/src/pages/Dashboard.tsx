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
  <div
    style={{
      flex: "1 1 160px",
      background: "#fff",
      borderRadius: "12px",
      padding: "16px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}
  >
    <div style={{ fontSize: "13px", color: "#666" }}>{title}</div>
    <div style={{ fontSize: "26px", fontWeight: 700, color: "#111" }}>
      {value}
    </div>
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
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111" }}>
          Metrics Dashboard
        </h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={window}
            onChange={(e) => setWindow(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#fff",
              color: "black",
            }}
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
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #007bff",
              background: "#fff",
              color: "#007bff",
              cursor: "pointer",
            }}
          >
            Back to chat
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "#666" }}>Loading…</p>}

      {summary && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
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

          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              margin: "24px 0 12px",
              color: "#111",
            }}
          >
            Per-model breakdown
          </h2>
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#666" }}>
                  <th style={{ padding: "8px" }}>Model</th>
                  <th style={{ padding: "8px" }}>Requests</th>
                  <th style={{ padding: "8px" }}>Errors</th>
                  <th style={{ padding: "8px" }}>Avg latency</th>
                  <th style={{ padding: "8px" }}>Tokens</th>
                </tr>
              </thead>
              <tbody>
                {summary.models.length === 0 && (
                  <tr>
                    <td style={{ padding: "8px", color: "#999" }} colSpan={5}>
                      No data in this window yet.
                    </td>
                  </tr>
                )}
                {summary.models.map((m) => (
                  <tr key={m.model_name} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "8px", color: "#111" }}>{m.model_name}</td>
                    <td style={{ padding: "8px", color: "#111" }}>
                      <div
                        style={{
                          background: "#e6efff",
                          borderRadius: "4px",
                          width: `${(m.requests / maxReq) * 100}%`,
                          minWidth: "24px",
                          padding: "2px 6px",
                          color: "#0050c8",
                        }}
                      >
                        {m.requests}
                      </div>
                    </td>
                    <td style={{ padding: "8px", color: m.errors ? "#c0392b" : "#111" }}>
                      {m.errors}
                    </td>
                    <td style={{ padding: "8px", color: "#111" }}>
                      {m.avg_latency_ms != null ? `${m.avg_latency_ms} ms` : "—"}
                    </td>
                    <td style={{ padding: "8px", color: "#111" }}>{m.total_tokens}</td>
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
