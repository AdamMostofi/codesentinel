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
- **AI Remediation Ready** - Optional Groq API integration for intelligent fix suggestions

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
| Groq SDK | 0.4.2 | LLM integration (optional) |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- pip (Python package manager)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/AdamMostofi/codesentinel.git
cd codesentinel
```

**2. Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
# Edit .env and add your Groq API key (optional, for AI remediation)
```

**3. Set up the frontend**
```bash
cd frontend
npm install
```

### Running the Application

**Start the backend** (runs on http://localhost:8000)
```bash
cd backend
source venv/bin/activate
python -m app.main
```

**Start the frontend** (runs on http://localhost:3000)
```bash
cd frontend
npm run dev
```

**Open in browser**
Navigate to http://localhost:3000

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | Free API key from [console.groq.com](https://console.groq.com) for AI-powered remediation suggestions |

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
      "remediation": "Use parameterized queries instead..."
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
