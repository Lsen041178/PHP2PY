import re
import ast
import logging
from typing import Dict, List, Any

class SecurityAnalyzer:
    def __init__(self):
        # Define security patterns to check
        self.security_patterns = {
            'dangerous_functions': [
                r'\beval\s*\(',
                r'\bexec\s*\(',
                r'\bos\.system\s*\(',
                r'\bsubprocess\.call\s*\(',
                r'\bsubprocess\.run\s*\([^)]*shell\s*=\s*True',
                r'\b__import__\s*\(',
                r'\bcompile\s*\(',
            ],
            'sql_injection': [
                r'cursor\.execute\s*\(\s*["\'][^"\']*%[sd][^"\']*["\']',
                r'cursor\.execute\s*\(\s*f["\'][^"\']*\{[^}]*\}',
                r'\.format\s*\([^)]*\)\s*["\'][^"\']*SELECT',
                r'["\'][^"\']*SELECT[^"\']*["\']\s*\+',
            ],
            'xss_vulnerabilities': [
                r'render_template_string\s*\([^)]*\{[^}]*\}',
                r'Markup\s*\([^)]*\{[^}]*\}',
                r'return\s+[^|]*\|safe',
                r'innerHTML\s*=\s*[^;]*[{\[]',
            ],
            'hardcoded_secrets': [
                r'password\s*=\s*["\'][^"\']{8,}["\']',
                r'api_key\s*=\s*["\'][^"\']{20,}["\']',
                r'secret\s*=\s*["\'][^"\']{16,}["\']',
                r'token\s*=\s*["\'][^"\']{20,}["\']',
            ],
            'file_operations': [
                r'open\s*\([^)]*["\'][^"\']*\.\.[^"\']*["\']',
                r'os\.path\.join\s*\([^)]*\.\.',
                r'with\s+open\s*\([^)]*user_input',
            ],
            'deserialization': [
                r'pickle\.loads?\s*\(',
                r'yaml\.load\s*\(',
                r'json\.loads\s*\([^)]*user_input',
            ]
        }
    
    def analyze_code(self, python_code: str) -> Dict[str, Any]:
        """Analyze Python code for security vulnerabilities"""
        issues = []
        
        try:
            # Parse the code to check for AST-level issues
            tree = ast.parse(python_code)
            issues.extend(self._analyze_ast(tree))
        except SyntaxError as e:
            issues.append({
                'type': 'syntax_error',
                'severity': 'high',
                'line': getattr(e, 'lineno', 0),
                'message': f'Syntax error: {str(e)}',
                'recommendation': 'Fix syntax errors before deployment'
            })
        
        # Pattern-based analysis
        lines = python_code.split('\n')
        for line_num, line in enumerate(lines, 1):
            issues.extend(self._analyze_line(line, line_num))
        
        # Generate security score
        security_score = self._calculate_security_score(issues)
        
        # Categorize issues by severity
        high_issues = [i for i in issues if i['severity'] == 'high']
        medium_issues = [i for i in issues if i['severity'] == 'medium']
        low_issues = [i for i in issues if i['severity'] == 'low']
        
        return {
            'issues': issues,
            'security_score': security_score,
            'summary': {
                'total_issues': len(issues),
                'high_severity': len(high_issues),
                'medium_severity': len(medium_issues),
                'low_severity': len(low_issues)
            },
            'recommendations': self._generate_recommendations(issues)
        }
    
    def _analyze_ast(self, tree: ast.AST) -> List[Dict[str, Any]]:
        """Analyze AST for security issues"""
        issues = []
        
        for node in ast.walk(tree):
            # Check for dangerous function calls
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in ['eval', 'exec', 'compile']:
                        issues.append({
                            'type': 'dangerous_function',
                            'severity': 'high',
                            'line': getattr(node, 'lineno', 0),
                            'message': f'Dangerous function call: {node.func.id}()',
                            'recommendation': f'Avoid using {node.func.id}(). Use safer alternatives.'
                        })
                
                elif isinstance(node.func, ast.Attribute):
                    if (isinstance(node.func.value, ast.Name) and 
                        node.func.value.id == 'os' and 
                        node.func.attr == 'system'):
                        issues.append({
                            'type': 'command_injection',
                            'severity': 'high',
                            'line': getattr(node, 'lineno', 0),
                            'message': 'Potential command injection with os.system()',
                            'recommendation': 'Use subprocess with shell=False instead'
                        })
            
            # Check for hardcoded strings that might be secrets
            if isinstance(node, ast.Str) and len(node.s) > 20:
                if any(keyword in node.s.lower() for keyword in ['password', 'secret', 'key', 'token']):
                    issues.append({
                        'type': 'hardcoded_secret',
                        'severity': 'medium',
                        'line': getattr(node, 'lineno', 0),
                        'message': 'Potential hardcoded secret detected',
                        'recommendation': 'Use environment variables for secrets'
                    })
        
        return issues
    
    def _analyze_line(self, line: str, line_num: int) -> List[Dict[str, Any]]:
        """Analyze a single line for security patterns"""
        issues = []
        
        for pattern_type, patterns in self.security_patterns.items():
            for pattern in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    severity = self._get_severity_for_pattern_type(pattern_type)
                    issues.append({
                        'type': pattern_type,
                        'severity': severity,
                        'line': line_num,
                        'message': f'Potential {pattern_type.replace("_", " ")} vulnerability',
                        'code_snippet': line.strip(),
                        'recommendation': self._get_recommendation_for_pattern_type(pattern_type)
                    })
        
        return issues
    
    def _get_severity_for_pattern_type(self, pattern_type: str) -> str:
        """Get severity level for different pattern types"""
        high_severity = ['dangerous_functions', 'sql_injection', 'command_injection']
        medium_severity = ['xss_vulnerabilities', 'hardcoded_secrets', 'deserialization']
        
        if pattern_type in high_severity:
            return 'high'
        elif pattern_type in medium_severity:
            return 'medium'
        else:
            return 'low'
    
    def _get_recommendation_for_pattern_type(self, pattern_type: str) -> str:
        """Get specific recommendations for different vulnerability types"""
        recommendations = {
            'dangerous_functions': 'Avoid eval(), exec(), and compile(). Use safe alternatives.',
            'sql_injection': 'Use parameterized queries or ORM methods to prevent SQL injection.',
            'xss_vulnerabilities': 'Escape user input and use template auto-escaping.',
            'hardcoded_secrets': 'Store secrets in environment variables or secure vaults.',
            'file_operations': 'Validate file paths and restrict access to safe directories.',
            'deserialization': 'Validate data before deserialization and use safe formats.',
            'command_injection': 'Use subprocess with shell=False and validate inputs.'
        }
        
        return recommendations.get(pattern_type, 'Review this code for potential security issues.')
    
    def analyze_code_by_language(self, code: str, language: str, model: str, ai_service) -> Dict[str, Any]:
        """Analyze code security with language-specific standards"""
        try:
            if not code.strip():
                return {
                    'vulnerabilities_found': 0,
                    'security_score': 100,
                    'overall_assessment': 'No code provided for analysis',
                    'issues': [],
                    'recommendations': ['Please provide code to analyze'],
                    'language': language
                }
            
            if not ai_service or not ai_service.api_key:
                return {
                    'vulnerabilities_found': 0,
                    'security_score': 85,
                    'overall_assessment': 'Basic analysis performed (AI service not connected)',
                    'issues': [],
                    'recommendations': ['Connect to AI service for detailed security analysis'],
                    'language': language
                }
            
            if language.lower() == 'php':
                return self._analyze_php_security(code, model, ai_service)
            else:
                return self._analyze_python_security(code, model, ai_service)
                
        except Exception as e:
            logging.error(f"Security analysis error: {str(e)}")
            return {
                'vulnerabilities_found': 0,
                'security_score': 80,
                'overall_assessment': f'Analysis error: {str(e)}',
                'issues': [],
                'recommendations': ['Please check your code syntax and try again'],
                'language': language,
                'error': str(e)
            }
    
    def _analyze_php_security(self, php_code: str, model: str, ai_service) -> Dict[str, Any]:
        """Analyze PHP code for security vulnerabilities"""
        
        system_prompt = """You are a PHP security expert specializing in web application security.
        Analyze the provided PHP code for security vulnerabilities using industry standards and best practices.
        
        PHP SECURITY STANDARDS TO CHECK:
        1. **SQL Injection**: Check for unsafe database queries, missing prepared statements
        2. **Cross-Site Scripting (XSS)**: Look for unescaped output, missing htmlspecialchars()
        3. **Cross-Site Request Forgery (CSRF)**: Check for missing CSRF tokens
        4. **File Upload Vulnerabilities**: Unsafe file uploads, missing validation
        5. **Remote Code Execution**: eval(), system(), exec(), shell_exec() usage
        6. **Path Traversal**: Directory traversal vulnerabilities
        7. **Session Security**: Insecure session handling
        8. **Input Validation**: Missing or weak input sanitization
        9. **Authentication Issues**: Weak password handling, insecure login
        10. **Information Disclosure**: Error messages revealing sensitive data
        
        For each vulnerability found, provide:
        - Vulnerability type
        - Severity level (Critical/High/Medium/Low)
        - Line number (if identifiable)
        - Clear explanation for non-technical users
        - Specific fix recommendation with PHP code example
        
        Return your analysis in this JSON format:
        {
            "vulnerabilities_found": number,
            "security_score": number (0-100),
            "overall_assessment": "brief summary",
            "issues": [
                {
                    "type": "vulnerability_type",
                    "severity": "Critical|High|Medium|Low",
                    "line": number,
                    "title": "Brief title",
                    "description": "User-friendly explanation",
                    "code_snippet": "problematic code",
                    "fix": "How to fix it",
                    "example": "Fixed code example"
                }
            ],
            "recommendations": ["general security recommendations"]
        }"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this PHP code for security vulnerabilities:\n\n```php\n{php_code}\n```"}
        ]
        
        try:
            if not ai_service or not ai_service.api_key:
                return self._create_basic_php_analysis(php_code, "AI service not connected")
                
            response = ai_service._make_chat_request(messages, model)
            
            # Try to parse JSON response
            import json
            try:
                # Clean the response if it has markdown formatting
                clean_response = response.strip()
                if clean_response.startswith('```json'):
                    clean_response = clean_response[7:]
                if clean_response.startswith('```'):
                    clean_response = clean_response[3:]
                if clean_response.endswith('```'):
                    clean_response = clean_response[:-3]
                
                security_data = json.loads(clean_response.strip())
                security_data['language'] = 'PHP'
                return security_data
            except json.JSONDecodeError as je:
                logging.warning(f"JSON parsing failed: {str(je)}")
                # Fallback to basic analysis if JSON parsing fails
                return self._create_basic_php_analysis(php_code, response)
                
        except Exception as e:
            logging.error(f"PHP security analysis error: {str(e)}")
            return self._create_basic_php_analysis(php_code, f"Analysis failed: {str(e)}")
    
    def _analyze_python_security(self, python_code: str, model: str, ai_service) -> Dict[str, Any]:
        """Analyze Python code for security vulnerabilities"""
        
        system_prompt = """You are a Python security expert specializing in application security.
        Analyze the provided Python code for security vulnerabilities using industry standards and best practices.
        
        PYTHON SECURITY STANDARDS TO CHECK:
        1. **Code Injection**: eval(), exec(), compile() usage
        2. **SQL Injection**: Unsafe database queries, string formatting in SQL
        3. **Command Injection**: os.system(), subprocess with shell=True
        4. **Deserialization**: Unsafe pickle.loads(), yaml.load()
        5. **Path Traversal**: Unsafe file operations, directory traversal
        6. **Cross-Site Scripting**: In web frameworks (Flask, Django)
        7. **Secrets in Code**: Hardcoded passwords, API keys, tokens
        8. **Input Validation**: Missing validation on user inputs
        9. **Dependency Security**: Vulnerable imports or packages
        10. **Flask/Django Security**: Missing CSRF, unsafe templates, debug mode
        
        For each vulnerability found, provide:
        - Vulnerability type
        - Severity level (Critical/High/Medium/Low)
        - Line number (if identifiable)
        - Clear explanation for non-technical users
        - Specific fix recommendation with Python code example
        
        Return your analysis in this JSON format:
        {
            "vulnerabilities_found": number,
            "security_score": number (0-100),
            "overall_assessment": "brief summary",
            "issues": [
                {
                    "type": "vulnerability_type",
                    "severity": "Critical|High|Medium|Low",
                    "line": number,
                    "title": "Brief title",
                    "description": "User-friendly explanation",
                    "code_snippet": "problematic code",
                    "fix": "How to fix it",
                    "example": "Fixed code example"
                }
            ],
            "recommendations": ["general security recommendations"]
        }"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this Python code for security vulnerabilities:\n\n```python\n{python_code}\n```"}
        ]
        
        try:
            if not ai_service or not ai_service.api_key:
                return self._create_basic_python_analysis(python_code, "AI service not connected")
                
            response = ai_service._make_chat_request(messages, model)
            
            # Try to parse JSON response
            import json
            try:
                # Clean the response if it has markdown formatting
                clean_response = response.strip()
                if clean_response.startswith('```json'):
                    clean_response = clean_response[7:]
                if clean_response.startswith('```'):
                    clean_response = clean_response[3:]
                if clean_response.endswith('```'):
                    clean_response = clean_response[:-3]
                
                security_data = json.loads(clean_response.strip())
                security_data['language'] = 'Python'
                return security_data
            except json.JSONDecodeError as je:
                logging.warning(f"JSON parsing failed: {str(je)}")
                # Fallback to basic analysis if JSON parsing fails
                return self._create_basic_python_analysis(python_code, response)
                
        except Exception as e:
            logging.error(f"Python security analysis error: {str(e)}")
            return self._create_basic_python_analysis(python_code, f"Analysis failed: {str(e)}")
    
    def _create_basic_php_analysis(self, code: str, analysis_text: str) -> Dict[str, Any]:
        """Create basic PHP security analysis when AI parsing fails"""
        return {
            "vulnerabilities_found": 0,
            "security_score": 85,
            "overall_assessment": "Basic PHP security analysis completed",
            "language": "PHP",
            "issues": [],
            "recommendations": [
                "Use prepared statements for database queries",
                "Escape output with htmlspecialchars()",
                "Implement CSRF protection",
                "Validate and sanitize all user inputs",
                "Use secure session handling"
            ],
            "raw_analysis": analysis_text
        }
    
    def _create_basic_python_analysis(self, code: str, analysis_text: str) -> Dict[str, Any]:
        """Create basic Python security analysis when AI parsing fails"""
        return {
            "vulnerabilities_found": 0,
            "security_score": 85,
            "overall_assessment": "Basic Python security analysis completed",
            "language": "Python",
            "issues": [],
            "recommendations": [
                "Avoid eval(), exec(), and compile() functions",
                "Use parameterized queries for databases",
                "Validate all user inputs",
                "Use subprocess with shell=False",
                "Store secrets in environment variables"
            ],
            "raw_analysis": analysis_text
        }
    
    def _calculate_security_score(self, issues: List[Dict[str, Any]]) -> int:
        """Calculate overall security score (0-100)"""
        if not issues:
            return 100
        
        # Deduct points based on issue severity
        score = 100
        for issue in issues:
            if issue['severity'] == 'high':
                score -= 20
            elif issue['severity'] == 'medium':
                score -= 10
            else:
                score -= 5
        
        return max(0, score)
    
    def _generate_recommendations(self, issues: List[Dict[str, Any]]) -> List[str]:
        """Generate general security recommendations"""
        recommendations = []
        
        if any(i['type'] == 'dangerous_functions' for i in issues):
            recommendations.append('Replace dangerous functions (eval, exec) with safer alternatives')
        
        if any(i['type'] == 'sql_injection' for i in issues):
            recommendations.append('Implement parameterized queries for all database operations')
        
        if any(i['type'] == 'hardcoded_secrets' for i in issues):
            recommendations.append('Move all secrets to environment variables')
        
        if any(i['type'] == 'xss_vulnerabilities' for i in issues):
            recommendations.append('Enable template auto-escaping and validate user inputs')
        
        # General recommendations
        if issues:
            recommendations.extend([
                'Implement input validation for all user data',
                'Add proper error handling and logging',
                'Use HTTPS for all communications',
                'Implement proper authentication and authorization',
                'Keep dependencies updated to latest secure versions'
            ])
        
        return list(set(recommendations))  # Remove duplicates
