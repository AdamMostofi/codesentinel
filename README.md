# CodeSentinel

An AI-powered security vulnerability scanner that analyzes codebases and provides intelligent remediation guidance.

![CodeSentinel](https://img.shields.io/badge/CodeSentinel-Security%20Scanner-green)
![Next.js](https://img.shields.io/badge/Next.js-14-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-orange)

## 🚀 Overview

CodeSentinel is a web-based security scanning tool that helps developers identify vulnerabilities in their Python codebases. It combines industry-standard security tools (Bandit, Safety) with AI-powered remediation advice to help developers fix security issues quickly.

## 🎯 Features

- **Automated Security Scanning** - Scan Python code for vulnerabilities using Bandit
- **Dependency Analysis** - Check for vulnerable dependencies with Safety
- **AI-Powered Remediation** - Get intelligent fix suggestions powered by Groq LLM
- **Risk Score** - Visual risk assessment (0-100) with severity breakdown
- **Scan History** - Track and review past scans
- **Modern UI** - Dark-themed interface with real-time progress indicators

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Data visualization for vulnerability charts
- **Framer Motion** - Smooth animations
- **Lucide React** - Icon library

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL database toolkit
- **SQLite** - Lightweight database
- **Bandit** - Python security linter
- **Safety** - Python dependency security checker
- **Groq SDK** - LLM integration for AI remediation

## 📸 Screenshots

### Landing Page
- Dark-themed security-focused UI
- Drag & drop file upload
- Real-time connection status

### Results Dashboard
- Risk score gauge (0-100)
- Vulnerability breakdown by severity
- Expandable vulnerability cards with details

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.12+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AdamMostofi/codesentinel.git
cd codesentinel
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_groq_api_key" > .env
```

3. **Set up the frontend**
```bash
cd frontend
npm install
```

### Running the Application

1. **Start the backend**
```bash
cd backend
source venv/bin/activate
python -m app.main
```
Backend runs at: http://localhost:8000

2. **Start the frontend**
```bash
cd frontend
npm run dev
```
Frontend runs at: http://localhost:3000

3. **Open in browser**
Navigate to http://localhost:3000

### Using the Scanner

1. Prepare a `.zip` file containing your Python project
2. Drag & drop the zip file onto the upload area
3. Wait for the scan to complete
4. Review vulnerabilities and AI-powered remediation advice
5. Use the scan history to track improvements over time

## 📁 Project Structure

```
codesentinel/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages and components
│   │   ├── lib/            # API utilities
│   │   └── styles/         # Global styles
│   └── package.json
│
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Configuration
│   │   ├── models/        # Database models
│   │   └── services/      # Business logic
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan` | Upload zip file and start scan |
| GET | `/api/scans` | List all scans |
| GET | `/api/scan/{id}` | Get scan details |
| DELETE | `/api/scan/{id}` | Delete a scan |
| GET | `/health` | Health check |

## 🐛 Known Issues

- Scan history initially returned wrong data structure (fixed in later commit)
- Groq API key required for AI remediation features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is for educational purposes.

## 👤 Author

- GitHub: [AdamMostofi](https://github.com/AdamMostofi)

## 🙏 Acknowledgments

- [Bandit](https://bandit.readthedocs.io/) - Security linting
- [Safety](https://safety.pyup.io/) - Dependency checking
- [Groq](https://groq.com/) - LLM API for AI remediation
- [Next.js](https://nextjs.org/) - Frontend framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
