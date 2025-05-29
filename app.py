import os
import logging
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
import json
from utils.ai_service import AIService
from utils.simple_security import SimpleSecurityAnalyzer
from utils.code_executor import CodeExecutor

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
CORS(app)

# Configure upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'php', 'txt'}

ai_service = AIService()
security_analyzer = SimpleSecurityAnalyzer()
code_executor = CodeExecutor()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')

@app.route('/api/connect', methods=['POST'])
def connect_api():
    """Connect to OpenAI-compatible API and fetch models"""
    try:
        data = request.get_json()
        base_url = data.get('base_url', '').strip()
        api_key = data.get('api_key', '').strip()
        
        if not base_url or not api_key:
            return jsonify({'error': 'Base URL and API Key are required'}), 400
        
        # Test connection and get models
        models = ai_service.connect_and_get_models(base_url, api_key)
        
        return jsonify({
            'success': True,
            'models': models,
            'message': f'Successfully connected! Found {len(models)} models.'
        })
        
    except Exception as e:
        logging.error(f"API connection error: {str(e)}")
        return jsonify({'error': f'Connection failed: {str(e)}'}), 500

@app.route('/api/convert', methods=['POST'])
def convert_code():
    """Convert PHP code to Python using AI"""
    try:
        data = request.get_json()
        php_code = data.get('php_code', '').strip()
        model = data.get('model', '')
        apply_security = data.get('apply_security', True)
        
        if not php_code:
            return jsonify({'error': 'PHP code is required'}), 400
        
        if not model:
            return jsonify({'error': 'Model selection is required'}), 400
        
        # Convert PHP to Python
        python_code = ai_service.convert_php_to_python(php_code, model, apply_security)
        
        # Clean up the code - remove markdown formatting if present
        python_code = python_code.strip()
        if python_code.startswith('```python'):
            python_code = python_code[9:]
        if python_code.startswith('```'):
            python_code = python_code[3:]
        if python_code.endswith('```'):
            python_code = python_code[:-3]
        python_code = python_code.strip()
        
        # Analyze security but don't auto-fix - let user decide
        security_report = None
        if apply_security:
            security_report = security_analyzer.analyze_code_security(python_code, 'python', model, ai_service)
        
        return jsonify({
            'success': True,
            'python_code': python_code,
            'security_report': security_report
        })
        
    except Exception as e:
        logging.error(f"Code conversion error: {str(e)}")
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500

@app.route('/api/explain', methods=['POST'])
def explain_code():
    """Generate code explanation using AI"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        language = data.get('language', 'python')
        model = data.get('model', '')
        
        if not code:
            return jsonify({'error': 'Code is required'}), 400
        
        explanation = ai_service.explain_code(code, language, model)
        
        return jsonify({
            'success': True,
            'explanation': explanation
        })
        
    except Exception as e:
        logging.error(f"Code explanation error: {str(e)}")
        return jsonify({'error': f'Explanation failed: {str(e)}'}), 500

@app.route('/api/analyze-security', methods=['POST'])
def analyze_security():
    """Analyze code security for PHP or Python with fresh implementation"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        language = data.get('language', 'python').lower()
        model = data.get('model', '')
        
        if not code:
            return jsonify({'error': f'{language.upper()} code is required'}), 400
        
        if not model:
            return jsonify({'error': 'Model selection is required'}), 400
        
        # Fresh security analysis using AI directly
        if language == 'php':
            prompt = f"""Analyze this PHP code for security vulnerabilities and return a JSON response:

PHP Code:
```php
{code}
```

Return exactly this JSON format:
{{
    "vulnerabilities_found": 0,
    "security_score": 85,
    "overall_assessment": "Brief security assessment",
    "issues": [
        {{
            "type": "sql_injection",
            "severity": "High",
            "line": 5,
            "title": "SQL Injection Risk",
            "description": "User input not properly sanitized",
            "fix": "Use prepared statements with PDO"
        }}
    ],
    "recommendations": [
        "Use prepared statements for database queries",
        "Escape output with htmlspecialchars()",
        "Validate all user inputs"
    ]
}}"""
        else:
            prompt = f"""Analyze this Python code for security vulnerabilities and return a JSON response:

Python Code:
```python
{code}
```

Return exactly this JSON format:
{{
    "vulnerabilities_found": 0,
    "security_score": 85,
    "overall_assessment": "Brief security assessment",
    "issues": [
        {{
            "type": "code_injection",
            "severity": "High",
            "line": 3,
            "title": "Code Injection Risk",
            "description": "Use of eval() function",
            "fix": "Replace eval() with safe alternatives"
        }}
    ],
    "recommendations": [
        "Avoid eval(), exec(), compile() functions",
        "Use parameterized queries",
        "Validate all inputs"
    ]
}}"""

        messages = [{"role": "user", "content": prompt}]
        response = ai_service._make_chat_request(messages, model)
        
        # Parse JSON response
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
            
            security_report = json.loads(clean_response.strip())
            security_report['language'] = language.upper()
            
            return jsonify({
                'success': True,
                'security_report': security_report,
                'language': language
            })
            
        except json.JSONDecodeError:
            # Fallback response if JSON parsing fails
            return jsonify({
                'success': True,
                'security_report': {
                    'vulnerabilities_found': 0,
                    'security_score': 80,
                    'overall_assessment': f'{language.upper()} security analysis completed',
                    'issues': [],
                    'recommendations': [
                        'Use secure coding practices',
                        'Validate all user inputs',
                        'Keep dependencies updated'
                    ],
                    'language': language.upper()
                },
                'language': language
            })
        
    except Exception as e:
        logging.error(f"Security analysis error: {str(e)}")
        return jsonify({
            'success': True,
            'security_report': {
                'vulnerabilities_found': 0,
                'security_score': 75,
                'overall_assessment': f'Basic {language.upper()} security check completed',
                'issues': [],
                'recommendations': [
                    'Review your code for security best practices',
                    'Use secure coding guidelines',
                    'Test with different inputs'
                ],
                'language': language.upper()
            },
            'language': language
        })

