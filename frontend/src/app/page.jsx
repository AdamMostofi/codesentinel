"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Shield, Upload, Activity, Clock, AlertTriangle, CheckCircle, 
  XCircle, Loader2, ChevronDown, ChevronUp, FileCode, History,
  Trash2, RefreshCw, ArrowLeft, BarChart3, AlertOctagon, Sun, Moon, Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { 
  healthCheck, 
  createScan, 
  getScans, 
  getScanResults,
  deleteScan 
} from "@/lib/api";

// Severity colors mapping
const severityColors = {
  critical: { bg: "bg-red-600", text: "text-red-400", border: "border-red-500/30", fill: "#ef4444" },
  high: { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", fill: "#f97316" },
  medium: { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500/30", fill: "#eab308" },
  low: { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", fill: "#3b82f6" }
};

// Get risk score color
const getRiskColor = (score) => {
  if (score <= 25) return { text: "text-green-500", bg: "bg-green-500", ring: "ring-green-500" };
  if (score <= 50) return { text: "text-yellow-500", bg: "bg-yellow-500", ring: "ring-yellow-500" };
  if (score <= 75) return { text: "text-orange-500", bg: "bg-orange-500", ring: "ring-orange-500" };
  return { text: "text-red-500", bg: "bg-red-500", ring: "ring-red-500" };
};

// Get risk level label
const getRiskLevel = (score) => {
  if (score <= 25) return "Low Risk";
  if (score <= 50) return "Medium Risk";
  if (score <= 75) return "High Risk";
  return "Critical Risk";
};

// Scan stage messages
const scanStages = [
  { key: 'uploading', label: 'Uploading...', icon: Upload },
  { key: 'extracting', label: 'Extracting...', icon: FileCode },
  { key: 'scanning', label: 'Scanning...', icon: Shield },
  { key: 'analyzing', label: 'Analyzing...', icon: BarChart3 },
  { key: 'completed', label: 'Complete!', icon: CheckCircle },
];

export default function Home() {
  const [backendStatus, setBackendStatus] = useState("checking...");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [expandedVuln, setExpandedVuln] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Check backend health and load history on mount
  useEffect(() => {
    healthCheck()
      .then((data) => {
        setBackendStatus(data.status === "healthy" ? "Connected" : "Error");
      })
      .catch(() => {
        setBackendStatus("Disconnected");
      });
    
    loadScanHistory();
    
    // Initialize theme toggle state
    const initThemeToggle = () => {
      const storedTheme = localStorage.getItem('theme') || 'dark';
      const container = document.querySelector('.theme-toggle');
      if (!container) return;
      
      const buttons = container.querySelectorAll('.theme-toggle-btn');
      buttons.forEach((btn) => {
        const isActive = btn.dataset.theme === storedTheme;
        btn.setAttribute('aria-checked', isActive);
        btn.classList.toggle('active', isActive);
      });
    };
    
    // Delay to ensure DOM is ready
    setTimeout(initThemeToggle, 0);
  }, []);

  // Load scan history
  const loadScanHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await getScans();
      setScanHistory(history || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.zip')) {
      setError("Please upload a .zip file");
      return;
    }
    
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setScanResult(null);
    setExpandedVuln(null);
    
    await startScan(file);
  };

  // Start scan process
  const startScan = async (file) => {
    setIsUploading(true);
    setScanStatus('uploading');
    setCurrentStage(0);

    try {
      // Upload file and get scan ID
      const { scan_id } = await createScan(file);
      
      // Update stage to extracting
      setCurrentStage(1);
      setScanStatus('extracting');
      
      // Poll for results
      await pollForScanResults(scan_id);
      
    } catch (err) {
      console.error("Scan failed:", err);
      setError(err.response?.data?.detail || err.message || "Failed to scan file. Please try again.");
      setScanStatus('failed');
    } finally {
      setIsUploading(false);
      loadScanHistory();
    }
  };

  // Poll for scan results
  const pollForScanResults = async (scanId) => {
    const maxAttempts = 60;
    const interval = 2000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await getScanResults(scanId);
        
        // Update stage based on status
        if (result.status === 'processing') {
          if (attempts < 5) {
            setCurrentStage(1); // extracting
            setScanStatus('extracting');
          } else if (attempts < 20) {
            setCurrentStage(2); // scanning
            setScanStatus('scanning');
          } else {
            setCurrentStage(3); // analyzing
            setScanStatus('analyzing');
          }
        }
        
        if (result.status === 'completed') {
          setCurrentStage(4);
          setScanStatus('completed');
          setScanResult(result);
          setSelectedFile(null);
          return result;
        }
        
        if (result.status === 'failed') {
          throw new Error(result.error || "Scan failed");
        }
        
      } catch (err) {
        if (attempts >= maxAttempts - 1) {
          throw new Error("Scan timed out. Please try again.");
        }
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error("Scan timed out. Please try again.");
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle file input
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // View past scan
  const viewScan = async (scanId) => {
    try {
      const result = await getScanResults(scanId);
      setScanResult(result);
      setSelectedFile(null);
      setScanStatus('completed');
      setCurrentStage(4);
    } catch (err) {
      setError("Failed to load scan results");
    }
  };

  // Delete scan
  const handleDeleteScan = async (scanId, e) => {
    e.stopPropagation();
    try {
      await deleteScan(scanId);
      loadScanHistory();
      if (scanResult?.id === scanId) {
        setScanResult(null);
      }
    } catch (err) {
      setError("Failed to delete scan");
    }
  };

  // Retry scan
  const retryScan = () => {
    setError(null);
    setScanResult(null);
    setScanStatus(null);
  };

  // Get severity color class
  const getSeverityColor = (severity) => {
    const sev = severity?.toLowerCase();
    return severityColors[sev] || severityColors.low;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Prepare pie chart data
  const getPieChartData = () => {
    if (!scanResult?.vulnerabilities_by_severity) return [];
    const { critical, high, medium, low } = scanResult.vulnerabilities_by_severity;
    return [
      { name: 'Critical', value: critical || 0, color: severityColors.critical.fill },
      { name: 'High', value: high || 0, color: severityColors.high.fill },
      { name: 'Medium', value: medium || 0, color: severityColors.medium.fill },
      { name: 'Low', value: low || 0, color: severityColors.low.fill },
    ].filter(d => d.value > 0);
  };

  // Filter vulnerabilities by severity
  const getVulnerabilitiesBySeverity = (severity) => {
    if (!scanResult?.vulnerabilities) return [];
    return scanResult.vulnerabilities.filter(
      v => v.severity?.toLowerCase() === severity.toLowerCase()
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* History Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-20 overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" />
              <span className="font-semibold">Scan History</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-zinc-800 rounded"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : scanHistory.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-8">No scans yet</p>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((scan) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => viewScan(scan.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-zinc-800 ${
                      scanResult?.id === scan.id ? 'bg-zinc-800 border border-emerald-500/30' : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate flex-1">
                        {scan.project_name || scan.file_name || 'Untitled Scan'}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteScan(scan.id, e)}
                        className="p-1 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-zinc-400" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatDate(scan.created_at)}</span>
                      {scan.risk_score !== undefined && (
                        <span className={getRiskColor(scan.risk_score).text}>
                          {scan.risk_score}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        scan.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : scan.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-0'}`}>
        <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-1 hover:bg-zinc-800 rounded mr-2"
                >
                  <History className="w-5 h-5 text-zinc-400" />
                </button>
              )}
              <Shield className="w-8 h-8 text-emerald-500" />
              <span className="text-xl font-bold tracking-tight">CodeSentinel</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/* Theme Toggle */}
              <div 
                className="theme-toggle"
                role="radiogroup" 
                aria-label="Theme selection"
              >
                <button
                  className="theme-toggle-btn"
                  data-theme="light"
                  role="radio"
                  aria-checked="false"
                  aria-label="Light theme"
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  className="theme-toggle-btn"
                  data-theme="dark"
                  role="radio"
                  aria-checked="false"
                  aria-label="Dark theme"
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  className="theme-toggle-btn"
                  data-theme="system"
                  role="radio"
                  aria-checked="false"
                  aria-label="System theme"
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
              <Activity className={`w-4 h-4 ${backendStatus === "Connected" ? "text-emerald-500" : "text-red-500"}`} />
              <span className={backendStatus === "Connected" ? "text-emerald-500" : "text-red-500"}>
                {backendStatus}
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Upload Area or Results */}
          {scanResult ? (
            /* Results Dashboard */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header with back button */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Scan Results</h1>
                  <p className="text-zinc-400 text-sm">
                    {scanResult.project_name || scanResult.file_name || 'Code Analysis'}
                  </p>
                </div>
                <button
                  onClick={() => { setScanResult(null); setScanStatus(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  New Scan
                </button>
              </div>

              {/* Risk Score & Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Risk Score Card */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-400">Risk Score</h3>
                    <AlertOctagon className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className={`text-5xl font-bold ${getRiskColor(scanResult.risk_score).text}`}>
                      {scanResult.risk_score ?? 0}
                    </span>
                    <span className="text-zinc-500 mb-2">/ 100</span>
                  </div>
                  <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(scanResult.risk_score).bg}/20 ${getRiskColor(scanResult.risk_score).text}`}>
                    {getRiskLevel(scanResult.risk_score)}
                  </div>
                </motion.div>

                {/* Vulnerability Count Card */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-400">Vulnerabilities</h3>
                    <AlertTriangle className="w-5 h-5 text-zinc-500" />
                  </div>
                  <span className="text-5xl font-bold text-zinc-100">
                    {scanResult.vulnerability_count ?? 0}
                  </span>
                  <p className="text-zinc-500 text-sm mt-3">Total issues found</p>
                </motion.div>

                {/* Severity Distribution Pie Chart */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                  <h3 className="font-semibold text-zinc-400 mb-2">Distribution</h3>
                  <div className="h-28">
                    {getPieChartData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#18181b', 
                              border: '1px solid #3f3f46',
                              borderRadius: '8px'
                            }}
                            itemStyle={{ color: '#fafafa' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(scanResult.vulnerabilities_by_severity || {}).map(([sev, count]) => (
                      count > 0 && (
                        <span key={sev} className={`text-xs px-2 py-1 rounded ${getSeverityColor(sev).bg} text-white`}>
                          {sev}: {count}
                        </span>
                      )
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Vulnerability List */}
              {scanResult.vulnerabilities && scanResult.vulnerabilities.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <h2 className="text-xl font-semibold mb-4">Vulnerability Details</h2>
                  {scanResult.vulnerabilities.map((vuln, index) => {
                    const isExpanded = expandedVuln === vuln.id;
                    const sevColor = getSeverityColor(vuln.severity);
                    
                    return (
                      <motion.div
                        key={vuln.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={`bg-zinc-900/50 border ${sevColor.border} rounded-xl overflow-hidden`}
                      >
                        <div 
                          className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                          onClick={() => setExpandedVuln(isExpanded ? null : vuln.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${sevColor.bg} text-white`}>
                                {vuln.severity}
                              </span>
                              <div className="flex-1">
                                <h3 className="font-medium">{vuln.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                                  <FileCode className="w-3 h-3" />
                                  <span className="font-mono">
                                    {vuln.file_path}:{vuln.line_number}
                                  </span>
                                  {vuln.tool && (
                                    <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs">
                                      {vuln.tool}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button className="p-1">
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-zinc-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-zinc-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-zinc-800"
                            >
                              <div className="p-4 space-y-4">
                                {vuln.code_snippet && (
                                  <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Code Snippet</h4>
                                    <pre className="bg-zinc-950 p-3 rounded-lg overflow-x-auto text-sm font-mono text-zinc-300">
                                      <code>{vuln.code_snippet}</code>
                                    </pre>
                                  </div>
                                )}
                                
                                {vuln.description && (
                                  <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Description</h4>
                                    <p className="text-zinc-300">{vuln.description}</p>
                                  </div>
                                )}
                                
                                {vuln.remediation && (
                                  <div>
                                    <h4 className="text-sm font-medium text-emerald-400 mb-2">Remediation</h4>
                                    <p className="text-zinc-300">{vuln.remediation}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                /* No Vulnerabilities */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900/50 border border-emerald-500/30 rounded-xl p-12 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-emerald-400 mb-2">
                    No Vulnerabilities Found!
                  </h2>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Your code passed all security checks. Great job keeping your codebase secure!
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Upload Area */
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-4">
                  Secure Your Code with AI
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                  Upload your codebase and get instant security analysis with AI-powered remediation guidance.
                </p>
              </div>

              {/* Loading State */}
              {isUploading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-zinc-700 rounded-xl p-12 text-center bg-zinc-900/50"
                >
                  <div className="max-w-md mx-auto">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Loader2 className="w-16 h-16 mx-auto mb-6 text-emerald-500" />
                    </motion.div>
                    
                    <h2 className="text-xl font-semibold mb-2">
                      Scanning your code...
                    </h2>
                    
                    {/* Progress Stages */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                      {scanStages.map((stage, index) => {
                        const isActive = index <= currentStage;
                        const isCurrent = index === currentStage;
                        const StageIcon = stage.icon;
                        
                        return (
                          <div key={stage.key} className="flex items-center">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ 
                                scale: isCurrent ? 1.1 : 1,
                                backgroundColor: isActive ? '#10b981' : '#3f3f46'
                              }}
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                              }`}
                            >
                              <StageIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                            </motion.div>
                            {index < scanStages.length - 1 && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: isActive ? 20 : 0 }}
                                className="w-5 h-0.5 bg-emerald-500 mx-1"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-zinc-400 mt-4">
                      {scanStages[currentStage]?.label || 'Processing...'}
                    </p>
                    
                    {selectedFile && (
                      <p className="text-zinc-500 text-sm mt-2">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                /* File Upload Dropzone */
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleClick}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  
                  <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
                  <p className="text-lg font-medium mb-2">
                    Drag & drop your code zip file here
                  </p>
                  <p className="text-zinc-500 text-sm mb-6">
                    or click to browse • Max 50MB • .zip files only
                  </p>
                  <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
                    Select File
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3"
                >
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 text-sm flex-1">{error}</p>
                  <button 
                    onClick={retryScan}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </motion.div>
              )}

              {/* Features Grid */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <Shield className="w-8 h-8 text-emerald-500 mb-3" />
                  <h3 className="font-semibold mb-2">Security Scanning</h3>
                  <p className="text-zinc-500 text-sm">
                    Bandit & Safety scan your Python code for vulnerabilities
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <Activity className="w-8 h-8 text-blue-500 mb-3" />
                  <h3 className="font-semibold mb-2">AI Remediation</h3>
                  <p className="text-zinc-500 text-sm">
                    Get intelligent fix suggestions powered by Groq AI
                  </p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <Clock className="w-8 h-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold mb-2">Scan History</h3>
                  <p className="text-zinc-500 text-sm">
                    Track your security progress over time
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
