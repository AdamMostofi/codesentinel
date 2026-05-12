# CodeSentinel

An AI-powered security vulnerability scanner for Python codebases that combines industry-standard security tools with intelligent remediation guidance.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-blue?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-orange?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12+-green?logo=python)](https://python.org/)

## Features

- **Multi-Tool Security Scanning** - Combines Bandit, Safety, and Semgrep for comprehensive analysis
- **Risk Score Calculation** - Visual risk assessment (0-100) with severity breakdown
- **Scan History** - Track and review past scans with local SQLite storage
- **Modern UI** - Dark/light theme with real-time progress indicators
- **ZIP File Upload** - Easy project submission via drag-and-drop upload
- **AI Remediation** - Groq API integration for intelligent fix suggestions with vulnerable vs fixed code comparison

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| Tailwind CSS | v4 | Utility-first CSS framework |
| Framer Motion | 12.36.0 | Smooth animations |
| Recharts | 3.8.0 | Data visualization |
| Lucide React | 0.577.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109.0 | Modern Python web framework |
| SQLAlchemy | 2.0.25 | ORM and database toolkit |
| Bandit | 1.7.8 | Python SAST security linter |
| Safety | 3.2.0 | Python dependency security checker |
| Semgrep | 1.77.0 | Community Edition static analysis |
| Groq SDK | 1.2.0 | LLM integration (optional) |

## Getting Started

### Prerequisites

| Platform | Requirements | Install Command |
|----------|-------------|-----------------|
| **Linux** | Python 3.12+, Node.js 18+, pip | `sudo apt install python3 python3-pip nodejs` |
| **macOS** | Python 3.12+, Node.js 18+, pip | `brew install python node` |
| **Windows** | Python 3.12+, Node.js 18+, pip | Download from [python.org](https://python.org) / [nodejs.org](https://nodejs.org) |
| **WSL** | Python 3.12+, Node.js 18+, pip | `sudo apt install python3 python3-pip nodejs` |

### Installation

<details>
<summary><b>Linux / macOS / WSL</b></summary>

```bash
# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy environment template and add your Groq API key
cp .env.example .env
# Edit .env to add GROQ_API_KEY (optional, for AI remediation)

# Frontend setup
cd ../frontend
npm install
```
</details>

<details>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy environment template and add your Groq API key
copy .env.example .env
# Edit .env to add GROQ_API_KEY (optional, for AI remediation)

# Frontend setup
cd ../frontend
npm install
```
</details>

<details>
<summary><b>Windows (cmd.exe)</b></summary>

```cmd
:: Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

:: Copy environment template and add your Groq API key
copy .env.example .env

:: Frontend setup
cd ../frontend
npm install
```
</details>

### Running the Application

<div style="padding-left: 1em; border-left: 3px solid #3b82f6;">
<p><strong>First time?</strong> Delete the database to start fresh: <code>rm backend/app/codesentinel.db</code> (or <code>del backend\app\codesentinel.db</code> on Windows cmd)</p>
</div>

<details>
<summary><b>Linux / macOS / WSL</b></summary>

```bash
# Terminal 1 — Start backend (runs on http://localhost:8000)
cd backend
source venv/bin/activate
python -m app.main

# Terminal 2 — Start frontend (runs on http://localhost:3000)
cd frontend
npm run dev
```
</details>

<details>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
# Terminal 1 — Start backend (runs on http://localhost:8000)
cd backend
.\venv\Scripts\Activate.ps1
python -m app.main

# Terminal 2 — Start frontend (runs on http://localhost:3000)
cd frontend
npm run dev
```
</details>

<details>
<summary><b>Windows (cmd.exe)</b></summary>

```cmd
:: Terminal 1 — Start backend (runs on http://localhost:8000)
cd backend
venv\Scripts\activate
python -m app.main

:: Terminal 2 — Start frontend (runs on http://localhost:3000)
cd frontend
npm run dev
```
</details>

**Open in browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | Free API key from [console.groq.com](https://console.groq.com) — enables AI-powered remediation with old/new code comparison |
| `GROQ_MODEL` | No | LLM model name (default: `llama-3.3-70b-versatile`)

## Usage

1. Prepare a `.zip` file containing your Python project
2. Drag and drop the zip file onto the upload area
3. Wait for the scan to complete
4. Review vulnerabilities grouped by severity
5. View AI-powered remediation advice (if `GROQ_API_KEY` is configured)
6. Use scan history to track improvements over time

## Project Structure

```
codesentinel/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # API endpoints
│   │   ├── core/config.py         # Configuration settings
│   │   ├── database.py            # Database connection
│   │   ├── main.py                # FastAPI application entry
│   │   ├── models/scan.py         # SQLAlchemy models
│   │   └── services/
│   │       ├── file_handler.py    # ZIP upload handling
│   │       ├── llm.py             # Groq LLM integration
│   │       └── scanner.py         # Security scanning logic
│   ├── .env.example
│   ├── codesentinel.db            # SQLite database
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.jsx           # Main application page
│   │   │   ├── layout.jsx         # Root layout
│   │   │   └── globals.css        # Global styles
│   │   └── lib/api.js             # API client
│   ├── package.json
│   └── ...
├── .gitignore
├── LICENSE
└── README.md
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Upload a `.zip` file and start a security scan |
| `GET` | `/api/scans` | List all scans with summary information |
| `GET` | `/api/scan/{scan_id}` | Get detailed scan results including all vulnerabilities |
| `DELETE` | `/api/scan/{scan_id}` | Delete a scan and its associated files |
| `GET` | `/health` | Health check endpoint |

### Example Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "project_name": "my-project.zip",
  "status": "completed",
  "risk_score": 72,
  "vulnerability_count": 8,
  "vulnerabilities_by_severity": {
    "HIGH": 3,
    "MEDIUM": 4,
    "LOW": 1
  },
  "vulnerabilities": [
    {
      "tool": "bandit",
      "severity": "HIGH",
      "title": "Possible SQL Injection",
      "file_path": "app/db.py",
      "line_number": 42,
      "code_snippet": "cursor.execute('SELECT * FROM users WHERE id = ' + user_id)",
      "remediation": "This is an SQL injection vulnerability caused by string concatenation in the query. An attacker can inject malicious SQL through the user_id parameter. Use parameterized queries with placeholders to safely separate code from data.",
      "explanation": "Parameterized queries prevent injection by treating user input as data, not executable SQL code.",
      "old_code": "cursor.execute('SELECT * FROM users WHERE id = ' + user_id)",
      "new_code": "cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))"
    }
  ]
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

## Acknowledgments

- [Bandit](https://bandit.readthedocs.io/) - Security linting for Python
- [Safety](https://safety.pyup.io/) - Dependency security checker
- [Semgrep](https://semgrep.dev/) - Static analysis engine (Community Edition)
- [Groq](https://groq.com/) - LLM API for AI remediation
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [Next.js](https://nextjs.org/) - React framework
