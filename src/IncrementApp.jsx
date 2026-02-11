import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowRight, Upload, TrendingUp, Download } from 'lucide-react';

// Increment Logo Component
const IncrementLogo = ({ size = 'default' }) => {
  const sizes = {
    small: { container: 'h-8', text: 'text-xl' },
    default: { container: 'h-10', text: 'text-2xl' },
    large: { container: 'h-16', text: 'text-4xl' }
  };
  
  const s = sizes[size];
  
  return (
    <div className="flex items-center gap-3">
      <div className={`${s.container} aspect-square bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md`}>
        <TrendingUp className="w-[60%] h-[60%] text-white" strokeWidth={2.5} />
      </div>
      <span className={`${s.text} font-semibold text-gray-900 tracking-tight`}>
        Increment
      </span>
    </div>
  );
};

const IncrementApp = () => {
  const [page, setPage] = useState('welcome');
  const [view, setView] = useState('composition');
  const [activeModel, setActiveModel] = useState('mmm');
  const [dateRange, setDateRange] = useState('all');
  const [hiddenChannels, setHiddenChannels] = useState([]);
  const [mmmData, setMmmData] = useState(null);
  const [attributionData, setAttributionData] = useState(null);
  const [spendData, setSpendData] = useState(null);
  const [comparisonMetric, setComparisonMetric] = useState('volume');

  // Parse CSV helper
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim();
      });
      data.push(row);
    }
    
    return data;
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          
          if (type === 'spend') {
            // Parse CSV for spend data
            const csvData = parseCSV(content);
            const processedSpend = {};
            
            csvData.forEach(row => {
              const channel = row['Channels'] || row['Channel'];
              if (channel && channel !== 'Total') {
                processedSpend[channel] = {
                  spend: parseFloat(row['Total Spend ($)']) || 0,
                  revenue: parseFloat(row['Total Revenue  ($)'] || row['Total Revenue ($)']) || 0,
                  roi: parseFloat(row['Total ROI (%)']) || 0
                };
              }
            });
            
            setSpendData(processedSpend);
            console.log('Spend data loaded:', processedSpend);
          } else {
            // Handle JSON or CSV for MMM/Attribution
            let data;
            if (file.name.endsWith('.json')) {
              data = JSON.parse(content);
            } else if (file.name.endsWith('.csv')) {
              // Parse CSV and convert to the format we need
              const csvData = parseCSV(content);
              data = csvData;
            }
            
            if (type === 'mmm') {
              setMmmData(data);
              if (attributionData && spendData) setPage('app');
            } else {
              setAttributionData(data);
              if (mmmData && spendData) setPage('app');
            }
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          alert('Error parsing file: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const getChannels = () => {
    if (!mmmData || mmmData.length === 0) return [];
    return Object.keys(mmmData[0]).filter(k => 
      k !== 'date' && k !== 'baseline' && k !== 'unattributed'
    );
  };

  const channels = getChannels();
  
  // Performance channels (exclude TV, Youtube, BVOD, unattributed, baseline for legend)
  const performanceChannels = channels.filter(ch => 
    !['Youtube', 'Fta Tv', 'Bvod', 'SVOD', 'TV'].includes(ch)
  );
  
  // Filtered channels for legend based on model
  const legendChannels = activeModel === 'mmm' ? channels : performanceChannels;
  
  const filterDataByDateRange = (data) => {
    if (!data || dateRange === 'all') return data;
    
    const dataLength = data.length;
    let itemsToShow;
    
    switch(dateRange) {
      case 'last-3m':
        itemsToShow = Math.min(13, dataLength);
        break;
      case 'last-6m':
        itemsToShow = Math.min(26, dataLength);
        break;
      case 'last-12m':
        itemsToShow = Math.min(52, dataLength);
        break;
      case 'ytd':
        itemsToShow = Math.min(Math.ceil(dataLength / 2), dataLength);
        break;
      default:
        return data;
    }
    
    return data.slice(-itemsToShow);
  };

  const filteredMmmData = filterDataByDateRange(mmmData);
  const filteredAttributionData = filterDataByDateRange(attributionData);
  const displayData = activeModel === 'mmm' ? filteredMmmData : filteredAttributionData;

  const mmmColors = {
    baseline: '#000000',
    unattributed: '#0066FF',
    marketing: ['#00C8C8', '#4ECDC4', '#00A896', '#028090', '#05668D', '#0D7C8A', '#15909F'],
  };

  const attributionColors = {
    baseline: '#000000',
    unattributed: '#0066FF',
    marketing: ['#EC4899', '#F472B6', '#FB923C', '#FBBF24', '#A855F7', '#C084FC', '#F97316'],
  };

  const categoryColors = activeModel === 'mmm' ? mmmColors : attributionColors;

  // Toggle channel visibility - now isolates on click
  const toggleChannel = (channel) => {
    if (hiddenChannels.length === 0) {
      // If nothing is hidden, hide everything except this channel
      const allChannels = ['baseline', ...channels, 'unattributed'];
      setHiddenChannels(allChannels.filter(c => c !== channel));
    } else if (hiddenChannels.includes(channel)) {
      // If this channel is hidden, show only this channel
      const allChannels = ['baseline', ...channels, 'unattributed'];
      setHiddenChannels(allChannels.filter(c => c !== channel));
    } else {
      // If this channel is showing, toggle to show all
      setHiddenChannels([]);
    }
  };

  const showAll = () => {
    setHiddenChannels([]);
  };

  // Custom Legend with click handlers
  const CustomLegend = ({ payload }) => {
    const filteredPayload = payload.filter(entry => {
      // Filter out non-performance channels from legend when in attribution mode
      if (activeModel === 'attribution') {
        if (entry.dataKey === 'baseline' || entry.dataKey === 'unattributed') return false;
        if (['Youtube', 'Fta Tv', 'Bvod', 'SVOD', 'TV'].includes(entry.dataKey)) return false;
      }
      return true;
    });

    return (
      <div className="pt-6">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-3">
          {filteredPayload.map((entry, index) => {
            const isOnlyVisible = hiddenChannels.length > 0 && !hiddenChannels.includes(entry.dataKey);
            const isHidden = hiddenChannels.includes(entry.dataKey);
            return (
              <div
                key={index}
                onClick={() => toggleChannel(entry.dataKey)}
                className={`flex items-center gap-2 cursor-pointer transition-all px-3 py-1 rounded ${
                  isOnlyVisible 
                    ? 'bg-blue-50 ring-2 ring-blue-500' 
                    : isHidden 
                    ? 'opacity-30' 
                    : 'opacity-100 hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700 font-medium">{entry.value}</span>
              </div>
            );
          })}
        </div>
        {hiddenChannels.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={showAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-4 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
            >
              Show All
            </button>
          </div>
        )}
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-md p-3 shadow-lg text-xs">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                <span className="text-gray-700">{entry.name}</span>
              </div>
              <span className="font-medium text-gray-900">
                {entry.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (page === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 font-sans">
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <IncrementLogo size="default" />
          </div>
        </nav>

        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 gap-16 items-center min-h-[calc(100vh-80px)] py-20">
            <div>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full px-4 py-2 mb-8">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-gray-800">Now in Public Beta</span>
              </div>
              
              <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Reconcile MMM vs{' '}
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Attribution
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-xl">
                See where attribution models over-credit channels by comparing against 
                Marketing Mix Modeling. Understand your true incrementality and optimize 
                marketing spend with confidence.
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPage('upload')}
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </button>
                <button className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-8 py-4 rounded-xl border-2 border-gray-200 transition-all">
                  Try Demo
                </button>
              </div>

              <p className="text-sm text-gray-500 mt-6">Free to use.</p>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>

                <div className="relative h-64">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    <line x1="0" y1="170" x2="400" y2="170" stroke="#E5E7EB" strokeWidth="1" />
                    <line x1="0" y1="128" x2="400" y2="128" stroke="#E5E7EB" strokeWidth="1" />
                    <line x1="0" y1="85" x2="400" y2="85" stroke="#E5E7EB" strokeWidth="1" />
                    <line x1="0" y1="43" x2="400" y2="43" stroke="#E5E7EB" strokeWidth="1" />
                    
                    <rect x="20" y="120" width="25" height="50" fill="#000000" />
                    <rect x="20" y="95" width="25" height="25" fill="#00C8C8" />
                    <rect x="20" y="75" width="25" height="20" fill="#4ECDC4" />
                    
                    <rect x="55" y="115" width="25" height="55" fill="#000000" />
                    <rect x="55" y="85" width="25" height="30" fill="#00C8C8" />
                    <rect x="55" y="60" width="25" height="25" fill="#4ECDC4" />
                    
                    <rect x="90" y="125" width="25" height="45" fill="#000000" />
                    <rect x="90" y="100" width="25" height="25" fill="#00C8C8" />
                    <rect x="90" y="85" width="25" height="15" fill="#4ECDC4" />
                    
                    <rect x="125" y="110" width="25" height="60" fill="#000000" />
                    <rect x="125" y="75" width="25" height="35" fill="#00C8C8" />
                    <rect x="125" y="50" width="25" height="25" fill="#4ECDC4" />
                    
                    <rect x="160" y="120" width="25" height="50" fill="#000000" />
                    <rect x="160" y="90" width="25" height="30" fill="#00C8C8" />
                    <rect x="160" y="70" width="25" height="20" fill="#4ECDC4" />
                    
                    <line x1="210" y1="20" x2="210" y2="170" stroke="#3B82F6" strokeWidth="3" strokeDasharray="6,4" />
                    
                    <rect x="230" y="95" width="25" height="75" fill="#EC4899" opacity="0.8" />
                    <rect x="230" y="55" width="25" height="40" fill="#F472B6" opacity="0.8" />
                    
                    <rect x="265" y="80" width="25" height="90" fill="#EC4899" opacity="0.8" />
                    <rect x="265" y="35" width="25" height="45" fill="#F472B6" opacity="0.8" />
                    
                    <rect x="300" y="100" width="25" height="70" fill="#EC4899" opacity="0.8" />
                    <rect x="300" y="65" width="25" height="35" fill="#F472B6" opacity="0.8" />
                    
                    <rect x="335" y="70" width="25" height="100" fill="#EC4899" opacity="0.8" />
                    <rect x="335" y="25" width="25" height="45" fill="#F472B6" opacity="0.8" />
                    
                    <rect x="370" y="85" width="25" height="85" fill="#EC4899" opacity="0.8" />
                    <rect x="370" y="45" width="25" height="40" fill="#F472B6" opacity="0.8" />
                    
                    <text x="105" y="195" fontSize="12" fill="#6B7280" textAnchor="middle" fontWeight="600">MMM</text>
                    <text x="315" y="195" fontSize="12" fill="#6B7280" textAnchor="middle" fontWeight="600">Attribution</text>
                  </svg>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 rounded-lg px-4 py-2 border border-orange-200">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-semibold text-orange-900">$2.4M</span>
                  <span className="text-sm text-orange-700">attributed beyond true lift</span>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transform rotate-3">
                <div className="text-2xl">43%</div>
                <div className="text-xs font-semibold">Variance</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <IncrementLogo size="default" />
          </div>
        </nav>

        <div className="container mx-auto px-6 pt-20 pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Upload Your Data
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Upload your MMM outputs, attribution data, and spend data to see the full analysis.
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-blue-500 transition-all hover:shadow-lg group">
                <label className="cursor-pointer block">
                  <div className="mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">MMM Data</h3>
                    <p className="text-sm text-gray-600 mb-4">JSON or CSV format</p>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={(e) => handleFileUpload(e, 'mmm')}
                    className="hidden"
                  />
                  <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mmmData 
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}>
                    {mmmData ? '✓ Loaded' : 'Choose File'}
                  </div>
                </label>
              </div>

              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-purple-500 transition-all hover:shadow-lg group">
                <label className="cursor-pointer block">
                  <div className="mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-50 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Attribution Data</h3>
                    <p className="text-sm text-gray-600 mb-4">JSON or CSV format</p>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={(e) => handleFileUpload(e, 'attribution')}
                    className="hidden"
                  />
                  <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    attributionData 
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}>
                    {attributionData ? '✓ Loaded' : 'Choose File'}
                  </div>
                </label>
              </div>

              <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-green-500 transition-all hover:shadow-lg group">
                <label className="cursor-pointer block">
                  <div className="mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                      <Upload className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Spend Data</h3>
                    <p className="text-sm text-gray-600 mb-4">CSV format</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'spend')}
                    className="hidden"
                  />
                  <div className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    spendData 
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}>
                    {spendData ? '✓ Loaded' : 'Choose File'}
                  </div>
                </label>
              </div>
            </div>

            {mmmData && attributionData && spendData && (
              <button
                onClick={() => setPage('app')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                View Analysis
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setPage('welcome')}
              className="block mx-auto mt-8 text-gray-600 hover:text-gray-900 text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main App View
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <IncrementLogo size="small" />
              <h1 className="text-2xl font-semibold text-gray-900">Sales Drivers</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setView('composition')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    view === 'composition'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Composition
                </button>
                <button
                  onClick={() => setView('comparison')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    view === 'comparison'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Comparison
                </button>
                <button
                  onClick={() => setView('cpa')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    view === 'cpa'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  CPA
                </button>
              </div>

              {/* Date Range Picker - FAR RIGHT */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="last-3m">Last 3 Months</option>
                <option value="last-6m">Last 6 Months</option>
                <option value="last-12m">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>
          </div>

          {/* Secondary Row - Model Toggle (only for composition view) */}
          {view === 'composition' && (
            <div className="flex items-center justify-end pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Model:</span>
                <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setActiveModel('mmm')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeModel === 'mmm'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    MMM
                  </button>
                  <button
                    onClick={() => setActiveModel('attribution')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeModel === 'attribution'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Attribution
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {view === 'composition' ? (
          <>
            <div className="bg-white mb-6">
              <ResponsiveContainer width="100%" height={700}>
                <BarChart 
                  data={displayData}
                  margin={{ top: 20, right: 40, left: 80, bottom: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 13 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={120}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 14 }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                  <Legend content={<CustomLegend />} />
                  
                  {!hiddenChannels.includes('baseline') && (
                    <Bar dataKey="baseline" stackId="a" fill={categoryColors.baseline} name="Base Sales" />
                  )}
                  {channels.map((channel, index) => (
                    !hiddenChannels.includes(channel) && (
                      <Bar 
                        key={channel}
                        dataKey={channel} 
                        stackId="a" 
                        fill={categoryColors.marketing[index % categoryColors.marketing.length]}
                        name={channel}
                      />
                    )
                  ))}
                  {!hiddenChannels.includes('unattributed') && (
                    <Bar dataKey="unattributed" stackId="a" fill={categoryColors.unattributed} name="Unattributed Sales" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`p-4 rounded-xl border ${
              activeModel === 'mmm' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm font-medium ${
                activeModel === 'mmm' ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {activeModel === 'mmm' 
                  ? '📊 MMM View: Shows true incremental contribution from each marketing channel above baseline. Click any channel in the legend to isolate it.'
                  : '⚠️ Attribution View: Shows only performance marketing channels. Click any channel in the legend to isolate it.'
                }
              </p>
            </div>
          </>
        ) : view === 'cpa' ? (
          <div className="space-y-6">
            {!spendData ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <p className="text-yellow-900 font-medium">Spend data required for CPA analysis</p>
                <p className="text-yellow-700 text-sm mt-2">Please upload your spend data CSV file to view CPA metrics.</p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Cost Per Acquisition by Channel</h2>
                  
                  <div className="space-y-4">
                    {channels.filter(ch => spendData[ch] || spendData[ch.replace(' ', '')]).map((channel) => {
                      const channelKey = spendData[channel] ? channel : Object.keys(spendData).find(k => k.toLowerCase() === channel.toLowerCase());
                      const mmmTotal = filteredMmmData?.reduce((sum, d) => sum + (d[channel] || 0), 0) || 0;
                      const attrTotal = filteredAttributionData?.reduce((sum, d) => sum + (d[channel] || 0), 0) || 0;
                      const spend = spendData[channelKey]?.spend || 0;
                      
                      if (!spend) return null;
                      
                      const cpaMmm = mmmTotal > 0 ? spend / mmmTotal : 0;
                      const cpaAttr = attrTotal > 0 ? spend / attrTotal : 0;
                      const variance = cpaMmm - cpaAttr;
                      const variancePct = cpaAttr > 0 ? ((cpaMmm - cpaAttr) / cpaAttr * 100) : 0;
                      
                      return (
                        <div key={channel} className="border-b border-gray-200 pb-4 last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{channel}</span>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-gray-500">MMM CPA: ${cpaMmm.toFixed(2)}</span>
                              <span className="text-gray-500">Attr CPA: ${cpaAttr.toFixed(2)}</span>
                              <span className={`font-semibold ${
                                variance > 0 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {variance > 0 ? '+' : ''}${variance.toFixed(2)} ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-blue-50 rounded p-3">
                              <div className="text-xs text-blue-700 mb-1">MMM</div>
                              <div className="text-xl font-bold text-blue-900">${cpaMmm.toFixed(2)}</div>
                              <div className="text-xs text-blue-600">{mmmTotal.toFixed(0)} conversions</div>
                            </div>
                            <div className="bg-purple-50 rounded p-3">
                              <div className="text-xs text-purple-700 mb-1">Attribution</div>
                              <div className="text-xl font-bold text-purple-900">${cpaAttr.toFixed(2)}</div>
                              <div className="text-xs text-purple-600">{attrTotal.toFixed(0)} conversions</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Understanding CPA Variance</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    MMM CPA is typically higher because it only counts true incremental conversions. 
                    Attribution CPA appears lower because it counts baseline conversions that would have happened anyway. 
                    Use MMM CPA for accurate budget planning and ROI calculations.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Metric sub-toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden">
                {[
                  { key: 'volume', label: 'Volume' },
                  { key: 'cpa', label: 'CPA' },
                  { key: 'roi', label: 'ROI' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setComparisonMetric(key)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      comparisonMetric === key
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              // Build comparison data for all channels
              const comparisonData = channels
                .map((channel) => {
                  const channelKey = spendData?.[channel] ? channel : spendData ? Object.keys(spendData).find(k => k.toLowerCase() === channel.toLowerCase()) : null;
                  const mmmTotal = filteredMmmData?.reduce((sum, d) => sum + (parseFloat(d[channel]) || 0), 0) || 0;
                  const attrTotal = filteredAttributionData?.reduce((sum, d) => sum + (parseFloat(d[channel]) || 0), 0) || 0;
                  const spend = spendData?.[channelKey]?.spend || 0;

                  const mmmCpa = mmmTotal > 0 ? spend / mmmTotal : 0;
                  const attrCpa = attrTotal > 0 ? spend / attrTotal : 0;
                  const mmmRoi = spend > 0 ? ((mmmTotal - spend) / spend) * 100 : null;
                  const attrRoi = spend > 0 && attrTotal > 0 ? ((attrTotal - spend) / spend) * 100 : null;

                  return {
                    channel,
                    spend,
                    mmmVolume: mmmTotal,
                    attrVolume: attrTotal,
                    mmmRevenue: mmmTotal,
                    attrRevenue: attrTotal,
                    mmmCpa,
                    attrCpa,
                    mmmRoi,
                    attrRoi,
                  };
                })
                .filter((row) => {
                  if (comparisonMetric === 'volume') return true;
                  return row.spend > 0;
                });

              // Determine which fields to chart & display
              const metricConfig = {
                volume: {
                  mmmKey: 'mmmVolume',
                  attrKey: 'attrVolume',
                  label: 'Sales / Conversions',
                  format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0),
                  prefix: '',
                },
                cpa: {
                  mmmKey: 'mmmCpa',
                  attrKey: 'attrCpa',
                  label: 'Cost Per Acquisition',
                  format: (v) => `$${v.toFixed(2)}`,
                  prefix: '$',
                },
                roi: {
                  mmmKey: 'mmmRoi',
                  attrKey: 'attrRoi',
                  label: 'Return on Investment',
                  format: (v) => v === null ? 'N/A' : `${v.toFixed(1)}%`,
                  prefix: '',
                },
              };

              const cfg = metricConfig[comparisonMetric];

              // CSV export
              const exportCSV = () => {
                const headers = ['Channel', 'Spend', 'MMM Volume', 'Attr Volume', 'MMM Revenue', 'Attr Revenue', 'MMM CPA', 'Attr CPA', 'MMM ROI (%)', 'Attr ROI (%)'];
                const rows = comparisonData.map((r) =>
                  [r.channel, r.spend.toFixed(2), r.mmmVolume.toFixed(0), r.attrVolume.toFixed(0), r.mmmRevenue.toFixed(2), r.attrRevenue.toFixed(2), r.mmmCpa.toFixed(2), r.attrCpa.toFixed(2), r.mmmRoi !== null ? r.mmmRoi.toFixed(1) : 'N/A', r.attrRoi !== null ? r.attrRoi.toFixed(1) : 'N/A'].join(',')
                );
                const csv = [headers.join(','), ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comparison-${comparisonMetric}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              };

              // Warn if CPA/ROI selected but no spend data
              if ((comparisonMetric === 'cpa' || comparisonMetric === 'roi') && !spendData) {
                return (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <p className="text-yellow-900 font-medium">Spend data required for {cfg.label} analysis</p>
                    <p className="text-yellow-700 text-sm mt-2">Please upload your spend data CSV file to view {cfg.label} metrics.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                      <div className="text-sm font-medium text-blue-900 mb-2">MMM Total {cfg.label}</div>
                      <div className="text-3xl font-bold text-blue-900 mb-1">
                        {cfg.format(comparisonData.reduce((sum, r) => sum + r[cfg.mmmKey], 0) / (comparisonMetric === 'cpa' || comparisonMetric === 'roi' ? comparisonData.length || 1 : 1))}
                      </div>
                      <div className="text-sm text-blue-700">{comparisonMetric === 'volume' ? 'incremental conversions' : comparisonMetric === 'cpa' ? 'avg across channels' : 'avg across channels'}</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                      <div className="text-sm font-medium text-purple-900 mb-2">Attribution Total {cfg.label}</div>
                      <div className="text-3xl font-bold text-purple-900 mb-1">
                        {cfg.format(comparisonData.reduce((sum, r) => sum + r[cfg.attrKey], 0) / (comparisonMetric === 'cpa' || comparisonMetric === 'roi' ? comparisonData.length || 1 : 1))}
                      </div>
                      <div className="text-sm text-purple-700">{comparisonMetric === 'volume' ? 'attributed conversions' : comparisonMetric === 'cpa' ? 'avg across channels' : 'avg across channels'}</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                      <div className="text-sm font-medium text-orange-900 mb-2">Variance</div>
                      <div className="text-3xl font-bold text-orange-900 mb-1">
                        {(() => {
                          const mmmSum = comparisonData.reduce((s, r) => s + r[cfg.mmmKey], 0);
                          const attrSum = comparisonData.reduce((s, r) => s + r[cfg.attrKey], 0);
                          const diff = attrSum - mmmSum;
                          const pct = mmmSum > 0 ? ((diff / mmmSum) * 100).toFixed(0) : 0;
                          return `${diff > 0 ? '+' : ''}${pct}%`;
                        })()}
                      </div>
                      <div className="text-sm text-orange-700">attribution vs MMM</div>
                    </div>
                  </div>

                  {/* Grouped Bar Chart */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{cfg.label} by Channel</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={comparisonData}
                        margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis
                          dataKey="channel"
                          stroke="#9CA3AF"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickLine={false}
                          angle={-30}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tick={{ fill: '#6B7280', fontSize: 12 }}
                          axisLine={{ stroke: '#E5E7EB' }}
                          tickLine={false}
                          tickFormatter={(value) =>
                            comparisonMetric === 'volume'
                              ? `${(value / 1000).toFixed(0)}k`
                              : comparisonMetric === 'cpa'
                              ? `$${value.toFixed(0)}`
                              : `${value.toFixed(0)}%`
                          }
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white border border-gray-200 rounded-md p-3 shadow-lg text-xs">
                                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between gap-4 mb-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                        <span className="text-gray-700">{entry.name}</span>
                                      </div>
                                      <span className="font-medium text-gray-900">{cfg.format(entry.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                        />
                        <Legend />
                        <Bar dataKey={cfg.mmmKey} name="MMM" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={cfg.attrKey} name="Attribution" fill="#EC4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Data Table */}
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Detail Table</h2>
                      <button
                        onClick={exportCSV}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Channel</th>
                            {spendData && <th className="text-right py-3 px-4 font-semibold text-gray-700">Spend</th>}
                            {comparisonMetric === 'roi' && (
                              <>
                                <th className="text-right py-3 px-4 font-semibold text-blue-700">MMM Revenue</th>
                                <th className="text-right py-3 px-4 font-semibold text-pink-700">Attr Revenue</th>
                              </>
                            )}
                            <th className="text-right py-3 px-4 font-semibold text-blue-700">MMM {comparisonMetric === 'volume' ? 'Volume' : comparisonMetric === 'cpa' ? 'CPA' : 'ROI'}</th>
                            <th className="text-right py-3 px-4 font-semibold text-pink-700">Attr {comparisonMetric === 'volume' ? 'Volume' : comparisonMetric === 'cpa' ? 'CPA' : 'ROI'}</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.map((row) => {
                            const mmmVal = row[cfg.mmmKey];
                            const attrVal = row[cfg.attrKey];
                            const mmmNum = mmmVal !== null ? mmmVal : 0;
                            const attrNum = attrVal !== null ? attrVal : 0;
                            const diff = attrNum - mmmNum;
                            const pct = mmmNum !== 0 ? ((diff / Math.abs(mmmNum)) * 100).toFixed(0) : (attrVal !== null ? 'N/A' : 'N/A');
                            return (
                              <tr key={row.channel} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-900">{row.channel}</td>
                                {spendData && <td className="py-3 px-4 text-right text-gray-600">${row.spend.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>}
                                {comparisonMetric === 'roi' && (
                                  <>
                                    <td className="py-3 px-4 text-right text-blue-800">
                                      ${row.mmmRevenue >= 1000 ? `${(row.mmmRevenue / 1000).toFixed(1)}k` : row.mmmRevenue.toFixed(0)}
                                    </td>
                                    <td className="py-3 px-4 text-right text-pink-800">
                                      {row.attrRevenue > 0 ? `$${row.attrRevenue >= 1000 ? `${(row.attrRevenue / 1000).toFixed(1)}k` : row.attrRevenue.toFixed(0)}` : 'N/A'}
                                    </td>
                                  </>
                                )}
                                <td className="py-3 px-4 text-right font-medium text-blue-900">{cfg.format(mmmVal)}</td>
                                <td className="py-3 px-4 text-right font-medium text-pink-900">{cfg.format(attrVal)}</td>
                                <td className={`py-3 px-4 text-right font-semibold ${
                                  typeof pct === 'string' ? 'text-gray-400' : diff > 0 ? 'text-orange-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {typeof pct === 'string' ? pct : `${diff > 0 ? '+' : ''}${pct}%`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50">
                            <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                            {spendData && (
                              <td className="py-3 px-4 text-right font-bold text-gray-900">
                                ${comparisonData.reduce((s, r) => s + r.spend, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </td>
                            )}
                            {comparisonMetric === 'roi' && (
                              <>
                                <td className="py-3 px-4 text-right font-bold text-blue-900">
                                  ${(comparisonData.reduce((s, r) => s + r.mmmRevenue, 0) / 1000).toFixed(1)}k
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-pink-900">
                                  ${(comparisonData.reduce((s, r) => s + r.attrRevenue, 0) / 1000).toFixed(1)}k
                                </td>
                              </>
                            )}
                            <td className="py-3 px-4 text-right font-bold text-blue-900">
                              {(() => {
                                if (comparisonMetric === 'volume') return cfg.format(comparisonData.reduce((s, r) => s + r.mmmVolume, 0));
                                if (comparisonMetric === 'roi') {
                                  const totalRev = comparisonData.reduce((s, r) => s + r.mmmRevenue, 0);
                                  const totalSpend = comparisonData.reduce((s, r) => s + r.spend, 0);
                                  return totalSpend > 0 ? `${(((totalRev - totalSpend) / totalSpend) * 100).toFixed(1)}%` : 'N/A';
                                }
                                return cfg.format(comparisonData.reduce((s, r) => s + r[cfg.mmmKey], 0) / (comparisonData.length || 1));
                              })()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-pink-900">
                              {(() => {
                                if (comparisonMetric === 'volume') return cfg.format(comparisonData.reduce((s, r) => s + r.attrVolume, 0));
                                if (comparisonMetric === 'roi') {
                                  const totalRev = comparisonData.reduce((s, r) => s + r.attrRevenue, 0);
                                  const totalSpend = comparisonData.reduce((s, r) => s + r.spend, 0);
                                  return totalSpend > 0 && totalRev > 0 ? `${(((totalRev - totalSpend) / totalSpend) * 100).toFixed(1)}%` : 'N/A';
                                }
                                return cfg.format(comparisonData.reduce((s, r) => s + r[cfg.attrKey], 0) / (comparisonData.length || 1));
                              })()}
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${
                              (() => {
                                const ms = comparisonData.reduce((s, r) => s + (r[cfg.mmmKey] || 0), 0);
                                const as = comparisonData.reduce((s, r) => s + (r[cfg.attrKey] || 0), 0);
                                return (as - ms) > 0 ? 'text-orange-600' : 'text-green-600';
                              })()
                            }`}>
                              {(() => {
                                const ms = comparisonData.reduce((s, r) => s + (r[cfg.mmmKey] || 0), 0);
                                const as = comparisonData.reduce((s, r) => s + (r[cfg.attrKey] || 0), 0);
                                const d = as - ms;
                                const p = ms !== 0 ? ((d / Math.abs(ms)) * 100).toFixed(0) : 'N/A';
                                return typeof p === 'string' ? p : `${d > 0 ? '+' : ''}${p}%`;
                              })()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-blue-500" />
                      <span className="text-sm text-gray-700">MMM (True Lift)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-pink-500" />
                      <span className="text-sm text-gray-700">Attribution</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default IncrementApp;
