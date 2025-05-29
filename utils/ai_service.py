import requests
import json
import logging
from typing import List, Dict, Any, Optional

class AIService:
    def __init__(self):
        self.base_url = None
        self.api_key = None
        self.headers = None
    
    def connect_and_get_models(self, base_url: str, api_key: str) -> List[Dict[str, Any]]:
        """Connect to OpenAI-compatible API and fetch available models"""
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        
        # Detect API provider type
        is_gemini = 'generativelanguage.googleapis.com' in base_url
        is_anthropic = 'api.anthropic.com' in base_url
        is_groq = 'api.groq.com' in base_url
        
        if is_gemini:
            # Gemini uses API key as query parameter
            self.headers = {'Content-Type': 'application/json'}
            models_url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'
        elif is_anthropic:
            # Anthropic uses x-api-key header
            self.headers = {
                'x-api-key': api_key,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
            # Anthropic doesn't have a models endpoint, so we'll return predefined models
            models_url = None
        elif is_groq:
            # Groq uses standard Bearer token
            self.headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            models_url = f'{self.base_url}/openai/v1/models'
        else:
            # OpenAI-style authentication
            self.headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            models_url = f'{self.base_url}/models'
        
        try:
            models = []
            
            if is_anthropic:
                # Anthropic predefined models - test connection with a simple message
                test_payload = {
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}]
                }
                test_response = requests.post(f'{self.base_url}/v1/messages', 
                                            headers=self.headers, json=test_payload, timeout=30)
                test_response.raise_for_status()
                
                # Return Anthropic models
                models = [
                    {'id': 'claude-3-5-sonnet-20241022', 'name': 'Claude 3.5 Sonnet (Latest)', 'created': 0},
                    {'id': 'claude-3-5-haiku-20241022', 'name': 'Claude 3.5 Haiku', 'created': 0},
                    {'id': 'claude-3-opus-20240229', 'name': 'Claude 3 Opus', 'created': 0},
                    {'id': 'claude-3-sonnet-20240229', 'name': 'Claude 3 Sonnet', 'created': 0},
                    {'id': 'claude-3-haiku-20240307', 'name': 'Claude 3 Haiku', 'created': 0}
                ]
            else:
                # Fetch models from API endpoint
                if models_url is None:
                    raise Exception("Models URL not configured for this API provider")
                response = requests.get(models_url, headers=self.headers, timeout=30)
                response.raise_for_status()
                
                models_data = response.json()
                
                if is_gemini:
                    # Gemini API structure
                    if 'models' in models_data:
                        for model in models_data['models']:
                            model_name = model.get('name', '').replace('models/', '')
                            if model_name and 'generateContent' in model.get('supportedGenerationMethods', []):
                                models.append({
                                    'id': model_name,
                                    'name': model.get('displayName', model_name),
                                    'created': 0
                                })
                else:
                    # OpenAI/Groq API structure
                    if 'data' in models_data:
                        for model in models_data['data']:
                            models.append({
                                'id': model.get('id', ''),
                                'name': model.get('id', ''),
                                'created': model.get('created', 0)
                            })
            
            # Sort models by name
            models.sort(key=lambda x: x['name'])
            
            logging.info(f"Successfully connected to API. Found {len(models)} models.")
            return models
            
        except requests.exceptions.RequestException as e:
            logging.error(f"API connection failed: {str(e)}")
            raise Exception(f"Failed to connect to API: {str(e)}")
    
    def _make_chat_request(self, messages: List[Dict[str, str]], model: str, 
                          response_format: Optional[Dict[str, str]] = None) -> str:
        """Make a chat completion request to the API"""
        if not self.base_url or not self.api_key:
            raise Exception("API not connected. Please connect first.")
        
        is_gemini = 'generativelanguage.googleapis.com' in self.base_url
        is_anthropic = 'api.anthropic.com' in self.base_url
        
        if is_gemini:
            # Convert messages to Gemini format
            content_parts = []
            for msg in messages:
                if msg['role'] == 'system':
                    content_parts.append(f"Instructions: {msg['content']}")
                elif msg['role'] == 'user':
                    content_parts.append(msg['content'])
            
            payload = {
                'contents': [{
                    'parts': [{'text': '\n\n'.join(content_parts)}]
                }],
                'generationConfig': {
                    'temperature': 0.1,
                    'maxOutputTokens': 4000
                }
            }
            
            url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}'
            
        elif is_anthropic:
            # Anthropic format - system message goes in separate field
            system_message = None
            user_messages = []
            
            for msg in messages:
                if msg['role'] == 'system':
                    system_message = msg['content']
                else:
                    user_messages.append(msg)
            
            payload = {
                'model': model,
                'max_tokens': 4000,
                'temperature': 0.1,
                'messages': user_messages
            }
            
            # Add system message if present
            if system_message:
                payload['system'] = system_message
            
            url = f'{self.base_url}/v1/messages'
            
        else:
            # OpenAI format
            payload = {
                'model': model,
                'messages': messages,
                'temperature': 0.1,
                'max_tokens': 4000
            }
            
            if response_format:
                payload['response_format'] = response_format
            
            url = f'{self.base_url}/chat/completions'
        
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            if is_gemini:
                # Extract content from Gemini response
                if 'candidates' in data and len(data['candidates']) > 0:
                    candidate = data['candidates'][0]
                    if 'content' in candidate and 'parts' in candidate['content']:
                        return candidate['content']['parts'][0]['text']
                raise Exception("Invalid response format from Gemini API")
            elif is_anthropic:
                # Extract content from Anthropic response
                if 'content' in data and len(data['content']) > 0:
                    return data['content'][0]['text']
                raise Exception("Invalid response format from Anthropic API")
            else:
                # OpenAI format
                return data['choices'][0]['message']['content']
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Chat request failed: {str(e)}")
            raise Exception(f"AI request failed: {str(e)}")
    
    def convert_php_to_python(self, php_code: str, model: str, apply_security: bool = True) -> str:
        """Convert PHP code to secure Python code"""
        security_instructions = ""
        if apply_security:
            security_instructions = """
            SECURITY REQUIREMENTS:
            - Replace eval() and exec() with safe alternatives
            - Use request.form.get() instead of direct access
            - Add input validation and sanitization
            - Use parameterized queries for database operations
            - Implement proper error handling
            - Add security headers and CSRF protection where needed
            - Escape output to prevent XSS
            """
        
        system_prompt = f"""You are an expert Python developer specializing in secure code conversion.
        Convert the provided PHP code to clean, secure, PEP-8-compliant Python.
        
        CONVERSION RULES:
        - Convert $_POST/$_GET to request.form.get() and request.args.get() if web-related
        - For simple PHP logic, create equivalent Python functions
        - Add proper imports only when needed
        - Include detailed inline comments
        - Use modern Python features and best practices
        - Keep the conversion simple and focused on the core PHP logic
        - Don't add unnecessary Flask routes unless the PHP clearly shows web endpoints
        
        {security_instructions}
        
        IMPORTANT: Return ONLY the Python code without any markdown formatting, explanations, or extra text.
        Start directly with the Python code (imports first if needed, then the main logic)."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Convert this PHP code to secure Python:\n\n```php\n{php_code}\n```"}
        ]
        
        return self._make_chat_request(messages, model)
    
    def explain_code(self, code: str, language: str, model: str) -> str:
        """Generate detailed code explanation for non-technical users"""
        system_prompt = f"""You are a friendly teacher explaining {language} code to someone who has never programmed before.
        Use simple, everyday language and avoid technical jargon. Think of explaining to a curious friend.
        
        EXPLANATION STYLE:
        - Use simple words and short sentences
        - Compare programming concepts to real-life situations
        - Explain what each part does in plain English
        - Focus on the purpose and outcome, not technical details
        - Use analogies and examples from daily life
        
        STRUCTURE:
        1. **What does this code do?** (Simple overview in one sentence)
        2. **How it works:** (Step-by-step in plain English)
        3. **Important parts:** (Key sections explained simply)
        4. **Why it matters:** (Purpose and benefits)
        
        Remember: Write like you're talking to a friend, not a programmer."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Explain this {language} code:\n\n```{language}\n{code}\n```"}
        ]
        
        return self._make_chat_request(messages, model)
    
    def generate_tests(self, python_code: str, model: str) -> str:
        """Generate comprehensive pytest-based tests for Python code"""
        system_prompt = """You are a test automation expert specializing in user-friendly Python testing.
        Generate simple, understandable pytest tests that help developers see if their code works correctly.
        
        TEST REQUIREMENTS:
        - Create 3-4 simple test functions with clear names
        - Test with realistic, easy-to-understand inputs
        - Use descriptive test names like "test_admin_login_success" or "test_invalid_user_access"
        - Show clear input → output examples
        - Include comments explaining what each test checks
        - Make tests that developers can easily understand and verify manually
        - Focus on main functionality only
        - Use simple assertions that are easy to read
        
        EXAMPLE FORMAT:
        def test_function_name_with_valid_input():
            # Test if function works with normal input
            result = my_function("normal_input")
            assert result == "expected_output"
        
        Make tests simple, clear, and that will help developers understand if their converted code works properly.
        Return only the test code without markdown formatting."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate comprehensive tests for this Python code:\n\n```python\n{python_code}\n```"}
        ]
        
        return self._make_chat_request(messages, model)
    
    def generate_documentation(self, python_code: str, php_code: str, 
                             security_report: Dict[str, Any], model: str) -> str:
        """Generate comprehensive documentation"""
        system_prompt = """You are a technical documentation specialist.
        Generate comprehensive Markdown documentation for a PHP to Python code conversion.
        
        DOCUMENTATION STRUCTURE:
        # Code Conversion Documentation
        
        ## Original PHP Code Analysis
        [Brief analysis of the original PHP code]
        
        ## Python Conversion
        [Explanation of the conversion process and changes made]
        
        ## Security Enhancements
        [Detail security improvements made during conversion]
        
        ## Usage Examples
        [Show how to use the converted Python code]
        
        ## API Endpoints (if applicable)
        [Document any Flask routes and their usage]
        
        ## Testing
        [Explain how to test the converted code]
        
        ## Deployment Notes
        [Any important deployment considerations]
        
        Make the documentation professional and comprehensive."""
        
        security_summary = ""
        if security_report and 'issues' in security_report:
            issues_count = len(security_report['issues'])
            security_summary = f"\n\nSecurity Analysis: {issues_count} potential issues identified and addressed."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate documentation for this PHP to Python conversion:\n\nOriginal PHP:\n```php\n{php_code}\n```\n\nConverted Python:\n```python\n{python_code}\n```{security_summary}"}
        ]
        
        return self._make_chat_request(messages, model)
    
    def fix_failing_code(self, python_code: str, test_code: str, test_results: Dict[str, Any], model: str) -> str:
        """Automatically fix failing Python code based on test results"""
        system_prompt = """You are an expert Python developer specializing in debugging and fixing code.
        Your task is to fix the provided Python code based on the failing test results.
        
        CRITICAL FIXING RULES:
        - Analyze ALL error messages and test failures in detail
        - Fix syntax errors, import errors, and logic errors
        - Handle missing functions, variables, or methods
        - Ensure proper Flask imports and route definitions
        - Add missing error handling and input validation
        - Fix data type issues and conversion problems
        - Ensure all functions return appropriate values
        - Add proper exception handling for edge cases
        - Maintain security best practices throughout
        - Ensure all imports are present and correct
        - Fix any Flask-specific issues (request handling, etc.)
        - Handle database connections if needed
        - Ensure proper variable initialization
        
        STRUCTURE REQUIREMENTS:
        - Keep the original logic flow but fix all issues
        - Add missing imports at the top
        - Ensure all functions are properly defined
        - Add proper error handling blocks
        - Make sure all variables are defined before use
        - Return appropriate response types for Flask
        
        Return ONLY the completely fixed Python code that will pass ALL tests."""
        
        error_info = f"""
        Test Output: {test_results.get('stdout', '')}
        Test Errors: {test_results.get('stderr', '')}
        Exit Code: {test_results.get('exit_code', 0)}
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Fix this Python code based on the test failures:\n\nOriginal Code:\n```python\n{python_code}\n```\n\nTest Code:\n```python\n{test_code}\n```\n\nTest Results:\n{error_info}"}
        ]
        
        return self._make_chat_request(messages, model)
    
    def apply_security_fixes(self, code: str, security_report: Dict[str, Any], model: str, language: str = 'python') -> str:
        """Automatically apply security fixes to PHP or Python code based on security analysis"""
        
        if language.lower() == 'php':
            system_prompt = """You are a cybersecurity expert specializing in secure PHP web development.
            Fix ALL the security vulnerabilities identified in the security report for the provided PHP code.
            
            PHP SECURITY FIXING RULES:
            - Fix SQL injection by using prepared statements with PDO or mysqli
            - Prevent XSS by using htmlspecialchars() for output escaping
            - Add CSRF token validation for forms
            - Validate and sanitize all user inputs with filter_var()
            - Replace dangerous functions like eval(), system(), exec()
            - Add proper file upload validation and restrictions
            - Implement secure session handling
            - Add authentication and authorization checks
            - Use password_hash() for password storage
            - Validate file paths to prevent directory traversal
            
            IMPORTANT: Return ONLY the fixed PHP code without any markdown formatting or explanations.
            The code must be functionally equivalent but completely secure."""
            
            code_block = f"```php\n{code}\n```"
        else:
            system_prompt = """You are a cybersecurity expert specializing in secure Python development.
            Fix ALL the security vulnerabilities identified in the security report for the provided Python code.
            
            PYTHON SECURITY FIXING RULES:
            - Replace dangerous functions like eval(), exec() with safe alternatives
            - Add input validation and sanitization
            - Use parameterized queries for database operations
            - Add proper error handling and logging
            - Implement CSRF protection where needed
            - Escape output to prevent XSS attacks
            - Use environment variables for secrets instead of hardcoding
            - Add authentication and authorization checks
            - Validate file paths and restrict access
            - Use subprocess with shell=False
            
            IMPORTANT: Return ONLY the fixed Python code without any markdown formatting or explanations.
            The code must be functionally equivalent but completely secure."""
            
            code_block = f"```python\n{code}\n```"
        
        issues_summary = f"Security Issues Found: {len(security_report.get('issues', []))}\n"
        for issue in security_report.get('issues', []):
            issues_summary += f"- {issue.get('type', '')}: {issue.get('message', '')} (Line {issue.get('line', 'N/A')})\n"
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Fix all security issues in this {language.upper()} code:\n\n{code_block}\n\n{issues_summary}"}
        ]
        
        return self._make_chat_request(messages, model)
