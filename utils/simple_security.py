import logging
from typing import Dict, List, Any

class SimpleSecurityAnalyzer:
    def __init__(self):
        self.php_patterns = {
            'sql_injection': [
                r'\$_GET\[.*\].*mysql_query',
                r'\$_POST\[.*\].*mysql_query', 
                r'SELECT.*\$_',
                r'INSERT.*\$_',
                r'UPDATE.*\$_',
                r'DELETE.*\$_'
            ],
            'xss': [
                r'echo\s+\$_',
                r'print\s+\$_',
                r'<\?=\s*\$_'
            ],
            'file_inclusion': [
                r'include\s*\(\s*\$_',
                r'require\s*\(\s*\$_',
                r'include_once\s*\(\s*\$_',
                r'require_once\s*\(\s*\$_'
            ],
            'code_execution': [
                r'eval\s*\(',
                r'system\s*\(',
                r'exec\s*\(',
                r'shell_exec\s*\(',
                r'passthru\s*\('
            ]
        }
        
        self.python_patterns = {
            'code_injection': [
                r'eval\s*\(',
                r'exec\s*\(',
                r'compile\s*\('
            ],
            'command_injection': [
                r'os\.system\s*\(',
                r'subprocess.*shell\s*=\s*True',
                r'commands\.',
                r'popen\s*\('
            ],
            'sql_injection': [
                r'cursor\.execute\s*\(\s*["\'][^"\']*%[sd]',
                r'\.format\s*\([^)]*\).*SELECT',
                r'f["\'][^"\']*SELECT.*\{'
            ],
            'deserialization': [
                r'pickle\.loads\s*\(',
                r'yaml\.load\s*\(',
                r'marshal\.loads\s*\('
            ]
        }

    def analyze_code_security(self, code: str, language: str, model: str, ai_service) -> Dict[str, Any]:
        """Simple security analysis for PHP or Python code"""
        try:
            if not code.strip():
                return self._create_empty_analysis(language)
            
            # Try AI analysis first if available
            if ai_service and ai_service.api_key and model:
                try:
                    return self._ai_security_analysis(code, language, model, ai_service)
                except Exception as e:
                    logging.warning(f"AI analysis failed: {str(e)}, falling back to pattern matching")
            
            # Fallback to pattern-based analysis
            return self._pattern_security_analysis(code, language)
            
        except Exception as e:
            logging.error(f"Security analysis error: {str(e)}")
            return self._create_error_analysis(language, str(e))

    def _ai_security_analysis(self, code: str, language: str, model: str, ai_service) -> Dict[str, Any]:
        """AI-powered security analysis"""
        if language.lower() == 'php':
            prompt = f"""Analyze this PHP code for security vulnerabilities. Return JSON format:
{{
    "vulnerabilities_found": 0,
    "security_score": 100,
    "overall_assessment": "description",
    "issues": [
        {{
            "type": "vulnerability_type",
            "severity": "High|Medium|Low",
            "line": 1,
            "title": "Issue title",
            "description": "What's wrong",
            "fix": "How to fix it"
        }}
    ],
    "recommendations": ["security tips"]
}}

PHP Code:
```php
{code}
```"""
        else:
            prompt = f"""Analyze this Python code for security vulnerabilities. Return JSON format:
{{
    "vulnerabilities_found": 0,
    "security_score": 100,
    "overall_assessment": "description",
    "issues": [
        {{
            "type": "vulnerability_type", 
            "severity": "High|Medium|Low",
            "line": 1,
            "title": "Issue title",
            "description": "What's wrong",
            "fix": "How to fix it"
        }}
    ],
    "recommendations": ["security tips"]
}}

Python Code:
```python
{code}
```"""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        response = ai_service._make_chat_request(messages, model)
        
        # Try to parse JSON response
        import json
        try:
            # Clean response
            clean_response = response.strip()
            if clean_response.startswith('```json'):
                clean_response = clean_response[7:]
            if clean_response.startswith('```'):
                clean_response = clean_response[3:]
            if clean_response.endswith('```'):
                clean_response = clean_response[:-3]
            
            result = json.loads(clean_response.strip())
            result['language'] = language.upper()
            return result
            
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return self._parse_ai_text_response(response, language)

    def _pattern_security_analysis(self, code: str, language: str) -> Dict[str, Any]:
        """Pattern-based security analysis"""
        import re
        
        patterns = self.php_patterns if language.lower() == 'php' else self.python_patterns
        issues = []
        lines = code.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            for vuln_type, pattern_list in patterns.items():
                for pattern in pattern_list:
                    if re.search(pattern, line, re.IGNORECASE):
                        issues.append({
                            "type": vuln_type,
                            "severity": "Medium",
                            "line": line_num,
                            "title": f"Potential {vuln_type.replace('_', ' ').title()}",
                            "description": f"Found pattern that may indicate {vuln_type.replace('_', ' ')}",
                            "fix": f"Review and secure this {vuln_type.replace('_', ' ')} vulnerability",
                            "code_snippet": line.strip()
                        })
        
        # Calculate score
        score = max(50, 100 - (len(issues) * 15))
        
        return {
            "vulnerabilities_found": len(issues),
            "security_score": score,
            "overall_assessment": f"Pattern-based analysis found {len(issues)} potential issues",
            "issues": issues,
            "recommendations": self._get_recommendations(language),
            "language": language.upper()
        }

    def _parse_ai_text_response(self, response: str, language: str) -> Dict[str, Any]:
        """Parse AI response when JSON parsing fails"""
        # Simple fallback analysis
        issues_count = response.lower().count('vulnerability') + response.lower().count('security')
        score = max(60, 100 - (issues_count * 10))
        
        return {
            "vulnerabilities_found": min(issues_count, 5),
            "security_score": score,
            "overall_assessment": "AI analysis completed (text format)",
            "issues": [],
            "recommendations": self._get_recommendations(language),
            "language": language.upper(),
            "raw_analysis": response[:500]  # Truncate long responses
        }

    def _create_empty_analysis(self, language: str) -> Dict[str, Any]:
        """Return analysis for empty code"""
        return {
            "vulnerabilities_found": 0,
            "security_score": 100,
            "overall_assessment": "No code provided for analysis",
            "issues": [],
            "recommendations": ["Please provide code to analyze"],
            "language": language.upper()
        }

    def _create_error_analysis(self, language: str, error: str) -> Dict[str, Any]:
        """Return analysis when error occurs"""
        return {
            "vulnerabilities_found": 0,
            "security_score": 80,
            "overall_assessment": f"Analysis error occurred",
            "issues": [],
            "recommendations": ["Please check your code and try again"],
            "language": language.upper(),
            "error": error
        }

    def _get_recommendations(self, language: str) -> List[str]:
        """Get security recommendations by language"""
        if language.lower() == 'php':
            return [
                "Use prepared statements for database queries",
                "Escape output with htmlspecialchars()",
                "Validate and sanitize all user inputs",
                "Implement CSRF protection",
                "Use secure session handling"
            ]
        else:
            return [
                "Avoid eval(), exec(), and compile() functions",
                "Use parameterized queries for databases",
                "Validate all user inputs",
                "Use subprocess with shell=False",
                "Store secrets in environment variables"
            ]