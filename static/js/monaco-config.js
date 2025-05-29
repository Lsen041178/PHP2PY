// Monaco Editor configuration for PHP to Python AI Converter
class MonacoManager {
    constructor() {
        this.phpEditor = null;
        this.pythonEditor = null;
        this.initialized = false;
        this.currentTheme = 'light';
    }

    async init() {
        if (this.initialized) return;

        try {
            // Configure Monaco loader
            require.config({ 
                paths: { 
                    vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
                } 
            });

            // Load Monaco
            await new Promise((resolve, reject) => {
                require(['vs/editor/editor.main'], resolve, reject);
            });

            // Create editors
            await this.createEditors();
            
            // Set up theme - ensure we get the correct current theme
            const currentTheme = window.themeManager?.getCurrentTheme() || 
                                (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
            this.updateTheme(currentTheme);
            
            // Listen for theme changes
            window.addEventListener('themeChanged', (e) => {
                this.updateTheme(e.detail.theme);
            });

            this.initialized = true;
            window.monacoEditorsReady = true;
            
            console.log('Monaco editors initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Monaco editors:', error);
            this.showFallbackEditors();
        }
    }

    async createEditors() {
        // PHP Editor
        const phpContainer = document.getElementById('php-editor');
        if (phpContainer) {
            this.phpEditor = monaco.editor.create(phpContainer, {
                value: this.getDefaultPHPCode(),
                language: 'php',
                theme: 'vs-light',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                folding: true,
                wordWrap: 'on',
                formatOnType: true,
                formatOnPaste: true,
                tabSize: 4,
                insertSpaces: true
            });

            // Add event listeners
            this.phpEditor.onDidChangeModelContent(() => {
                this.onPHPCodeChange();
            });
        }

        // Python Editor (readonly)
        const pythonContainer = document.getElementById('python-editor');
        if (pythonContainer) {
            this.pythonEditor = monaco.editor.create(pythonContainer, {
                value: '# Converted Python code will appear here...',
                language: 'python',
                theme: this.getInitialTheme(),
                automaticLayout: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                folding: true,
                wordWrap: 'on',
                readOnly: true,
                tabSize: 4,
                insertSpaces: true
            });
        }
    }

    getDefaultPHPCode() {
        return `<?php
// Sample PHP code - replace with your own
$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if (!empty($username) && !empty($password)) {
    // Simple authentication logic
    if ($username === 'admin' && $password === 'secret') {
        echo "Welcome, Administrator!";
        
        // Display user dashboard
        $user_data = [
            'id' => 1,
            'name' => $username,
            'role' => 'admin',
            'last_login' => date('Y-m-d H:i:s')
        ];
        
        foreach ($user_data as $key => $value) {
            echo "$key: $value\\n";
        }
    } else {
        echo "Invalid credentials. Access denied.";
    }
} else {
    echo "Please provide both username and password.";
}
?>`;
    }

    getInitialTheme() {
        const currentTheme = window.themeManager?.getCurrentTheme() || 
                           (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        return currentTheme === 'dark' ? 'vs-dark' : 'vs-light';
    }

    updateTheme(theme) {
        this.currentTheme = theme;
        const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';
        
        if (monaco && monaco.editor) {
            monaco.editor.setTheme(monacoTheme);
        }
    }

    onPHPCodeChange() {
        const hasCode = this.getPHPCode().trim().length > 0;
        this.updateConvertButtonState(hasCode);
    }

    updateConvertButtonState(hasCode) {
        const convertBtn = document.getElementById('convert-btn');
        const modelSelect = document.getElementById('model-select');
        
        if (convertBtn && modelSelect) {
            const hasModel = modelSelect.value && modelSelect.value !== 'Select Model';
            convertBtn.disabled = !hasCode || !hasModel;
        }
    }

    getPHPCode() {
        return this.phpEditor ? this.phpEditor.getValue() : '';
    }

    setPHPCode(code) {
        if (this.phpEditor) {
            this.phpEditor.setValue(code);
        }
    }

    getPythonCode() {
        return this.pythonEditor ? this.pythonEditor.getValue() : '';
    }

    setPythonCode(code) {
        if (this.pythonEditor) {
            this.pythonEditor.setValue(code);
            // Enable download and explain buttons
            this.enablePythonActions();
        }
    }

    enablePythonActions() {
        const explainBtn = document.getElementById('explain-btn');
        const downloadBtn = document.getElementById('download-py');
        const runTestsBtn = document.getElementById('run-tests-btn');
        const generateDocsBtn = document.getElementById('generate-docs-btn');
        const downloadPythonBtn = document.getElementById('download-python');
        
        [explainBtn, downloadBtn, runTestsBtn, generateDocsBtn, downloadPythonBtn].forEach(btn => {
            if (btn) btn.disabled = false;
        });
    }

    clearPHPEditor() {
        if (this.phpEditor) {
            this.phpEditor.setValue('');
        }
    }

    showFallbackEditors() {
        // Create simple textarea fallbacks if Monaco fails to load
        const phpContainer = document.getElementById('php-editor');
        const pythonContainer = document.getElementById('python-editor');
        
        if (phpContainer) {
            phpContainer.innerHTML = `
                <textarea id="php-fallback" class="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-white dark:bg-gray-800"
                          placeholder="Enter your PHP code here...">${this.getDefaultPHPCode()}</textarea>
            `;
            
            // Add event listener for fallback editor
            const fallbackEditor = document.getElementById('php-fallback');
            if (fallbackEditor) {
                fallbackEditor.addEventListener('input', () => {
                    this.onPHPCodeChange();
                });
            }
        }
        
        if (pythonContainer) {
            pythonContainer.innerHTML = `
                <textarea id="python-fallback" class="w-full h-full p-4 font-mono text-sm border-0 resize-none focus:outline-none bg-gray-50 dark:bg-gray-900"
                          readonly placeholder="Converted Python code will appear here..."></textarea>
            `;
        }
        
        console.warn('Using fallback text editors instead of Monaco');
    }

    // Fallback methods for when Monaco is not available
    getFallbackPHPCode() {
        const fallback = document.getElementById('php-fallback');
        return fallback ? fallback.value : '';
    }

    setFallbackPHPCode(code) {
        const fallback = document.getElementById('php-fallback');
        if (fallback) fallback.value = code;
    }

    getFallbackPythonCode() {
        const fallback = document.getElementById('python-fallback');
        return fallback ? fallback.value : '';
    }

    setFallbackPythonCode(code) {
        const fallback = document.getElementById('python-fallback');
        if (fallback) {
            fallback.value = code;
            this.enablePythonActions();
        }
    }

    // Unified methods that work with both Monaco and fallback
    getCode(type) {
        if (type === 'php') {
            return this.phpEditor ? this.getPHPCode() : this.getFallbackPHPCode();
        } else if (type === 'python') {
            return this.pythonEditor ? this.getPythonCode() : this.getFallbackPythonCode();
        }
        return '';
    }

    setCode(type, code) {
        if (type === 'php') {
            this.phpEditor ? this.setPHPCode(code) : this.setFallbackPHPCode(code);
        } else if (type === 'python') {
            this.pythonEditor ? this.setPythonCode(code) : this.setFallbackPythonCode(code);
        }
    }

    focus(type) {
        if (type === 'php' && this.phpEditor) {
            this.phpEditor.focus();
        } else if (type === 'python' && this.pythonEditor) {
            this.pythonEditor.focus();
        }
    }

    formatCode(type) {
        if (type === 'php' && this.phpEditor) {
            this.phpEditor.getAction('editor.action.formatDocument').run();
        } else if (type === 'python' && this.pythonEditor) {
            this.pythonEditor.getAction('editor.action.formatDocument').run();
        }
    }
}

// Initialize Monaco when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    window.monacoManager = new MonacoManager();
    await window.monacoManager.init();
});

// Global function for theme updates
window.updateMonacoTheme = (theme) => {
    if (window.monacoManager) {
        window.monacoManager.updateTheme(theme);
    }
};