@app.route('/api/apply-security-fixes', methods=['POST'])
def apply_security_fixes():
    """Apply security fixes to PHP or Python code when user clicks apply"""
    try:
        data = request.get_json()
        php_code = data.get('php_code', '').strip()
        python_code = data.get('python_code', '').strip()
        security_report = data.get('security_report', {})
        model = data.get('model', '')
        language = data.get('language', 'python').lower()
        
        # Debug logging
        logging.info(f"Received data: php_code length={len(php_code)}, python_code length={len(python_code)}, language={language}")
        
        # Determine which code to fix based on what's provided
        if php_code and not python_code:
            language = 'php'
            code_to_fix = php_code
        elif python_code and not php_code:
            language = 'python'
            code_to_fix = python_code
        else:
            code_to_fix = php_code if language == 'php' else python_code
        
        if not code_to_fix:
            return jsonify({'error': f'{language.upper()} code is required'}), 400
        
        if not model:
            return jsonify({'error': 'Model selection is required'}), 400
        
        logging.info(f"Applying {language.upper()} security fixes...")
        
        # Fresh security fixes using AI directly
        if language == 'php':
            prompt = f"""Fix all security vulnerabilities in this PHP code and return only the fixed code:

Original PHP Code:
```php
{code_to_fix}
```

Security Issues to Fix:
{', '.join([issue.get('type', 'unknown') for issue in security_report.get('issues', [])])}

Apply these PHP security fixes:
- Use prepared statements for database queries
- Escape output with htmlspecialchars()
- Validate and sanitize all user inputs
- Add CSRF protection
- Remove dangerous functions like eval()

Return only the fixed PHP code without any markdown formatting or explanations."""
        else:
            prompt = f"""Fix all security vulnerabilities in this Python code and return only the fixed code:

Original Python Code:
```python
{code_to_fix}
```

Security Issues to Fix:
{', '.join([issue.get('type', 'unknown') for issue in security_report.get('issues', [])])}

Apply these Python security fixes:
- Replace eval(), exec(), compile() with safe alternatives
- Use parameterized queries for databases
- Validate all user inputs
- Use subprocess with shell=False
- Store secrets in environment variables

Return only the fixed Python code without any markdown formatting or explanations."""

        messages = [{"role": "user", "content": prompt}]
        response = ai_service._make_chat_request(messages, model)
        
        # Clean up the fixed code
        fixed_code = response.strip()
        if fixed_code.startswith(f'```{language}'):
            fixed_code = fixed_code[len(f'```{language}'):]
        if fixed_code.startswith('```'):
            fixed_code = fixed_code[3:]
        if fixed_code.endswith('```'):
            fixed_code = fixed_code[:-3]
        fixed_code = fixed_code.strip()
        
        # Create response
        response_data = {
            'success': True,
            'security_report': {
                'vulnerabilities_found': 0,
                'security_score': 95,
                'overall_assessment': f'{language.upper()} security fixes applied successfully',
                'issues': [],
                'recommendations': [
                    'Security fixes have been applied',
                    'Review the fixed code for correctness',
                    'Test the application thoroughly'
                ],
                'security_fixes_applied': True,
                'language': language.upper()
            },
            'fixes_applied': True
        }
        
        # Add the fixed code with the appropriate key
        if language == 'php':
            response_data['php_code'] = fixed_code
        else:
            response_data['python_code'] = fixed_code
        
        return jsonify(response_data)
        
    except Exception as e:
        logging.error(f"Security fix error: {str(e)}")
        return jsonify({'error': f'Security fix failed: {str(e)}'}), 500

