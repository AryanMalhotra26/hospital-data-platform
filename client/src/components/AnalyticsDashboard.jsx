/**
 * AnalyticsDashboard — fetches the pre-aggregated numbers from
 * GET /api/analytics/overview and renders them with Recharts.
 *
 * Note there is NO data crunching here: the SQL already did the GROUP BY/COUNT.
 * The frontend only maps codes to labels and picks colors. (Admin sees global
 * figures; a doctor sees the same charts scoped to their own data.)
 */

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABELS } from '../utils/format';
import { diagnosisLabel } from '../constants/diagnoses';

// Status colors match the pill colors used on the Appointments page.
const STATUS_COLORS = {
  scheduled: '#2563eb',
  completed: '#12b76a',
  cancelled: '#f04438',
  no_show: '#f79009',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-06" -> "Jun '26"
const formatMonth = (m) => {
  const [y, mm] = m.split('-');
  return `${MONTHS[Number(mm) - 1]} '${y.slice(2)}`;
};

export default function AnalyticsDashboard() {
  const { authFetch, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch('/analytics/overview');
        if (active) setData(res.data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authFetch]);

  if (loading) return <div className="placeholder">Loading analytics…</div>;
  if (error) return <div className="alert alert--error">{error}</div>;

  const statusData = data.statusBreakdown.map((s) => ({
    name: STATUS_LABELS[s.status],
    value: s.count,
    status: s.status,
  }));
  const totalAppts = data.statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="analytics-grid">
      {/* 1. Appointments per month — line chart */}
      <div className="chart-card">
        <h3 className="chart-card__title">Appointments per month</h3>
        <p className="chart-card__sub">Last 12 months{data.scope === 'doctor' ? ' (your appointments)' : ''}</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.appointmentsByMonth} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
            <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip labelFormatter={formatMonth} />
            <Line type="monotone" dataKey="count" name="Appointments" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 2. Patients by department — horizontal bar chart */}
      <div className="chart-card">
        <h3 className="chart-card__title">Patients by department</h3>
        <p className="chart-card__sub">Distinct patients seen per department</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.patientsByDepartment} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
            <XAxis type="number" allowDecimals={false} fontSize={12} />
            <YAxis type="category" dataKey="department" width={104} fontSize={11} />
            <Tooltip />
            <Bar dataKey="patientCount" name="Patients" fill="#7c3aed" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 3. Status breakdown — pie chart */}
      <div className="chart-card">
        <h3 className="chart-card__title">Appointment status</h3>
        <p className="chart-card__sub">{totalAppts} appointments total</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`} labelLine={false}>
              {statusData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Top diagnoses — table */}
      <div className="chart-card">
        <h3 className="chart-card__title">Top diagnoses</h3>
        <p className="chart-card__sub">By frequency across visits</p>
        <table className="table table--compact">
          <thead>
            <tr>
              <th>Code</th>
              <th>Diagnosis</th>
              <th className="num">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.topDiagnoses.map((d) => (
              <tr key={d.diagnosisCode}>
                <td className="mono">{d.diagnosisCode}</td>
                <td>{diagnosisLabel(d.diagnosisCode)}</td>
                <td className="num">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
