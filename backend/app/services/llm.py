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

    def generate_remediation(self, vulnerability: dict) -> dict:
        """Generate remediation advice with old/new code for a vulnerability.
        
        Returns:
            dict with keys: remediation, old_code, new_code, explanation
        """
        if not self.client:
            logger.warning("No Groq client available, skipping remediation")
            return {"remediation": "", "old_code": "", "new_code": "", "explanation": ""}

        title = vulnerability.get("title", "Unknown")
        severity = vulnerability.get("severity", "LOW")
        file_path = vulnerability.get("file_path", "N/A")
        line_number = vulnerability.get("line_number", 0)
        code_snippet = vulnerability.get("code_snippet", "") or "N/A"
        description = vulnerability.get("description", "") or "N/A"

        logger.info(f"========== LLM REQUEST ==========")
        logger.info(f"Title: {title}")
        logger.info(f"Severity: {severity}")
        logger.info(f"File: {file_path}:{line_number}")
        logger.info(f"Code snippet: {code_snippet[:200]}...")

        system_prompt = """You are a senior cybersecurity expert with deep knowledge of secure coding practices. 
Your task is to analyze vulnerability findings from security scans and provide detailed, actionable remediation advice.

IMPORTANT: You MUST respond with VALID JSON only. No other text.
Format your response as a JSON object with these 4 EXACT field names:
1. "remediation" - Detailed explanation (3-4 sentences) covering: WHAT the vulnerability is, WHY it's dangerous, and HOW to fix it
2. "old_code" - The EXACT vulnerable code from the provided snippet
3. "new_code" - The COMPLETE, working fixed version of the code  
4. "explanation" - Brief technical explanation (1-2 sentences)

Respond ONLY with the JSON object. No explanations outside the JSON."""

        user_prompt = f"""VULNERABLE CODE:
{code_snippet}

IMPORTANT: 
- "remediation" must be 3-4 SENTENCES explaining WHAT, WHY, and HOW
- "old_code" must be the EXACT code from above: {code_snippet}
- "new_code" must be a COMPLETE working fix (include imports if needed)
- "explanation" must be 1-2 sentences maximum

Respond with this EXACT JSON format:
{{
  "remediation": "detailed 3-4 sentence explanation",
  "old_code": "exact vulnerable code",
  "new_code": "complete fixed code",
  "explanation": "brief technical summary"
}}"""

        title = vulnerability.get("title", "Unknown")
        severity = vulnerability.get("severity", "LOW")
        file_path = vulnerability.get("file_path", "N/A")
        line_number = vulnerability.get("line_number", 0)
        code_snippet = vulnerability.get("code_snippet", "") or "N/A"
        description = vulnerability.get("description", "") or "N/A"

        system_prompt = """You are a senior cybersecurity expert with deep knowledge of secure coding practices. 
Your task is to analyze vulnerability findings from security scans and provide detailed, actionable remediation advice.

For each vulnerability, respond ONLY with a JSON object containing:
1. "remediation" - A detailed explanation (3-4 sentences) covering: WHAT the vulnerability is, WHY it's dangerous, and HOW to fix it
2. "old_code" - The exact vulnerable code from the provided snippet (preserve original)
3. "new_code" - The fully corrected, secure version of the code
4. "explanation" - A brief technical explanation of the fix (1-2 sentences)

Respond ONLY with valid JSON. No other text."""

        user_prompt = f"""Analyze this security vulnerability in detail:

Title: {title}
Severity: {severity}
File: {file_path}
Line: {line_number}

Vulnerable Code Snippet:
{code_snippet}

Description from scanner: {description}

Provide your response as JSON with these 4 fields:
{{
  "remediation": "detailed explanation (3-4 sentences about what, why, and how to fix)",
  "old_code": "the exact vulnerable code snippet",
  "new_code": "the fixed, secure version of the code",
  "explanation": "technical explanation of the fix (1-2 sentences)"
}}"""

        try:
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=800,
                temperature=0.3,
                response_format={"type": "json_object"}
            )

            result_text = response.choices[0].message.content.strip()
            logger.info(f"========== LLM RAW RESPONSE ==========")
            logger.info(f"Title: {title}")
            logger.info(f"Raw response: {result_text[:500]}")
            logger.info(f"=====================================")

            result = json.loads(result_text)

            remediation = result.get("remediation", "")
            old_code = result.get("old_code", "")
            new_code = result.get("new_code", "")
            explanation = result.get("explanation", "")

            logger.info(f"========== LLM PARSED RESULT ==========")
            logger.info(f"remediation ({len(remediation)} chars): {remediation[:200]}...")
            logger.info(f"old_code: {old_code}")
            logger.info(f"new_code: {new_code}")
            logger.info(f"explanation: {explanation}")
            logger.info(f"======================================")

            if not remediation:
                logger.warning(f"LLM returned EMPTY remediation for {title}")

            return {
                "remediation": remediation,
                "old_code": old_code,
                "new_code": new_code,
                "explanation": explanation
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response for {title}: {e}")
            logger.error(f"Raw response was: {result_text if 'result_text' in locals() else 'N/A'}")
            return {"remediation": "", "old_code": "", "new_code": "", "explanation": ""}
        except Exception as e:
            logger.error(f"LLM error for {title}: {e}")
            return {"remediation": "", "old_code": "", "new_code": "", "explanation": ""}

    def is_available(self) -> bool:
        """Check if LLM service is available"""
        return self.client is not None