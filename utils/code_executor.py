import subprocess
import tempfile
import os
import signal
import logging
from typing import Dict, Any
import sys

class CodeExecutor:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
    
    def run_tests(self, python_code: str, test_code: str) -> Dict[str, Any]:
        """Execute generated tests against Python code"""
        try:
            # Create temporary directory for test execution
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write main code to file
                main_file = os.path.join(temp_dir, 'main.py')
                with open(main_file, 'w') as f:
                    f.write(python_code)
                
                # Write test code to file
                test_file = os.path.join(temp_dir, 'test_main.py')
                with open(test_file, 'w') as f:
                    # Add necessary imports for testing
                    test_imports = """
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
import pytest
from main import *

"""
                    f.write(test_imports + test_code)
                
                # Run tests using pytest
                result = self._run_command([
                    sys.executable, '-m', 'pytest', 
                    test_file, '-v', '--tb=short'
                ], cwd=temp_dir)
                
                return {
                    'success': result['exit_code'] == 0,
                    'stdout': result['stdout'],
                    'stderr': result['stderr'],
                    'exit_code': result['exit_code'],
                    'execution_time': result['execution_time']
                }
                
        except Exception as e:
            logging.error(f"Test execution error: {str(e)}")
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Test execution failed: {str(e)}',
                'exit_code': 1,
                'execution_time': 0
            }
    
    def validate_python_syntax(self, python_code: str) -> Dict[str, Any]:
        """Validate Python code syntax without executing it"""
        try:
            compile(python_code, '<string>', 'exec')
            return {
                'valid': True,
                'error': None
            }
        except SyntaxError as e:
            return {
                'valid': False,
                'error': {
                    'type': 'SyntaxError',
                    'message': str(e),
                    'line': getattr(e, 'lineno', 0),
                    'offset': getattr(e, 'offset', 0)
                }
            }
        except Exception as e:
            return {
                'valid': False,
                'error': {
                    'type': type(e).__name__,
                    'message': str(e)
                }
            }
    
    def run_code_safely(self, python_code: str, input_data: str = '') -> Dict[str, Any]:
        """Execute Python code safely in an isolated environment"""
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Write code to temporary file
                code_file = os.path.join(temp_dir, 'code.py')
                with open(code_file, 'w') as f:
                    f.write(python_code)
                
                # Create input file if needed
                input_file = None
                if input_data:
                    input_file = os.path.join(temp_dir, 'input.txt')
                    with open(input_file, 'w') as f:
                        f.write(input_data)
                
                # Run the code
                cmd = [sys.executable, code_file]
                stdin_data = input_data.encode() if input_data else None
                
                result = self._run_command(cmd, cwd=temp_dir, stdin_data=stdin_data)
                
                return {
                    'success': result['exit_code'] == 0,
                    'stdout': result['stdout'],
                    'stderr': result['stderr'],
                    'exit_code': result['exit_code'],
                    'execution_time': result['execution_time']
                }
                
        except Exception as e:
            logging.error(f"Code execution error: {str(e)}")
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Execution failed: {str(e)}',
                'exit_code': 1,
                'execution_time': 0
            }
    
    def _run_command(self, cmd: list, cwd: str = None, stdin_data: bytes = None) -> Dict[str, Any]:
        """Run a command with timeout and capture output"""
        import time
        
        start_time = time.time()
        
        try:
            # Run the command with timeout
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE if stdin_data else None,
                cwd=cwd,
                text=True,
                preexec_fn=os.setsid if os.name != 'nt' else None
            )
            
            try:
                stdout, stderr = process.communicate(
                    input=stdin_data.decode() if stdin_data else None,
                    timeout=self.timeout
                )
                exit_code = process.returncode
                
            except subprocess.TimeoutExpired:
                # Kill the process group to ensure all child processes are terminated
                if os.name != 'nt':
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                else:
                    process.terminate()
                
                stdout, stderr = process.communicate()
                exit_code = -1
                stderr += f"\nProcess terminated due to timeout ({self.timeout}s)"
            
            execution_time = time.time() - start_time
            
            return {
                'stdout': stdout,
                'stderr': stderr,
                'exit_code': exit_code,
                'execution_time': execution_time
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                'stdout': '',
                'stderr': f'Command execution failed: {str(e)}',
                'exit_code': 1,
                'execution_time': execution_time
            }
    
    def install_dependencies(self, requirements: list) -> Dict[str, Any]:
        """Install Python dependencies safely"""
        try:
            # Filter and validate requirements
            safe_requirements = []
            for req in requirements:
                # Basic validation - only allow alphanumeric, hyphens, and version specifiers
                if all(c.isalnum() or c in '-_.><=![]' for c in req):
                    safe_requirements.append(req)
            
            if not safe_requirements:
                return {
                    'success': True,
                    'message': 'No dependencies to install'
                }
            
            # Install packages
            cmd = [sys.executable, '-m', 'pip', 'install'] + safe_requirements
            result = self._run_command(cmd)
            
            return {
                'success': result['exit_code'] == 0,
                'stdout': result['stdout'],
                'stderr': result['stderr'],
                'installed_packages': safe_requirements if result['exit_code'] == 0 else []
            }
            
        except Exception as e:
            logging.error(f"Dependency installation error: {str(e)}")
            return {
                'success': False,
                'stderr': f'Installation failed: {str(e)}',
                'installed_packages': []
            }
