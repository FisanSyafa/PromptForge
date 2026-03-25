import React, { useState, useEffect } from 'react';
import { Play, Activity, Sparkles } from 'lucide-react';
import api from '../api';

interface EndpointInfo {
  id: number;
  name: string;
  route_name: string;
  http_method: HttpMethod;
  prompt_template: string;
}

// Extract {variable} names from a prompt template string
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

// Label map
const friendlyLabel: Record<string, string> = {
  text: 'Teks Input',
  language: 'Bahasa Tujuan',
  topic: 'Topik',
  question: 'Pertanyaan',
  context: 'Konteks',
  schema: 'Skema Tabel',
  kebutuhan: 'Permintaan / Kebutuhan',
  keys: 'Field yang Diekstrak',
  ticket_text: 'Teks Tiket',
};

// Placeholder map
const friendlyPlaceholder: Record<string, string> = {
  text: 'Masukkan teks di sini...',
  language: 'Inggris',
  topic: 'teknologi',
  question: 'Masukkan pertanyaan...',
  context: 'Masukkan konteks...',
  schema: 'CREATE TABLE users (id SERIAL, name VARCHAR);',
  kebutuhan: 'Tampilkan semua user',
  keys: 'nama, alamat, total_harga',
  ticket_text: 'Aplikasi saya tidak bisa login...',
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const TestConsole: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointInfo[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [currentVars, setCurrentVars] = useState<string[]>([]);
  const [httpMethod, setHttpMethod] = useState<HttpMethod>('POST');

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const resp = await api.get('/admin/endpoints');
        setEndpoints(resp.data);
        if (resp.data.length > 0) {
          selectEndpoint(resp.data[0]);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchEndpoints();
  }, []);

  const selectEndpoint = (ep: EndpointInfo) => {
    setSelectedEndpoint(ep.route_name);
    setHttpMethod(ep.http_method || 'POST');
    const vars = extractVariables(ep.prompt_template);
    setCurrentVars(vars);
    const newFields: Record<string, string> = {};
    vars.forEach((v) => {
      newFields[v] = '';
    });
    setFields(newFields);
  };

  const handleEndpointChange = (routeName: string) => {
    const ep = endpoints.find((e) => e.route_name === routeName);
    if (ep) selectEndpoint(ep);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    setTimeTaken(null);

    const start = performance.now();
    try {
      let resp;
      const url = `/api/${selectedEndpoint}`;

      if (httpMethod === 'GET' || httpMethod === 'DELETE') {
        // Send as query params
        const params = new URLSearchParams(fields).toString();
        resp = await api({ method: httpMethod.toLowerCase(), url: `${url}?${params}` });
      } else {
        // Send as JSON body
        resp = await api({ method: httpMethod.toLowerCase(), url, data: fields });
      }
      setResponse(resp.data);
    } catch (e: any) {
      setResponse(e.response?.data || { error: e.message });
    } finally {
      const end = performance.now();
      setTimeTaken(end - start);
      setLoading(false);
    }
  };

  const allFieldsFilled = currentVars.every((v) => fields[v]?.trim() !== '');

  const methodColors: Record<HttpMethod, string> = {
    GET: 'bg-blue-500',
    POST: 'bg-[#6ed451]',
    PUT: 'bg-amber-500',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Konsol Uji API</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pilih endpoint, metode HTTP, dan isi parameter untuk menguji</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Request Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Activity className="mr-2 h-5 w-5 text-[#002d72]" /> Request
          </h2>

          <div className="space-y-4 flex-1 flex flex-col">
            {/* Endpoint Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Endpoint</label>
              <select
                value={selectedEndpoint}
                onChange={(e) => handleEndpointChange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 border-gray-300 focus:outline-none focus:ring-[#002d72] focus:border-[#002d72] text-sm rounded-lg border bg-gray-50"
              >
                {endpoints.map((ep) => (
                  <option key={ep.id} value={ep.route_name}>
                    {ep.name} (/api/{ep.route_name})
                  </option>
                ))}
              </select>
            </div>

            {/* HTTP Method Badge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode HTTP</label>
              <div className="flex gap-2">
                <span
                  className={`px-4 py-2 text-xs font-bold rounded-lg shadow-sm text-white ${methodColors[httpMethod]}`}
                >
                  {httpMethod}
                </span>
                <span className="flex items-center text-xs text-gray-400 italic">
                  * Ditentukan saat pembuatan API
                </span>
              </div>
            </div>

            {/* Dynamic Input Fields */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[#6ed451]" />
                <span className="text-sm font-semibold text-gray-600">Parameter Input</span>
              </div>
              {currentVars.map((varName) => {
                const label = friendlyLabel[varName] || varName;
                const placeholder = friendlyPlaceholder[varName] || `Masukkan ${varName}...`;
                const isLong = ['schema', 'text', 'ticket_text', 'kebutuhan', 'context'].includes(varName);
                return (
                  <div key={varName}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    {isLong ? (
                      <textarea
                        value={fields[varName] || ''}
                        onChange={(e) => handleFieldChange(varName, e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm focus:ring-[#002d72] focus:border-[#002d72]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fields[varName] || ''}
                        onChange={(e) => handleFieldChange(varName, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-[#002d72] focus:border-[#002d72]"
                      />
                    )}
                  </div>
                );
              })}
              {httpMethod === 'GET' && (
                <p className="text-xs text-gray-400 italic">* Parameter akan dikirim sebagai query string untuk metode GET</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleTest}
              disabled={loading || !selectedEndpoint || !allFieldsFilled}
              className={`w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white ${methodColors[httpMethod]} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6ed451] disabled:opacity-50 transition-all`}
            >
              {loading ? (
                'Mengeksekusi...'
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" /> {httpMethod} Request
                </>
              )}
            </button>
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 p-5 sm:p-6 flex flex-col min-h-[300px] lg:min-h-[500px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Response</h2>
            {timeTaken !== null && (
              <span className="text-xs font-mono bg-gray-800 text-green-400 px-2 py-1 rounded border border-gray-700">
                {timeTaken.toFixed(0)} ms
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-black rounded-lg p-3 sm:p-4 border border-gray-700">
            <pre className="text-gray-300 font-mono text-xs sm:text-sm whitespace-pre-wrap break-words">
              {response ? JSON.stringify(response, null, 2) : 'Menunggu request...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConsole;
