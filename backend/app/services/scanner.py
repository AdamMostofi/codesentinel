import subprocess
import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class SecurityScanner:
    def __init__(self, extract_dir: str):
        self.extract_dir = Path(extract_dir)
        logger.info(f"SecurityScanner initialized for: {self.extract_dir}")

    def run_bandit(self) -> List[Dict[str, Any]]:
        """Run Bandit on extracted Python files"""
        logger.info("Starting Bandit security scan")
        results = []

        python_files = list(self.extract_dir.rglob("*.py"))
        logger.info(f"Found {len(python_files)} Python files to scan")

        if not python_files:
            logger.info("No Python files found to scan")
            return results

        bandit_json_file = self.extract_dir / "bandit_results.json"

        try:
            cmd = [
                "bandit",
                "-r",
                str(self.extract_dir),
                "-f",
                "json",
                "-o",
                str(bandit_json_file),
                "--exclude",
                "tests,test",
            ]
            logger.info(f"Running Bandit: {' '.join(cmd)}")

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            logger.info(f"Bandit scan completed with return code: {result.returncode}")

            if bandit_json_file.exists():
                with open(bandit_json_file, "r") as f:
                    try:
                        data = json.load(f)
                        if "results" in data:
                            for issue in data["results"]:
                                results.append(
                                    {
                                        "tool": "bandit",
                                        "severity": issue.get("issue_severity", "LOW"),
                                        "title": issue.get(
                                            "issue_text", "Unknown issue"
                                        ),
                                        "description": self._get_bandit_description(
                                            issue
                                        ),
                                        "file_path": issue.get("filename", ""),
                                        "line_number": issue.get("line_number", 0),
                                        "code_snippet": issue.get("code", ""),
                                        "raw_output": json.dumps(issue),
                                    }
                                )
                    except json.JSONDecodeError:
                        pass

                bandit_json_file.unlink()

        except subprocess.TimeoutExpired:
            print("Bandit scan timed out")
        except Exception as e:
            print(f"Bandit error: {e}")

        return results

    def run_safety(self) -> List[Dict[str, Any]]:
        """Run Safety on requirements.txt if exists"""
        results = []

        req_files = list(self.extract_dir.rglob("requirements.txt"))

        if not req_files:
            return results

        safety_json_file = self.extract_dir / "safety_results.json"

        for req_file in req_files:
            try:
                cmd = [
                    "safety",
                    "check",
                    "-r",
                    str(req_file),
                    "--json",
                    "--output",
                    str(safety_json_file),
                ]

                result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

                if safety_json_file.exists():
                    with open(safety_json_file, "r") as f:
                        try:
                            data = json.load(f)
                            if isinstance(data, list):
                                for issue in data:
                                    results.append(
                                        {
                                            "tool": "safety",
                                            "severity": "HIGH",
                                            "title": issue.get(
                                                "vulnerability", "Unknown vulnerability"
                                            ),
                                            "description": f"CVE: {issue.get('cve', 'N/A')}",
                                            "file_path": str(req_file),
                                            "line_number": 0,
                                            "code_snippet": f"Package: {issue.get('package', 'N/A')}, Version: {issue.get('installed_version', 'N/A')}",
                                            "raw_output": json.dumps(issue),
                                        }
                                    )
                        except json.JSONDecodeError:
                            pass

                    safety_json_file.unlink()

            except subprocess.TimeoutExpired:
                print(f"Safety scan timed out for {req_file}")
            except Exception as e:
                print(f"Safety error: {e}")

        return results

    def _get_bandit_description(self, issue: Dict) -> str:
        """Generate human-readable description for Bandit issue"""
        issue_id = issue.get("issue_id", "")
        test_name = issue.get("test_name", "")

        descriptions = {
            "B101": "Uses a hardcoded password in the code",
            "B102": "Executes a shell command that contains user input",
            "B103": "Sets permissions on a file/directory",
            "B104": "Hardcoded binding to all network interfaces",
            "B105": "Hardcoded password string literal",
            "B106": "Uses cryptographic feature with hardcoded key",
            "B107": "Hardcoded password in function call",
            "B108": "Hardcoded tmp directory",
            "B110": "Try/except with broad exception",
            "B112": "Try/except with broad exception",
            "B201": "Uses pickle.load() with untrusted input",
            "B301": "Uses pickle rather than json",
            "B302": "Uses marshal rather than json",
            "B303": "Uses md5 hash",
            "B304": "Uses cryptographic feature with insecure hash",
            "B305": "Uses insecure cipher",
            "B306": "Uses mktemp/tempnam",
            "B307": "Uses eval",
            "B308": "Uses mark_safe",
            "B310": "Audit url open for proper scheme",
            "B311": "Uses random for security",
            "B312": "Uses xml bad parser",
            "B313": "Uses xml bad cElementTree",
            "B314": "Uses xml bad ElementTree",
            "B315": "Uses xml bad Expat",
            "B316": "Uses xml bad ReDOS",
            "B317": "Uses xml bad SAX",
            "B318": "Uses xml bad XMLRPC",
            "B319": "Uses xml bad pull parser",
            "B320": "Uses xml bad defused",
            "B321": "Imports suspicious module",
            "B322": "Uses int() without base",
            "B401": "Imports telnetlib",
            "B402": "Misuse of httpoxy",
            "B403": " pickle",
            "B404": "Imports subprocess",
            "B405": "Import xml",
            "B406": "Import xml sax",
            "B407": "Import xml expat",
            "B408": "Import xml minidom",
            "B409": "Import xml pulldom",
            "B410": "Import xml etree",
            "B411": "Import ftplib",
            "B412": "Import telnetlib",
            "B413": "Import pycrypto",
            "B414": "Uses DES cipher",
            "B415": "Uses RC4 cipher",
            "B416": "Uses hashlib without usedforsecurity",
            "B417": "Uses cryptography with usedforsecurity=False",
            "B501": "Request with no cert verification",
            "B502": "SSL verification disabled",
            "B503": "SSL context with check_hostname disabled",
            "B504": "SSL context with verify_mode disabled",
            "B505": "Weak cryptographic key",
            "B506": "YAML load without Loader",
            "B601": "Paramiko call",
            "B602": "Subprocess call with shell=True",
            "B603": "Subprocess call without check",
            "B604": "Any other function call with shell=True",
            "B606": "start_process with shell=True",
            "B607": "os.system call",
            "B608": "Hardcoded temp file/directory",
            "B701": "Uses xml to load external entity",
            "B702": "Uses漆ML",
            "B703": "Uses xml bad parser",
        }

        return descriptions.get(
            issue_id, f"{test_name}: {issue.get('issue_text', 'Security issue found')}"
        )

    def scan(self) -> Dict[str, Any]:
        """Run both Bandit and Safety scans"""
        logger.info("Starting full security scan")
        vulnerabilities = []

        bandit_results = self.run_bandit()
        vulnerabilities.extend(bandit_results)
        logger.info(f"Bandit scan found {len(bandit_results)} vulnerabilities")

        safety_results = self.run_safety()
        vulnerabilities.extend(safety_results)
        logger.info(f"Safety scan found {len(safety_results)} vulnerabilities")

        by_severity = self._count_by_severity(vulnerabilities)
        risk_score = self._calculate_risk_score(vulnerabilities)

        logger.info(
            f"Security scan complete - Total: {len(vulnerabilities)}, Risk score: {risk_score}, By severity: {by_severity}"
        )

        return {
            "vulnerabilities": vulnerabilities,
            "total": len(vulnerabilities),
            "by_severity": by_severity,
            "risk_score": risk_score,
        }

    def _count_by_severity(self, vulnerabilities: List[Dict]) -> Dict[str, int]:
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for vuln in vulnerabilities:
            sev = vuln.get("severity", "LOW")
            sev_key = sev.lower()
            if sev_key in counts:
                counts[sev_key] += 1
            elif sev_key == "error":
                counts["high"] += 1
        return counts

    def _calculate_risk_score(self, vulnerabilities: List[Dict]) -> int:
        if not vulnerabilities:
            return 0

        weights = {"critical": 10, "high": 7, "medium": 4, "low": 1}

        total = 0
        for vuln in vulnerabilities:
            sev = vuln.get("severity", "LOW").lower()
            weight = weights.get(sev, 1)
            total += weight

        max_score = 100
        score = min(total, max_score)

        return score
