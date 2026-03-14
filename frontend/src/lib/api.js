import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Check backend health status
 * @returns {Promise<{status: string}>}
 */
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

/**
 * Upload a file for scanning
 * @param {File} file - The file to scan
 * @returns {Promise<{scan_id: string, status: string}>}
 */
export const createScan = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get scan results by ID
 * @param {string} scanId - The scan ID
 * @returns {Promise<Object>} Scan results
 */
export const getScan = async (scanId) => {
  const response = await api.get(`/api/scan/${scanId}`);
  return response.data;
};

/**
 * Get all scans
 * @returns {Promise<Array<Object>>} List of scans
 */
export const getScans = async () => {
  const response = await api.get('/api/scans');
  return response.data.scans || [];
};

/**
 * Delete a scan by ID
 * @param {string} scanId - The scan ID to delete
 * @returns {Promise<void>}
 */
export const deleteScan = async (scanId) => {
  await api.delete(`/api/scan/${scanId}`);
};

/**
 * Upload a file and poll for results
 * @param {File} file - The file to scan
 * @param {Function} onStatusChange - Callback for status changes
 * @returns {Promise<Object>} Complete scan results
 */
export const createScanWithResults = async (file, onStatusChange) => {
  // Step 1: Upload the file
  onStatusChange?.('uploading');
  const response = await createScan(file);
  const scanId = response.id;
  
  if (!scanId) {
    throw new Error("Failed to get scan ID from response");
  }
  
  // Step 2: Poll for results
  return pollForResults(scanId, onStatusChange);
};

/**
 * Poll for scan results until completion
 * @param {string} scanId - The scan ID to poll
 * @param {Function} onStatusChange - Callback for status changes
 * @param {number} maxAttempts - Maximum polling attempts (default: 60)
 * @param {number} interval - Polling interval in ms (default: 2000)
 * @returns {Promise<Object>} Complete scan results
 */
export const pollForResults = async (
  scanId, 
  onStatusChange, 
  maxAttempts = 60,
  interval = 2000
) => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const result = await getScan(scanId);
    
    onStatusChange?.(result.status, result);
    
    if (result.status === 'completed' || result.status === 'failed') {
      return result;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Scan timed out. Please try again.');
};

/**
 * Get full scan details with vulnerabilities
 * @param {string} scanId - The scan ID
 * @returns {Promise<Object>} Complete scan results with all details
 */
export const getScanResults = async (scanId) => {
  const response = await api.get(`/api/scan/${scanId}`);
  return response.data;
};
