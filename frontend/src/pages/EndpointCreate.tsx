import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, Zap, Sparkles, Loader2 } from 'lucide-react';
import api from '../api';

const EndpointCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formGenerated, setFormGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatorModel, setGeneratorModel] = useState('gemini-2.5-flash');
  const [formData, setFormData] = useState({
    name: '',
    route_name: '',
    http_method: 'POST',
    prompt_template: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const resp = await api.post('/admin/generate-endpoint', {
        description: aiPrompt,
        model_name: generatorModel
      });
      const data = resp.data;
      setFormData({
        name: data.name || '',
        route_name: data.route_name || '',
        http_method: data.http_method || 'POST',
        prompt_template: data.prompt_template || '',
      });
      setFormGenerated(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal menggunakan AI untuk generate API');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/admin/endpoints', formData);
      navigate('/endpoints');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Terjadi kesalahan saat membuat endpoint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buat API Baru</h1>
        <p className="text-sm text-gray-500 mt-1">Gunakan kecerdasan AI untuk merancang endpoint Anda secara otomatis.</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 border-l-4 border-red-500 shadow-sm animate-in fade-in slide-in-from-top-1">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <h3 className="ml-3 text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        )}

        {/* AI Auto-Generate Box */}
        <div className="p-6 bg-gradient-to-br from-[#002d72]/10 via-[#002d72]/5 to-transparent rounded-2xl border border-[#002d72]/20 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-[#002d72]/5">
            <Sparkles className="h-32 w-32" />
          </div>
          <div className="relative">
            <label className="flex items-center text-lg font-bold text-[#002d72] mb-3">
              <Sparkles className="h-5 w-5 mr-2 text-[#6ed451]" />
              Buat API Baru dengan Prompt
            </label>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed max-w-2xl">
              Jelaskan API seperti apa yang Anda butuhkan (misal: <em>"Buatkan saya API untuk mengekstrak informasi tiket pesawat"</em>). Pilih model AI yang akan membantu merancang strukturnya.
            </p>

            <div className="grid gap-5">
              <div className="sm:max-w-xs">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Model AI</label>
                <select
                  value={generatorModel}
                  onChange={(e) => setGeneratorModel(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg py-2.5 px-3 border shadow-sm focus:ring-[#002d72] focus:border-[#002d72] bg-white transition-all"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                  <option value="ollama">Ollama (Llama 3.1)</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Deskripsikan API AI yang Anda inginkan..."
                  className="flex-1 text-sm border-gray-300 rounded-lg py-3 px-4 border shadow-sm focus:ring-[#002d72] focus:border-[#002d72] bg-white placeholder-gray-400"
                  onKeyDown={(e) => e.key === 'Enter' && !generating && handleGenerateAI()}
                />
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={generating || !aiPrompt.trim()}
                  className="flex-shrink-0 flex items-center justify-center px-6 py-3 bg-[#002d72] text-white rounded-lg text-sm font-bold shadow-md hover:bg-[#001d4a] transition-all disabled:opacity-50 transform active:scale-95"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sedang Membuat...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2 text-[#6ed451]" /> Buat API</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {formGenerated && (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Validasi, Edit jika diperlukan, dan Simpan API</h2>
              <span className="px-3 py-1 bg-green-50 text-[#6ed451] text-[10px] font-bold rounded-full border border-[#6ed451]/20">Diterjemahkan oleh AI</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Nama API</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full text-sm border-gray-300 rounded-lg py-3 px-4 border shadow-sm focus:ring-[#002d72] focus:border-[#002d72]"
                  />
                </div>

                <div>
                  <label htmlFor="route_name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">URL Route</label>
                  <div className="flex rounded-lg shadow-sm group">
                    <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-400 text-xs font-mono">
                      /api/
                    </span>
                    <input
                      type="text"
                      name="route_name"
                      id="route_name"
                      required
                      value={formData.route_name}
                      onChange={handleChange}
                      className="flex-1 block w-full px-4 py-3 rounded-none rounded-r-lg focus:ring-[#002d72] focus:border-[#002d72] text-sm border-gray-300 border font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="http_method" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Metode HTTP</label>
                  <select
                    id="http_method"
                    name="http_method"
                    value={formData.http_method}
                    onChange={handleChange}
                    className="block w-full py-3 px-4 border-gray-300 focus:ring-[#002d72] focus:border-[#002d72] text-sm rounded-lg border font-bold text-[#002d72]"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="prompt_template" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Prompt Template (Logika API)</label>
              <textarea
                id="prompt_template"
                name="prompt_template"
                rows={6}
                required
                value={formData.prompt_template}
                onChange={handleChange}
                className="block w-full text-sm border border-gray-300 rounded-lg p-4 font-mono leading-relaxed focus:ring-[#002d72] focus:border-[#002d72] bg-gray-50"
              />
              <p className="mt-3 text-[10px] text-gray-400 italic">
                Sistem secara otomatis mendeteksi variabel dalam kurung kurawal <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600 font-bold ">{`{seperti_ini}`}</code>.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/endpoints')}
                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-10 py-3 text-sm font-bold rounded-xl shadow-lg text-white bg-[#6ed451] hover:bg-[#5ec043] focus:outline-none focus:ring-4 focus:ring-[#6ed451]/30 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Menyetujui...</>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Simpan API
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EndpointCreate;