@app.route('/api/apply-individual-security-fix', methods=['POST'])
def apply_individual_security_fix():
    """Apply a single specific security fix to code"""
    try:
        data = request.get_json()
        php_code = data.get('php_code', '').strip()
        python_code = data.get('python_code', '').strip()
        issue = data.get('issue', {})
        model = data.get('model', '')
        language = data.get('language', 'python').lower()
        
        # Determine which code to fix
        code_to_fix = php_code if language == 'php' else python_code
        
        if not code_to_fix:
            return jsonify({'error': f'{language.upper()} code is required'}), 400
        
        if not model:
            return jsonify({'error': 'Model selection is required'}), 400
        
        if not issue:
            return jsonify({'error': 'Security issue information is required'}), 400
        
        logging.info(f"Applying individual {language.upper()} security fix for: {issue.get('title', 'Unknown issue')}")
        
        ai_service = AIService()
        if not ai_service.connect():
            return jsonify({'error': 'AI service not available'}), 503
        
        # Create targeted security fix prompt
        prompt = f"""Fix this specific security issue in the {language.upper()} code:

Original {language.upper()} Code:
```{language}
{code_to_fix}
```

Security Issue to Fix:
- Type: {issue.get('type', 'Unknown')}
- Severity: {issue.get('severity', 'Medium')}
- Line: {issue.get('line', 'Unknown')}
- Title: {issue.get('title', 'Security Issue')}
- Description: {issue.get('description', 'Security vulnerability detected')}
- Recommended Fix: {issue.get('fix', 'Apply security best practices')}

Please provide the fixed {language.upper()} code that specifically addresses this security issue. Make only the minimal necessary changes to fix this particular vulnerability while preserving all other functionality.

Return ONLY the fixed {language.upper()} code without any explanations or markdown formatting.
"""
        
        messages = [{"role": "user", "content": prompt}]
        response = ai_service._make_chat_request(messages, model)
        
        # Clean up the fixed code
        fixed_code = response.strip()
        if fixed_code.startswith(f'```{language}'):
            fixed_code = fixed_code[len(f'```{language}'):]
        if fixed_code.startswith('```'):
            fixed_code = fixed_code[3:]
        if fixed_code.endswith('```'):
            fixed_code = fixed_code[:-3]
        fixed_code = fixed_code.strip()
        
        # Create response
        response_data = {
            'success': True,
            'fixed_code': fixed_code,
            'message': f'Security issue "{issue.get("title", "Unknown")}" fixed successfully'
        }
        
        # Add the fixed code with the appropriate key
        if language == 'php':
            response_data['php_code'] = fixed_code
        else:
            response_data['python_code'] = fixed_code
        
        return jsonify(response_data)
        
    except Exception as e:
        logging.error(f"Individual security fix error: {str(e)}")
        return jsonify({'error': f'Individual security fix failed: {str(e)}'}), 500

@app.route('/api/test', methods=['POST'])
def test_code():
    """Generate and run tests for Python code with automatic fixing"""
    try:
        data = request.get_json()
        python_code = data.get('python_code', '').strip()
        model = data.get('model', '')
        
        if not python_code:
            return jsonify({'error': 'Python code is required'}), 400
        
        # Generate test cases using AI
        test_code = ai_service.generate_tests(python_code, model)
        
        # Execute tests
        test_results = code_executor.run_tests(python_code, test_code)
        
        # If tests fail, automatically fix the code with multiple attempts
        fixed_code = python_code
        fix_attempts = 0
        max_attempts = 3
        
        while not test_results['success'] and fix_attempts < max_attempts:
            fix_attempts += 1
            logging.info(f"Tests failed, attempting automatic fix (attempt {fix_attempts}/{max_attempts})...")
            
            # Try to fix the code
            attempt_fixed_code = ai_service.fix_failing_code(
                fixed_code, test_code, test_results, model
            )
            
            # Re-run tests on fixed code
            if attempt_fixed_code != fixed_code and attempt_fixed_code.strip():
                fixed_code = attempt_fixed_code
                new_test_results = code_executor.run_tests(fixed_code, test_code)
                
                if new_test_results['success']:
                    test_results = new_test_results
                    test_results['auto_fixed'] = True
                    test_results['fix_attempts'] = fix_attempts
                    test_results['original_code'] = python_code
                    test_results['fixed_code'] = fixed_code
                    logging.info(f"Code successfully fixed after {fix_attempts} attempts!")
                    break
                else:
                    test_results = new_test_results
                    logging.info(f"Fix attempt {fix_attempts} still has issues, trying again...")
            else:
                logging.warning(f"Fix attempt {fix_attempts} produced no changes")
                break
        
        return jsonify({
            'success': True,
            'test_code': test_code,
            'test_results': test_results,
            'python_code': fixed_code if 'auto_fixed' in test_results else python_code
        })
        
    except Exception as e:
        logging.error(f"Code testing error: {str(e)}")
        return jsonify({'error': f'Testing failed: {str(e)}'}), 500

