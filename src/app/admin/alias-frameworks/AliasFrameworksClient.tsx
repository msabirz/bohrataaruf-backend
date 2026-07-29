'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, Play, Pause, Save, X } from 'lucide-react';

interface Framework {
  id: string;
  frameworkName: string;
  genderRoute: 'MALE' | 'FEMALE' | 'NEUTRAL';
  prefixes: string[];
  suffixes: string[];
  active: boolean;
  createdAt: string;
}

interface UploadedFramework {
  framework_name: string;
  gender_route: 'MALE' | 'FEMALE' | 'NEUTRAL';
  prefixes: string[];
  suffixes: string[];
}

export default function AliasFrameworksClient() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<UploadedFramework[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/admin/alias-frameworks');
      if (res.ok) {
        const data = await res.json();
        setFrameworks(data.frameworks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setValidationError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        validateJson(json);
      } catch (err) {
        setValidationError('Invalid JSON file.');
      }
    };
    reader.readAsText(selected);
  };

  const validateJson = (data: any) => {
    if (!Array.isArray(data)) {
      setValidationError('JSON must be an array of frameworks.');
      return;
    }
    if (data.length > 5) {
      setValidationError('Maximum 5 frameworks allowed per upload.');
      return;
    }

    const wordRegex = /^[A-Za-z\s]+$/;

    for (let i = 0; i < data.length; i++) {
      const fw = data[i];
      if (!fw.framework_name || typeof fw.framework_name !== 'string') {
        return setValidationError(`Framework at index ${i} is missing a valid framework_name.`);
      }
      if (!['MALE', 'FEMALE', 'NEUTRAL'].includes(fw.gender_route)) {
        return setValidationError(`Framework "${fw.framework_name}" has invalid gender_route.`);
      }
      if (!Array.isArray(fw.prefixes) || fw.prefixes.length === 0) {
        return setValidationError(`Framework "${fw.framework_name}" needs an array of prefixes.`);
      }
      if (!Array.isArray(fw.suffixes) || fw.suffixes.length === 0) {
        return setValidationError(`Framework "${fw.framework_name}" needs an array of suffixes.`);
      }

      // Check words
      const prefixSet = new Set<string>();
      for (const p of fw.prefixes) {
        if (typeof p !== 'string' || p.trim() === '') return setValidationError(`Empty prefix found in "${fw.framework_name}".`);
        if (!wordRegex.test(p)) return setValidationError(`Prefix "${p}" contains invalid characters (only letters/spaces allowed).`);
        if (prefixSet.has(p.toLowerCase())) return setValidationError(`Duplicate prefix "${p}" in "${fw.framework_name}".`);
        prefixSet.add(p.toLowerCase());
      }

      const suffixSet = new Set<string>();
      for (const s of fw.suffixes) {
        if (typeof s !== 'string' || s.trim() === '') return setValidationError(`Empty suffix found in "${fw.framework_name}".`);
        if (!wordRegex.test(s)) return setValidationError(`Suffix "${s}" contains invalid characters (only letters/spaces allowed).`);
        if (suffixSet.has(s.toLowerCase())) return setValidationError(`Duplicate suffix "${s}" in "${fw.framework_name}".`);
        suffixSet.add(s.toLowerCase());
      }
    }

    setParsedData(data);
  };

  const handleUpload = async () => {
    if (!parsedData) return;
    setIsUploading(true);
    try {
      const res = await fetch('/api/admin/alias-frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });
      if (res.ok) {
        setFile(null);
        setParsedData(null);
        fetchFrameworks();
      } else {
        const error = await res.json();
        setValidationError(error.error || 'Upload failed');
      }
    } catch (e) {
      setValidationError('Upload failed due to network error.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setFrameworks(frameworks.map(f => f.id === id ? { ...f, active: !currentStatus } : f));
      await fetch('/api/admin/alias-frameworks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentStatus }),
      });
    } catch (e) {
      fetchFrameworks(); // revert
    }
  };

  const generateSamples = (fw: UploadedFramework) => {
    const samples = [];
    for(let i = 0; i < 3; i++) {
      const p = fw.prefixes[Math.floor(Math.random() * fw.prefixes.length)];
      const s = fw.suffixes[Math.floor(Math.random() * fw.suffixes.length)];
      samples.push(`${p} ${s}`);
    }
    return samples;
  };

  const totalActiveCombinations = frameworks
    .filter(f => f.active)
    .reduce((acc, f) => acc + (f.prefixes.length * f.suffixes.length), 0);

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload New Frameworks</h2>
        
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowSample(!showSample)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1.5 focus:outline-none"
          >
            <span>{showSample ? 'Hide sample JSON schema' : 'View sample JSON schema & guidelines'}</span>
          </button>
          
          {showSample && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 space-y-3">
              <div className="font-sans text-sm text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Schema Requirements:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Must be a JSON array of up to 5 framework objects.</li>
                  <li><code className="bg-slate-200 px-1 rounded">gender_route</code> must be <code className="bg-slate-200 px-1 rounded">'MALE'</code>, <code className="bg-slate-200 px-1 rounded">'FEMALE'</code>, or <code className="bg-slate-200 px-1 rounded">'NEUTRAL'</code>.</li>
                  <li>Words should contain only alphabetic letters and spaces. Keep lists varied and descriptive to ensure meaningful and dignified two-word combinations.</li>
                </ul>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto">
{`[
  {
    "framework_name": "Creative Architect",
    "gender_route": "NEUTRAL",
    "prefixes": ["Creative", "Thoughtful", "Diligent", "Astute"],
    "suffixes": ["Architect", "Scholar", "Educator", "Innovator"]
  },
  {
    "framework_name": "Valiant Explorer",
    "gender_route": "MALE",
    "prefixes": ["Valiant", "Noble", "Steadfast"],
    "suffixes": ["Explorer", "Pioneer", "Leader"]
  }
]`}
              </pre>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <input 
            type="file" 
            accept=".json" 
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          {parsedData && (
            <button 
              onClick={handleUpload} 
              disabled={isUploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              <Save size={16} />
              {isUploading ? 'Saving...' : 'Confirm & Save'}
            </button>
          )}
        </div>

        {validationError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md flex gap-2 items-start text-sm">
            <AlertCircle size={16} className="mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {parsedData && (
          <div className="mt-6 space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Preview</h3>
            {parsedData.map((fw, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">{fw.framework_name}</h4>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {fw.gender_route}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 font-medium">
                      {(fw.prefixes.length * fw.suffixes.length).toLocaleString()} Combinations
                    </div>
                    <div className="text-xs text-gray-500">
                      ({fw.prefixes.length} prefixes × {fw.suffixes.length} suffixes)
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Samples: </span>
                  <span className="text-indigo-600 font-medium">
                    {generateSamples(fw).join(' • ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List Section */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Active Frameworks</h2>
          <div className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
            {totalActiveCombinations.toLocaleString()} Total Active Combinations
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading frameworks...</div>
        ) : frameworks.length === 0 ? (
          <div className="py-8 text-center text-gray-500 border border-dashed rounded-lg">No frameworks uploaded yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {frameworks.map(fw => (
              <div key={fw.id} className={`p-5 rounded-lg border ${fw.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`font-semibold ${fw.active ? 'text-gray-900' : 'text-gray-600'}`}>
                      {fw.frameworkName}
                    </h3>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md mt-1 inline-block">
                      {fw.genderRoute}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleActive(fw.id, fw.active)}
                    className={`p-1.5 rounded-md flex items-center justify-center ${fw.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                    title={fw.active ? "Deactivate" : "Activate"}
                  >
                    {fw.active ? <CheckCircle2 size={20} /> : <Pause size={20} />}
                  </button>
                </div>
                
                <div className="flex justify-between items-end text-sm pt-2 border-t border-gray-100 mt-4">
                  <div className="text-gray-500 space-y-1">
                    <div>Prefixes: {fw.prefixes.length} • Suffixes: {fw.suffixes.length}</div>
                    <button
                      onClick={() => setSelectedFramework(fw)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline focus:outline-none block"
                    >
                      View Stored Word Lists
                    </button>
                  </div>
                  <div className="font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs">
                    {(fw.prefixes.length * fw.suffixes.length).toLocaleString()} combos
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedFramework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">{selectedFramework.frameworkName}</h3>
                  <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                    {selectedFramework.genderRoute}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${selectedFramework.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {selectedFramework.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Total {(selectedFramework.prefixes.length * selectedFramework.suffixes.length).toLocaleString()} potential two-word combinations
                </p>
              </div>
              <button
                onClick={() => setSelectedFramework(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prefixes Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="font-semibold text-gray-800 text-sm">Prefixes</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded">
                    {selectedFramework.prefixes.length} words
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[350px] overflow-y-auto p-1">
                  {selectedFramework.prefixes.map((word, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-medium border border-gray-200">
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Suffixes Column */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="font-semibold text-gray-800 text-sm">Suffixes</h4>
                  <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded">
                    {selectedFramework.suffixes.length} words
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[350px] overflow-y-auto p-1">
                  {selectedFramework.suffixes.map((word, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-indigo-50 text-indigo-900 rounded-md text-xs font-medium border border-indigo-100">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedFramework(null)}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
