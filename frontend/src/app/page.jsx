"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Shield, Upload, Activity, Clock, AlertTriangle, CheckCircle, 
  XCircle, Loader2, ChevronDown, ChevronUp, FileCode, History,
  Trash2, RefreshCw, ArrowLeft, BarChart3, AlertOctagon, Sun, Moon, Monitor,
  Fingerprint, Zap, Search, Terminal
} from "lucide-react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { 
  healthCheck, 
  createScan, 
  getScans, 
  getScanResults,
  deleteScan 
} from "@/lib/api";

// Animated number counter component
function CountUpNumber({ value, duration = 1.5 }) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString());
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  
  return <motion.span>{display}</motion.span>;
}

// Severity colors mapping
const severityColors = {
  critical: { bg: "bg-red-600", text: "text-red-400", border: "border-red-500/30", fill: "#ef4444", glow: "shadow-red-500/20" },
  high: { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500/30", fill: "#f97316", glow: "shadow-orange-500/20" },
  medium: { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500/30", fill: "#eab308", glow: "shadow-yellow-500/20" },
  low: { bg: "bg-blue-500", text: "text-blue-400", border: "border-blue-500/30", fill: "#3b82f6", glow: "shadow-blue-500/20" }
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
          
          <div className="flex-1 overflow-y-auto p-3">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : scanHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                  <History className="w-6 h-6 text-zinc-500" />
                </div>
                <p className="text-zinc-500 text-sm">No scans yet</p>
                <p className="text-zinc-600 text-xs mt-1">Upload a file to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scanHistory.map((scan, index) => (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => viewScan(scan.id)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all hover:bg-zinc-800/80 ${
                      scanResult?.id === scan.id 
                        ? 'bg-zinc-800 border border-emerald-500/30 shadow-lg shadow-emerald-500/5' 
                        : 'border border-transparent hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm truncate flex-1 text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {scan.project_name || scan.file_name || 'Untitled Scan'}
                      </span>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => handleDeleteScan(scan.id, e)}
                        className="p-1.5 hover:bg-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(scan.created_at)}
                      </span>
                      {scan.risk_score !== undefined && (
                        <span className={`font-semibold ${getRiskColor(scan.risk_score).text}`}>
                          {scan.risk_score}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        scan.status === 'completed' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                          : scan.status === 'failed'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {scan.status === 'completed' ? <CheckCircle className="w-3 h-3" /> :
                         scan.status === 'failed' ? <XCircle className="w-3 h-3" /> :
                         <Loader2 className="w-3 h-3 animate-spin" />}
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
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        </div>
        
        <header className="relative border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10">
          {/* Header gradient line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
          
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-zinc-800 rounded-xl mr-1"
                >
                  <History className="w-5 h-5 text-zinc-400" />
                </motion.button>
              )}
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-xl" />
                <div className="relative p-2 bg-zinc-800/80 rounded-xl">
                  <Shield className="w-7 h-7 text-emerald-500" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  CodeSentinel
                </span>
                <p className="text-xs text-zinc-500 -mt-0.5">Security Scanner</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {/* Status indicator */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/80 rounded-full"
              >
                <span className={`relative flex h-2 w-2`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    backendStatus === "Connected" ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    backendStatus === "Connected" ? "bg-emerald-500" : "bg-red-500"
                  }`} />
                </span>
                <span className={backendStatus === "Connected" ? "text-emerald-400" : "text-red-400"}>
                  {backendStatus}
                </span>
              </motion.div>
              
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
            </div>
          </div>
        </header>

        <main className="relative max-w-5xl mx-auto px-6 py-8">
          {/* Upload Area or Results */}
          {scanResult ? (
            /* Results Dashboard */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Header with back button */}
              <div className="flex items-center justify-between">
                <div>
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-2xl font-bold flex items-center gap-3"
                  >
                    <span className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full" />
                    Scan Results
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-400 text-sm mt-1 flex items-center gap-2"
                  >
                    <FileCode className="w-4 h-4" />
                    {scanResult.project_name || scanResult.file_name || 'Code Analysis'}
                  </motion.p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => { setScanResult(null); setScanStatus(null); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700 hover:border-emerald-500/30 group"
                >
                  <Upload className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  <span className="font-medium">New Scan</span>
                </motion.button>
              </div>

              {/* Risk Score & Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Risk Score Card */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                  className={`relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 group ${
                    getRiskColor(scanResult.risk_score).bg.includes('green') ? 'hover:border-green-500/30' :
                    getRiskColor(scanResult.risk_score).bg.includes('yellow') ? 'hover:border-yellow-500/30' :
                    getRiskColor(scanResult.risk_score).bg.includes('orange') ? 'hover:border-orange-500/30' :
                    'hover:border-red-500/30'
                  }`}
                >
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${
                    getRiskColor(scanResult.risk_score).bg.includes('green') ? 'bg-green-500' :
                    getRiskColor(scanResult.risk_score).bg.includes('yellow') ? 'bg-yellow-500' :
                    getRiskColor(scanResult.risk_score).bg.includes('orange') ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />

                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-zinc-400 flex items-center gap-2">
                        <Fingerprint className="w-5 h-5" />
                        Risk Score
                      </h3>
                      <div className={`p-2 rounded-xl ${
                        getRiskColor(scanResult.risk_score).bg.includes('green') ? 'bg-green-500/10' :
                        getRiskColor(scanResult.risk_score).bg.includes('yellow') ? 'bg-yellow-500/10' :
                        getRiskColor(scanResult.risk_score).bg.includes('orange') ? 'bg-orange-500/10' :
                        'bg-red-500/10'
                      }`}>
                        <AlertOctagon className={`w-5 h-5 ${
                          getRiskColor(scanResult.risk_score).text
                        }`} />
                      </div>
                    </div>
                    
                    <div className="flex items-end gap-3">
                      <motion.span 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className={`text-6xl font-bold tracking-tight ${
                          getRiskColor(scanResult.risk_score).text
                        }`}
                      >
                        <CountUpNumber value={scanResult.risk_score ?? 0} />
                      </motion.span>
                      <span className="text-zinc-500 mb-2 text-lg">/ 100</span>
                    </div>
                    
                    {/* Risk level indicator */}
                    <motion.div 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className={`mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                        getRiskColor(scanResult.risk_score).bg
                      }/20 ${getRiskColor(scanResult.risk_score).text}`}
                    >
                      <span className={`w-2 h-2 rounded-full animate-pulse ${
                        getRiskColor(scanResult.risk_score).bg
                      }`} />
                      {getRiskLevel(scanResult.risk_score)}
                    </motion.div>
                    
                    {/* Risk bar */}
                    <div className="mt-5 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${scanResult.risk_score ?? 0}%` }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          getRiskColor(scanResult.risk_score).bg
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Vulnerability Count Card */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                  className="relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 group hover:border-zinc-700"
                >
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-zinc-400 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Vulnerabilities
                      </h3>
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <AlertTriangle className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                    <motion.span 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.35, type: "spring" }}
                      className="text-6xl font-bold text-zinc-100"
                    >
                      <CountUpNumber value={scanResult.vulnerability_count ?? 0} />
                    </motion.span>
                    <p className="text-zinc-500 text-sm mt-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Total issues found
                    </p>
                  </div>
                </motion.div>

                {/* Severity Distribution Pie Chart */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                  className="relative overflow-hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 group hover:border-zinc-700"
                >
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                  
                  <div className="relative">
                    <h3 className="font-semibold text-zinc-400 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Distribution
                    </h3>
                    <div className="h-32">
                      {getPieChartData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={52}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#18181b', 
                              border: '1px solid #3f3f46',
                              borderRadius: '12px',
                              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#fafafa' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring" }}
                        >
                          <CheckCircle className="w-12 h-12 text-emerald-500" />
                        </motion.div>
                      </div>
                    )}
                    </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {Object.entries(scanResult.vulnerabilities_by_severity || {}).map(([sev, count]) => (
                      count > 0 && (
                        <motion.span 
                          key={sev}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${getSeverityColor(sev).bg} text-white shadow-lg`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                          {sev}: {count}
                        </motion.span>
                      )
                    ))}
                  </div>
                  </div>
                </motion.div>
              </div>

              {/* Vulnerability List */}
              {scanResult.vulnerabilities && scanResult.vulnerabilities.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-emerald-500" />
                    Vulnerability Details
                  </h2>
                  {scanResult.vulnerabilities.map((vuln, index) => {
                    const isExpanded = expandedVuln === vuln.id;
                    const sevColor = getSeverityColor(vuln.severity);
                    
                    return (
                      <motion.div
                        key={vuln.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        layout
                        className={`relative group bg-zinc-900/80 backdrop-blur-sm border ${sevColor.border} rounded-2xl overflow-hidden shadow-lg ${sevColor.glow}`}
                      >
                        {/* Severity indicator bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${sevColor.bg}`} />
                        
                        {/* Glow effect on hover */}
                        <div className={`absolute inset-0 ${sevColor.bg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                        
                        <div 
                          className="p-5 cursor-pointer hover:bg-zinc-800/30 transition-all duration-200 pl-6"
                          onClick={() => setExpandedVuln(isExpanded ? null : vuln.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${sevColor.bg} text-white shadow-lg`}>
                                  {vuln.severity}
                                </span>
                                {/* Severity icon */}
                                <div className={`p-2 rounded-lg ${sevColor.bg}/10`}>
                                  <AlertTriangle className={`w-4 h-4 ${sevColor.text}`} />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-emerald-400 transition-colors">
                                  {vuln.title}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-zinc-500 mt-2 flex-wrap">
                                  <span className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-md">
                                    <FileCode className="w-3.5 h-3.5" />
                                    <span className="font-mono text-xs">
                                      {vuln.file_path}:{vuln.line_number}
                                    </span>
                                  </span>
                                  {vuln.tool && (
                                    <span className="flex items-center gap-1.5 bg-zinc-800/80 px-2.5 py-1 rounded-md">
                                      <Zap className="w-3.5 h-3.5 text-zinc-400" />
                                      <span className="text-xs">{vuln.tool}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <motion.button 
                              className={`p-2 rounded-xl ${isExpanded ? 'bg-zinc-800' : 'bg-zinc-800/50'} hover:bg-zinc-700 transition-colors`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                                )}
                              </motion.div>
                            </motion.button>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="border-t border-zinc-800/50"
                            >
                              <div className="p-6 space-y-5 pl-6">
                                {vuln.code_snippet && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
                                      <Terminal className="w-4 h-4" />
                                      Code Snippet
                                    </h4>
                                    <div className="relative rounded-xl overflow-hidden">
                                      <div className="absolute top-0 left-0 right-0 h-8 bg-zinc-800/50 flex items-center gap-1.5 px-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                      </div>
                                      <pre className="bg-zinc-950/90 p-4 pt-10 rounded-xl overflow-x-auto text-sm font-mono text-zinc-300 leading-relaxed border border-zinc-800/50">
                                        <code>{vuln.code_snippet}</code>
                                      </pre>
                                    </div>
                                  </div>
                                )}
                                
                                {vuln.description && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                                      <FileCode className="w-4 h-4" />
                                      Description
                                    </h4>
                                    <p className="text-zinc-300 leading-relaxed bg-zinc-800/30 p-4 rounded-xl">
                                      {vuln.description}
                                    </p>
                                  </div>
                                )}
                                
                                {vuln.remediation && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4" />
                                      Remediation
                                    </h4>
                                    <p className="text-zinc-300 leading-relaxed bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                      {vuln.remediation}
                                    </p>
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
                  className="relative overflow-hidden bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-16 text-center"
                >
                  {/* Background effects */}
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                  
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                      className="inline-flex mb-6"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl" />
                        <div className="relative p-4 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                          <CheckCircle className="w-16 h-16 text-emerald-500" />
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-emerald-400 mb-3"
                    >
                      No Vulnerabilities Found!
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-zinc-400 max-w-md mx-auto text-lg"
                    >
                      Your code passed all security checks. Great job keeping your codebase secure!
                    </motion.p>
                    
                    {/* Success indicators */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-4 mt-8"
                    >
                      {['Bandit', 'Safety', 'NodeJS'].map((tool, i) => (
                        <span key={tool} className="px-4 py-2 bg-zinc-800/50 rounded-xl text-sm text-zinc-400 border border-zinc-700/50">
                          {tool} ✓
                        </span>
                      ))}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Upload Area */
            <>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold mb-4 flex items-center justify-center gap-4"
                >
                  <span className="text-zinc-100">Secure Your Code</span>
                  <span className="text-emerald-500">with AI</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-zinc-400 text-lg max-w-2xl mx-auto"
                >
                  Upload your codebase and get instant security analysis with AI-powered remediation guidance.
                </motion.p>
              </motion.div>

              {/* Loading State */}
              {isUploading ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden border border-zinc-800 rounded-2xl p-12 text-center bg-zinc-900/60 backdrop-blur-sm"
                >
                  {/* Background animation */}
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent" />
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                  
                  <div className="relative max-w-lg mx-auto">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl" />
                        <Loader2 className="relative w-16 h-16 mx-auto mb-6 text-emerald-500" />
                      </div>
                    </motion.div>
                    
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-semibold mb-2 text-zinc-100"
                    >
                      Scanning your code...
                    </motion.h2>
                    
                    {/* Progress Stages */}
                    <div className="flex items-center justify-center gap-1 mt-8">
                      {scanStages.map((stage, index) => {
                        const isActive = index <= currentStage;
                        const isCurrent = index === currentStage;
                        const StageIcon = stage.icon;
                        
                        return (
                          <div key={stage.key} className="flex items-center">
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ 
                                scale: isCurrent ? 1.15 : 1,
                                opacity: isActive ? 1 : 0.5
                              }}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-zinc-800'
                              }`}
                            >
                              <StageIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                            </motion.div>
                            {index < scanStages.length - 1 && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: isActive ? 24 : 0 }}
                                className="h-0.5 bg-emerald-500 mx-1 rounded-full"
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
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`relative group rounded-2xl overflow-hidden transition-all duration-300 ${
                    isDragging
                      ? "scale-[1.02] border-emerald-500/60"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleClick}
                >
                  {/* Animated border gradient */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/30 to-emerald-500/0 opacity-0 transition-opacity duration-500 ${
                    isDragging ? "opacity-100" : "group-hover:opacity-60"
                  }`} style={{ padding: '2px' }}>
                    <div className="absolute inset-0 bg-zinc-900/95 rounded-2xl" />
                  </div>
                  
                  {/* Glow effect */}
                  <div className={`absolute -inset-1 rounded-2xl bg-emerald-500/20 blur-xl transition-opacity duration-300 ${
                    isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                  }`} />
                  
                  <div className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                    isDragging
                      ? "bg-emerald-500/10 border-emerald-500/50"
                      : "bg-zinc-900/60 backdrop-blur-sm border-zinc-800 hover:border-zinc-600"
                  }`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleInputChange}
                      className="hidden"
                    />
                    
                    <motion.div
                      animate={{ 
                        scale: isDragging ? 1.1 : 1,
                        y: isDragging ? -5 : 0
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      {/* Icon container with glow */}
                      <div className={`relative inline-flex mb-6 ${isDragging ? 'text-emerald-400' : ''}`}>
                        <div className={`absolute inset-0 bg-emerald-500/30 rounded-full blur-xl transition-all duration-300 ${
                          isDragging ? "scale-150" : "scale-100 group-hover:scale-125"
                        }`} />
                        <div className={`relative p-4 rounded-2xl transition-all duration-300 ${
                          isDragging 
                            ? "bg-emerald-500/20" 
                            : "bg-zinc-800/50 group-hover:bg-zinc-800"
                        }`}>
                          <Upload className="w-12 h-12 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg font-semibold mb-2 text-zinc-200"
                    >
                      {isDragging ? "Drop your file here" : "Drag & drop your code zip file here"}
                    </motion.p>
                    <p className="text-zinc-500 text-sm mb-6">
                      or click to browse • Max 50MB • .zip files only
                    </p>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
                    >
                      <span className="relative flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Select File
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-4 shadow-lg shadow-red-500/10"
                >
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  </div>
                  <p className="text-red-400 text-sm flex-1">{error}</p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={retryScan}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </motion.button>
                </motion.div>
              )}

              {/* Features Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <motion.div 
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300"
                >
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                      <Shield className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold mb-2 text-zinc-100">Security Scanning</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      Bandit & Safety scan your Python code for vulnerabilities
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300"
                >
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                      <Activity className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="font-semibold mb-2 text-zinc-100">AI Remediation</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      Get intelligent fix suggestions powered by Groq AI
                    </p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="absolute -top-10 -right-10 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                      <Clock className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="font-semibold mb-2 text-zinc-100">Scan History</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      Track your security progress over time
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
