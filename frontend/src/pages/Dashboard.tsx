import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Clock, Coins, Server, TrendingUp, Calendar, Info } from 'lucide-react';
import api from '../api';

interface Stats {
  total_endpoints: number;
  total_calls: number;
  total_tokens: number;
  total_cost: number;
  avg_response_time_ms: number;
}

interface ChartPoint {
  label: string;
  calls: number;
  tokens: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const response = await api.get(`/admin/chart-data?period=${chartPeriod}`);
        setChartData(response.data);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };
    fetchChart();
  }, [chartPeriod]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#6ed451] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat Dashboard...</p>
        </div>
      </div>
    );
  if (!stats)
    return (
      <div className="text-center py-20 text-red-500">Gagal memuat statistik. Pastikan backend menyala.</div>
    );

  const statCards = [
    { id: 'endpoints', title: 'Total Endpoints', value: stats.total_endpoints, icon: Server, gradient: 'from-blue-500 to-blue-600' },
    { 
      id: 'calls', 
      title: 'Panggilan API', 
      value: stats.total_calls, 
      icon: Activity, 
      gradient: 'from-emerald-500 to-emerald-600',
      path: '/endpoints',
      tooltip: 'Detail per API tersedia di menu Endpoints'
    },
    { id: 'tokens', title: 'Token Terpakai', value: stats.total_tokens.toLocaleString(), icon: Coins, gradient: 'from-amber-500 to-amber-600' },
    { id: 'time', title: 'Rata-rata Waktu', value: `${stats.avg_response_time_ms.toFixed(0)} ms`, icon: Clock, gradient: 'from-purple-500 to-purple-600' },
    { id: 'cost', title: 'Estimasi Biaya', value: `$${stats.total_cost.toFixed(4)}`, icon: TrendingUp, gradient: 'from-rose-500 to-rose-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isClickable = !!card.path;
          return (
            <div
              key={card.id || card.title}
              onClick={() => isClickable && navigate(card.path!)}
              className={`group relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all duration-200 ${
                isClickable ? 'cursor-pointer hover:shadow-md hover:border-[#6ed451]/30 active:scale-95' : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider truncate">{card.title}</p>
                    {card.tooltip && (
                      <div className="relative group/tooltip">
                        <Info className="h-3 w-3 text-gray-300 hover:text-emerald-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 text-center shadow-xl">
                          {card.tooltip}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                        </div>
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</h3>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#002d72]" />
            <h2 className="text-base font-bold text-gray-800">
              Penggunaan API — {chartPeriod === 'weekly' ? '7 Hari Terakhir' : '12 Bulan Terakhir'}
            </h2>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setChartPeriod('weekly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                chartPeriod === 'weekly'
                  ? 'bg-[#002d72] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setChartPeriod('monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                chartPeriod === 'monthly'
                  ? 'bg-[#002d72] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '13px',
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'calls') return [value, 'Panggilan'];
                  if (name === 'tokens') return [value, 'Token'];
                  return [value, name];
                }}
              />
              <Bar dataKey="calls" fill="#002d72" radius={[6, 6, 0, 0]} name="calls" />
              <Bar dataKey="tokens" fill="#6ed451" radius={[6, 6, 0, 0]} name="tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#002d72]" /> Panggilan API
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#6ed451]" /> Token Digunakan
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
