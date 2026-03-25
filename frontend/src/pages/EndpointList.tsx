import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Code, Copy, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react';
import api from '../api';

interface Endpoint {
  id: number;
  name: string;
  route_name: string;
  http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  model_name: string;
  prompt_template: string;
  created_at: string;
  call_count: number;
}

const methodColors: Record<string, string> = {
  GET: 'bg-blue-500 text-white border-blue-600',
  POST: 'bg-[#6ed451] text-white border-green-600',
  PUT: 'bg-amber-500 text-white border-amber-600',
  PATCH: 'bg-orange-500 text-white border-orange-600',
  DELETE: 'bg-red-500 text-white border-red-600',
};

const EndpointList: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const extractVariables = (template: string): string[] => {
    const regex = /\{([a-zA-Z0-9_-]+)\}/g;
    const vars: string[] = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!vars.includes(match[1])) {
        vars.push(match[1]);
      }
    }
    return vars;
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      const resp = await api.get('/admin/endpoints');
      setEndpoints(resp.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteEndpoint = async (id: number, name: string) => {
    if (window.confirm(`Yakin ingin menghapus API "${name}"?
Penghapusan ini juga akan menghapus log statistik terkait.`)) {
      try {
        await api.delete(`/admin/endpoints/${id}`);
        fetchEndpoints();
      } catch (e) {
        alert("Gagal menghapus endpoint.");
      }
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#6ed451] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat Endpoints...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Endpoints</h1>
          <p className="text-sm text-gray-500 mt-0.5">{endpoints.length} endpoint terdaftar</p>
        </div>
        <Link
          to="/endpoints/create"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg shadow-sm text-white bg-[#6ed451] hover:bg-[#5ec043] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6ed451] transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Buat API Baru
        </Link>
      </div>

      {endpoints.length === 0 ? (
        <div className="text-center bg-white p-10 sm:p-16 rounded-xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Code className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada endpoint</h3>
          <p className="mt-1 text-sm text-gray-500">Mulai dengan membuat API pertama Anda.</p>
          <Link
            to="/endpoints/create"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-[#6ed451] hover:bg-[#5ec043] transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> Buat API Pertama
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {endpoints.map((ep) => {
            const fullUrl = `http://localhost:8000/api/${ep.route_name}`;
            return (
              <div
                key={ep.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#002d72] flex items-center justify-center flex-shrink-0">
                      <ExternalLink className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{ep.name}</h4>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter mt-0.5">
                        Total Panggilan API : {ep.call_count || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg font-mono text-xs text-gray-600 border border-gray-200">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${methodColors[ep.http_method] || methodColors.POST}`}>
                        {ep.http_method || 'POST'}
                      </span>
                      <span className="whitespace-nowrap">/api/{ep.route_name}</span>
                      <button
                        onClick={() => copyToClipboard(fullUrl, ep.id)}
                        className="text-gray-400 hover:text-[#6ed451] focus:outline-none flex-shrink-0 transition-colors"
                        title="Salin URL"
                      >
                        {copiedId === ep.id ? (
                          <CheckCircle2 className="h-4 w-4 text-[#6ed451]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => deleteEndpoint(ep.id, ep.name)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                      title="Hapus API"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Prompt Template</p>
                  <pre className="bg-gray-900 text-gray-200 p-3 rounded-lg text-xs whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto mb-5">
                    {ep.prompt_template}
                  </pre>
                  
                  {/* Endpoint Documentation */}
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center">
                      <Code className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      Dokumentasi Penggunaan
                    </h4>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto shadow-inner border border-gray-800">
                      <div className="text-blue-400 mb-2">// Request Format</div>
                      <div className="flex gap-2 mb-1">
                        <span className="text-pink-400">{ep.http_method}</span>
                        <span className="text-green-400">{fullUrl}</span>
                      </div>
                      
                      {ep.http_method !== 'GET' && ep.http_method !== 'DELETE' && (
                        <div className="text-gray-500 mb-2">Content-Type: application/json</div>
                      )}
                      
                      {(() => {
                        const vars = extractVariables(ep.prompt_template);
                        if (vars.length === 0) {
                          return <div className="text-gray-400 mt-2">{`{}`}</div>;
                        }

                        if (ep.http_method === 'GET' || ep.http_method === 'DELETE') {
                          return (
                            <div className="mt-2 pl-4 border-l-2 border-gray-700">
                              <div className="text-gray-500 mb-1">// Query Parameters:</div>
                              {vars.map(v => (
                                <div key={v}><span className="text-blue-300">?{v}=</span><span className="text-orange-300">value</span></div>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div className="mt-2">
                            <span className="text-yellow-300">{`{`}</span>
                            {vars.map((v, idx) => (
                              <div key={v} className="ml-4">
                                <span className="text-blue-300">"{v}"</span>: <span className="text-orange-300">"string"</span>{idx < vars.length - 1 ? ',' : ''}
                              </div>
                            ))}
                            <span className="text-yellow-300">{`}`}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EndpointList;