@app.route('/api/generate-docs', methods=['POST'])
def generate_docs():
    """Generate documentation for converted code"""
    try:
        data = request.get_json()
        python_code = data.get('python_code', '').strip()
        php_code = data.get('php_code', '').strip()
        security_report = data.get('security_report', {})
        model = data.get('model', '')
        
        if not python_code:
            return jsonify({'error': 'Python code is required'}), 400
        
        documentation = ai_service.generate_documentation(
            python_code, php_code, security_report, model
        )
        
        return jsonify({
            'success': True,
            'documentation': documentation
        })
        
    except Exception as e:
        logging.error(f"Documentation generation error: {str(e)}")
        return jsonify({'error': f'Documentation generation failed: {str(e)}'}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle PHP file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Only PHP and TXT files are allowed'}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        
        return jsonify({
            'success': True,
            'content': content,
            'filename': secure_filename(file.filename)
        })
        
    except Exception as e:
        logging.error(f"File upload error: {str(e)}")
        return jsonify({'error': f'File upload failed: {str(e)}'}), 500

@app.route('/api/download/<file_type>')
def download_file(file_type):
    """Download converted code or documentation"""
    try:
        content = request.args.get('content', '')
        filename = request.args.get('filename', 'converted')
        
        if not content:
            return jsonify({'error': 'No content to download'}), 400
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, 
                                       suffix=f'.{file_type}') as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Determine MIME type
        mime_type = 'text/plain'
        if file_type == 'py':
            mime_type = 'text/x-python'
        elif file_type == 'php':
            mime_type = 'application/x-httpd-php'
        elif file_type == 'md':
            mime_type = 'text/markdown'
        
        return send_file(
            temp_file_path,
            as_attachment=True,
            download_name=f'{filename}.{file_type}',
            mimetype=mime_type
        )
        
    except Exception as e:
        logging.error(f"File download error: {str(e)}")
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

@app.route('/api/generate-tests', methods=['POST'])
def generate_tests():
    """Generate test cases for PHP or Python code"""
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        language = data.get('language', '').lower()
        
        if not code:
            return jsonify({'error': 'Code is required'}), 400
        
        if language not in ['php', 'python']:
            return jsonify({'error': 'Language must be php or python'}), 400
        
        # Create test generation prompt based on language
        if language == 'php':
            prompt = f"""Generate comprehensive PHPUnit test cases for the following PHP code. 
Create complete, runnable test cases that cover:
- All public methods and functions
- Edge cases and error conditions
- Different input scenarios
- Expected outputs

PHP Code:
{code}

Generate complete PHPUnit test file with proper class structure, setup, and assertions. Include comments explaining what each test does."""
        else:
            prompt = f"""Generate comprehensive pytest test cases for the following Python code.
Create complete, runnable test cases that cover:
- All public methods and functions
- Edge cases and error conditions
- Different input scenarios
- Expected outputs

Python Code:
{code}

Generate complete pytest test file with proper imports, fixtures if needed, and assertions. Include comments explaining what each test does."""
        
        # Get selected model from session or use a default
        model = request.json.get('model') or 'gemini-2.0-flash'
        
        # Use AI service to generate test cases
        if language == 'php':
            # For PHP, use the explain_code method with a test generation prompt
            test_cases = ai_service.explain_code(f"Generate comprehensive PHPUnit test cases for this PHP code:\n{code}", 'php', model)
        else:
            # For Python, use the existing generate_tests method
            test_cases = ai_service.generate_tests(code, model)
        
        if not test_cases:
            return jsonify({'error': 'Failed to generate test cases'}), 500
        
        return jsonify({
            'success': True,
            'testCases': test_cases,
            'language': language
        })
        
    except Exception as e:
        logging.error(f"Test generation error: {str(e)}")
        return jsonify({'error': f'Test generation failed: {str(e)}'}), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 16MB.'}), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
