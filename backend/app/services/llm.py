import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.client = None
        if settings.GROQ_API_KEY:
            try:
                import groq
                self.client = groq.Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq client initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")
        else:
            logger.warning("No GROQ_API_KEY found in config")

    def _validate_response(self, result: dict) -> bool:
        required = ["remediation", "old_code", "new_code", "explanation"]
        for key in required:
            val = result.get(key, "")
            if not val or len(str(val).strip()) < 10:
                logger.warning(f"LLM response validation failed for field '{key}': too short or empty")
                return False
        return True

    def generate_remediation(self, vulnerability: dict) -> dict:
        if not self.client:
            logger.warning("No Groq client available, skipping remediation")
            return {"remediation": "", "old_code": "", "new_code": "", "explanation": ""}

        title = vulnerability.get("title", "Unknown")
        severity = vulnerability.get("severity", "LOW").upper()
        tool = vulnerability.get("tool", "unknown").lower()
        file_path = vulnerability.get("file_path", "N/A")
        line_number = vulnerability.get("line_number", 0)
        code_snippet = vulnerability.get("code_snippet", "") or "N/A"

        severity_context = {
            "CRITICAL": "CRITICAL - requires an immediate production-ready fix with thorough explanation.",
            "HIGH": "HIGH severity - provide a robust, well-explained fix.",
            "MEDIUM": "Moderate risk - a proper fix is expected.",
            "LOW": "Low severity - a clear fix is sufficient.",
        }.get(severity, "Provide a proper fix.")

        tool_context = {
            "bandit": "FIX TYPE: Python code vulnerability. Provide corrected Python code with proper imports.",
            "safety": "FIX TYPE: Vulnerable dependency. Specify the minimum safe version to upgrade to.",
            "semgrep": "FIX TYPE: Pattern-based vulnerability. Provide the corrected code snippet.",
        }.get(tool, "FIX TYPE: Provide a code fix.")

        logger.info(f"========== LLM REQUEST ==========")
        logger.info(f"Title: {title} | Severity: {severity} | Tool: {tool}")
        logger.info(f"File: {file_path}:{line_number}")
        logger.info(f"Code snippet: {str(code_snippet)[:200]}...")
        logger.info(f"Severity context: {severity_context}")
        logger.info(f"Tool context: {tool_context}")

        example_json = """{
  "remediation": "os.system() executes commands through the system shell which creates a command injection risk. An attacker can inject malicious shell metacharacters through the input variable. Use subprocess.run() with shell=False and pass commands as a list to prevent injection entirely.",
  "old_code": "os.system(cmd)",
  "new_code": "import subprocess\\nsubprocess.run([cmd], shell=False)",
  "explanation": "shell=False disables shell parsing so input is treated as literal arguments, eliminating injection."
}"""

        system_prompt = f"""You are a precise cybersecurity remediation engine.

IMPORTANT: Respond ONLY with valid JSON. No text outside the JSON.

Your JSON response must contain EXACTLY these 4 keys:
1. "remediation" - 3-4 sentences explaining WHAT the vulnerability is, WHY it is dangerous, and HOW to fix it
2. "old_code" - The EXACT vulnerable code from the input (copy verbatim, do not modify)
3. "new_code" - The COMPLETE working fixed version of the code (include imports, proper syntax)
4. "explanation" - A 1-2 sentence technical summary of why the fix resolves the issue

Current context:
- {severity_context}
- {tool_context}

Example of a correct response for os.system():
{example_json}

All 4 fields are REQUIRED. None may be empty or too short. No text outside the JSON object."""

        user_prompt = f"""Analyze this vulnerability:

Vulnerability: {title}
Severity: {severity}
Tool: {tool}
File: {file_path}:{line_number}

Vulnerable Code:
{code_snippet}

Respond with this exact JSON structure (fill in the values):
{{
  "remediation": "explain this {title} vulnerability in {file_path}, why it is dangerous, and how to fix it with specific code changes",
  "old_code": "{code_snippet}",
  "new_code": "the complete fixed version of the code",
  "explanation": "technical summary of why this fix resolves the issue"
}}"""

        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response = self.client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    max_tokens=1200,
                    temperature=0,
                    response_format={"type": "json_object"},
                )

                result_text = response.choices[0].message.content.strip()
                logger.info(f"attempt {attempt + 1} raw: {result_text[:500]}")

                result = json.loads(result_text)

                if self._validate_response(result):
                    logger.info(f"valid response after {attempt + 1} attempt(s)")
                    return {
                        "remediation": result.get("remediation", ""),
                        "old_code": result.get("old_code", ""),
                        "new_code": result.get("new_code", ""),
                        "explanation": result.get("explanation", ""),
                    }

                logger.warning(f"attempt {attempt + 1} failed validation, retrying")

            except json.JSONDecodeError as e:
                logger.error(f"attempt {attempt + 1} JSON parse error: {e}")
                logger.error(f"raw text: {result_text if 'result_text' in locals() else 'N/A'}")

            except Exception as e:
                logger.error(f"attempt {attempt + 1} error: {e}")

        logger.error(f"LLM failed after {max_attempts} attempts for {title}")
        return {"remediation": "", "old_code": "", "new_code": "", "explanation": ""}

    def is_available(self) -> bool:
        return self.client is not None
