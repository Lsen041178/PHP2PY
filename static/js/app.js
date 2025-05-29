// Main application logic for PHP to Python AI Converter
class PHPToPythonConverter {
    constructor() {
        this.apiConnected = false;
        this.selectedModel = '';
        this.currentPythonCode = '';
        this.currentDocumentation = '';
        this.currentSecurityReport = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeTabSystem();
        this.setupFileUpload();
    }

    setupEventListeners() {
        // API Connection
        document.getElementById('connect-btn')?.addEventListener('click', () => {
            this.connectToAPI();
        });

        // Model selection
        document.getElementById('model-select')?.addEventListener('change', (e) => {
            this.selectedModel = e.target.value;
            this.updateConvertButtonState();
        });

        // Code conversion
        document.getElementById('convert-btn')?.addEventListener('click', () => {
            this.convertCode();
        });

        // Clear PHP editor
        document.getElementById('clear-php')?.addEventListener('click', () => {
            this.clearPHPEditor();
        });

        // Clear Python editor
        document.getElementById('clear-python')?.addEventListener('click', () => {
            this.clearPythonEditor();
        });

        // Download PHP code
        document.getElementById('download-php')?.addEventListener('click', () => {
            this.downloadFile('php');
        });

        // Full screen editors
        document.getElementById('fullscreen-php-btn')?.addEventListener('click', () => {
            this.openFullscreenEditor('php');
        });

        document.getElementById('fullscreen-python-btn')?.addEventListener('click', () => {
            this.openFullscreenEditor('python');
        });

        document.getElementById('close-fullscreen')?.addEventListener('click', () => {
            this.closeFullscreenEditor();
        });



        // Code explanation buttons
        document.getElementById('explain-php-btn')?.addEventListener('click', () => {
            this.explainCode('php');
        });

        document.getElementById('explain-python-btn')?.addEventListener('click', () => {
            this.explainCode('python');
        });

        // Security analysis buttons
        document.getElementById('analyze-php-security-btn')?.addEventListener('click', () => {
            this.analyzeCodeSecurity('php');
        });

        document.getElementById('analyze-python-security-btn')?.addEventListener('click', () => {
            this.analyzeCodeSecurity('python');
        });

        // Modal controls
        document.getElementById('close-modal')?.addEventListener('click', () => {
            this.closeExplanationModal();
        });

        document.getElementById('copy-explanation')?.addEventListener('click', () => {
            this.copyExplanation();
        });

        document.getElementById('download-explanation')?.addEventListener('click', () => {
            this.downloadExplanation();
        });

        // Close modal when clicking outside
        document.getElementById('explanation-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'explanation-modal') {
                this.closeExplanationModal();
            }
        });

        // Security modal controls
        document.getElementById('close-security-modal')?.addEventListener('click', () => {
            this.closeSecurityModal();
        });

        // New security modal close button
        document.getElementById('close-sec-modal')?.addEventListener('click', () => {
            this.closeNewSecurityModal();
        });

        // Apply security fixes button (main one)
        document.getElementById('apply-sec-fixes')?.addEventListener('click', () => {
            this.applySecurityFixes();
        });

        document.getElementById('copy-security-report')?.addEventListener('click', () => {
            this.copySecurityReport();
        });

        // Close security modal when clicking outside
        document.getElementById('security-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'security-modal') {
                this.closeSecurityModal();
            }
        });

        // Security panel controls
        document.getElementById('close-security-panel')?.addEventListener('click', () => {
            this.closeSecurityPanel();
        });

        document.getElementById('apply-all-fixes-btn')?.addEventListener('click', () => {
            this.applyAllSecurityFixes();
        });

        // Download buttons
        document.getElementById('download-py')?.addEventListener('click', () => {
            this.downloadFile('python');
        });

        document.getElementById('download-python')?.addEventListener('click', () => {
            this.downloadFile('python');
        });

        document.getElementById('download-docs')?.addEventListener('click', () => {
            this.downloadFile('documentation');
        });
    }

    initializeTabSystem() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.forEach(btn => {
                    btn.classList.remove('active', 'border-primary-500', 'text-primary-600', 'dark:text-primary-400');
                    btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-300');
                });
                
                button.classList.add('active', 'border-primary-500', 'text-primary-600', 'dark:text-primary-400');
                button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'dark:text-gray-400', 'dark:hover:text-gray-300');

                // Show/hide tab content
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });
                
                const targetTab = document.getElementById(`${tabName}-tab`);
                if (targetTab) {
                    targetTab.classList.remove('hidden');
                }
            });
        });
    }

    setupFileUpload() {
        const fileInput = document.getElementById('file-upload');
        
        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadFile(file);
            }
        });

        // Drag and drop support
        const phpEditor = document.getElementById('php-editor');
        if (phpEditor) {
            phpEditor.addEventListener('dragover', (e) => {
                e.preventDefault();
                phpEditor.classList.add('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900');
            });

            phpEditor.addEventListener('dragleave', (e) => {
                e.preventDefault();
                phpEditor.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900');
            });

            phpEditor.addEventListener('drop', (e) => {
                e.preventDefault();
                phpEditor.classList.remove('border-primary-500', 'bg-primary-50', 'dark:bg-primary-900');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.uploadFile(files[0]);
                }
            });
        }
    }

    async connectToAPI() {
        const baseUrl = document.getElementById('base-url')?.value.trim();
        const apiKey = document.getElementById('api-key')?.value.trim();
        const connectBtn = document.getElementById('connect-btn');
        const modelSelect = document.getElementById('model-select');
        const statusDiv = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');

        if (!baseUrl || !apiKey) {
            this.showToast('Please enter both Base URL and API Key', 'error');
            return;
        }

        // Show loading state
        this.setButtonLoading(connectBtn, true);
        this.showModelLoading(true);
        this.showStatus('Connecting to API...', 'connecting');

        try {
            const response = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base_url: baseUrl, api_key: apiKey })
            });

            const data = await response.json();

            if (data.success) {
                this.apiConnected = true;
                this.populateModels(data.models);
                this.showStatus(data.message, 'connected');
                this.showToast('Successfully connected to AI API!', 'success');
            } else {
                this.showStatus(data.error, 'disconnected');
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showStatus('Connection failed', 'disconnected');
            this.showToast('Failed to connect to API', 'error');
            console.error('API connection error:', error);
        } finally {
            this.setButtonLoading(connectBtn, false);
            this.showModelLoading(false);
        }
    }

    showModelLoading(show) {
        const modelLoading = document.getElementById('model-loading');
        const modelSelect = document.getElementById('model-select');
        
        if (modelLoading && modelSelect) {
            if (show) {
                modelLoading.classList.remove('hidden');
                modelLoading.classList.add('flex');
                modelSelect.disabled = true;
            } else {
                modelLoading.classList.add('hidden');
                modelLoading.classList.remove('flex');
            }
        }
    }

    populateModels(models) {
        const modelSelect = document.getElementById('model-select');
        if (!modelSelect) return;

        modelSelect.innerHTML = '<option value="">Select Model</option>';
        
        // Group models by provider for better organization
        const groupedModels = this.groupModelsByProvider(models);
        
        Object.keys(groupedModels).forEach(provider => {
            if (Object.keys(groupedModels).length > 1) {
                // Add optgroup if multiple providers
                const optgroup = document.createElement('optgroup');
                optgroup.label = provider;
                
                groupedModels[provider].forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    optgroup.appendChild(option);
                });
                
                modelSelect.appendChild(optgroup);
            } else {
                // Single provider, no grouping needed
                groupedModels[provider].forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            }
        });

        modelSelect.disabled = false;
        
        // Auto-select best available model
        this.autoSelectBestModel(modelSelect, models);
    }

    groupModelsByProvider(models) {
        const grouped = {};
        
        models.forEach(model => {
            let provider = 'Models';
            
            if (model.id.includes('claude')) {
                provider = 'Anthropic Claude';
            } else if (model.id.includes('gemini')) {
                provider = 'Google Gemini';
            } else if (model.id.includes('gpt')) {
                provider = 'OpenAI GPT';
            } else if (model.id.includes('llama')) {
                provider = 'Meta Llama';
            } else if (model.id.includes('mixtral')) {
                provider = 'Mistral';
            }
            
            if (!grouped[provider]) {
                grouped[provider] = [];
            }
            grouped[provider].push(model);
        });
        
        return grouped;
    }

    autoSelectBestModel(modelSelect, models) {
        // Priority order for auto-selection
        const priorities = [
            'claude-3-5-sonnet-20241022',
            'gpt-4o',
            'gpt-4',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ];
        
        for (const priority of priorities) {
            const option = Array.from(modelSelect.options).find(opt => 
                opt.value.toLowerCase().includes(priority.toLowerCase())
            );
            if (option) {
                modelSelect.value = option.value;
                this.selectedModel = option.value;
                this.updateConvertButtonState();
                
                // Show success message with selected model
                this.showToast(`Auto-selected ${option.textContent}`, 'success');
                return;
            }
        }
        
        // If no priority model found, select the first available
        if (models.length > 0) {
            modelSelect.value = models[0].id;
            this.selectedModel = models[0].id;
            this.updateConvertButtonState();
        }
    }

    updateConvertButtonState() {
        const convertBtn = document.getElementById('convert-btn');
        if (!convertBtn) return;

        const hasCode = window.monacoManager?.getCode('php').trim().length > 0;
        const hasModel = this.selectedModel && this.selectedModel !== '';
        
        convertBtn.disabled = !this.apiConnected || !hasCode || !hasModel;
    }

    async convertCode() {
        if (!this.apiConnected || !this.selectedModel) {
            this.showToast('Please connect to API and select a model first', 'error');
            return;
        }

        const phpCode = window.monacoManager?.getCode('php');
        if (!phpCode?.trim()) {
            this.showToast('Please enter PHP code to convert', 'error');
            return;
        }

        const convertBtn = document.getElementById('convert-btn');
        const applySecurity = document.getElementById('apply-security')?.checked;

        this.showLoading('Converting PHP to Python...');
        this.setButtonLoading(convertBtn, true);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    php_code: phpCode,
                    model: this.selectedModel,
                    apply_security: applySecurity
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentPythonCode = data.python_code;
                window.monacoManager?.setCode('python', data.python_code);
                
                // Enable Python explain, security, and test generation buttons
                const explainPythonBtn = document.getElementById('explain-python-btn');
                const analyzePythonSecurityBtn = document.getElementById('analyze-python-security-btn');
                const generatePythonTestsBtn = document.getElementById('generate-python-tests');
                const downloadPyBtn = document.getElementById('download-py');
                
                if (explainPythonBtn) explainPythonBtn.disabled = false;
                if (analyzePythonSecurityBtn) analyzePythonSecurityBtn.disabled = false;
                if (generatePythonTestsBtn) generatePythonTestsBtn.disabled = false;
                if (downloadPyBtn) downloadPyBtn.disabled = false;
                
                if (data.security_report) {
                    this.currentSecurityReport = data.security_report;
                    this.displaySecurityReport(data.security_report);
                }

                this.showToast('Code converted successfully!', 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Conversion failed. Please try again.', 'error');
            console.error('Conversion error:', error);
        } finally {
            this.hideLoading();
            this.setButtonLoading(convertBtn, false);
        }
    }

    async uploadFile(file) {
        if (!file.name.match(/\.(php|txt)$/i)) {
            this.showToast('Please upload a PHP or TXT file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.showLoading('Uploading file...');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                window.monacoManager?.setCode('php', data.content);
                this.showToast(`File "${data.filename}" uploaded successfully!`, 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('File upload failed', 'error');
            console.error('Upload error:', error);
        } finally {
            this.hideLoading();
        }
    }

    clearPHPEditor() {
        window.monacoManager?.setCode('php', '');
        this.showToast('PHP editor cleared', 'success');
    }

    clearPythonEditor() {
        window.monacoManager?.setCode('python', '');
        this.showToast('Python editor cleared', 'success');
    }

    openFullscreenEditor(language) {
        const modal = document.getElementById('fullscreen-modal');
        const fullscreenEditor = document.getElementById('fullscreen-editor');
        const titleLang = document.getElementById('fullscreen-lang');
        const titleIcon = document.getElementById('fullscreen-icon');
        
        if (!modal || !fullscreenEditor) return;
        
        // Get current code
        const currentCode = window.monacoManager?.getCode(language) || '';
        
        // Update modal title and icon
        if (language === 'php') {
            titleLang.textContent = 'PHP';
            titleIcon.className = 'fab fa-php mr-2 text-blue-400';
        } else {
            titleLang.textContent = 'Python';
            titleIcon.className = 'fab fa-python mr-2 text-yellow-400';
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Initialize Monaco editor in fullscreen
        setTimeout(() => {
            if (window.monaco) {
                this.fullscreenEditorInstance = window.monaco.editor.create(fullscreenEditor, {
                    value: currentCode,
                    language: language === 'php' ? 'php' : 'python',
                    theme: window.themeManager?.getCurrentTheme() === 'dark' ? 'vs-dark' : 'vs-light',
                    fontSize: 16,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                });
                
                this.currentFullscreenLanguage = language;
                
                // Focus the editor
                this.fullscreenEditorInstance.focus();
            }
        }, 100);
    }

    closeFullscreenEditor() {
        const modal = document.getElementById('fullscreen-modal');
        
        if (this.fullscreenEditorInstance && this.currentFullscreenLanguage) {
            // Get the updated code from fullscreen editor
            const updatedCode = this.fullscreenEditorInstance.getValue();
            
            // Update the original editor
            window.monacoManager?.setCode(this.currentFullscreenLanguage, updatedCode);
            
            // Dispose the fullscreen editor
            this.fullscreenEditorInstance.dispose();
            this.fullscreenEditorInstance = null;
            this.currentFullscreenLanguage = null;
        }
        
        modal.classList.add('hidden');
        
        // Ensure the main editors use the correct theme after closing fullscreen
        setTimeout(() => {
            if (window.monacoManager && window.themeManager) {
                window.monacoManager.updateTheme(window.themeManager.getCurrentTheme());
            }
        }, 100);
    }

    async analyzeCodeSecurity(language = 'php') {
        const code = window.monacoManager?.getCode(language);
        if (!code?.trim()) {
            this.showToast(`No ${language.toUpperCase()} code to analyze`, 'error');
            return;
        }

        if (!this.apiConnected || !this.selectedModel) {
            this.showToast('Please connect to API and select a model first', 'error');
            return;
        }

        // Set the current security language for apply fixes
        this.currentSecurityLanguage = language;
        console.log('Security analysis - Set language to:', language);

        // Show loading state for new security modal
        this.showSecurityLoading(language);

        try {
            const response = await fetch('/api/analyze-security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    model: this.selectedModel
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('Security analysis data:', data); // Debug log
                
                // Show security report in new modal
                this.showSecurityReport(data.security_report, language);
                
                this.showToast(`${language.toUpperCase()} security analysis completed!`, 'success');
            } else {
                this.showToast(data.error || 'Failed to analyze security', 'error');
                this.closeSecurityModal();
            }
        } catch (error) {
            this.showToast('Failed to analyze security. Please try again.', 'error');
            this.closeSecurityModal();
            console.error('Security analysis error:', error);
        }
    }

    showSecurityModal(language, loading = false) {
        const modal = document.getElementById('security-modal');
        const modalIcon = document.getElementById('security-modal-icon');
        const modalTitle = document.getElementById('security-modal-title');
        const loadingDiv = document.getElementById('security-loading');
        const reportDiv = document.getElementById('security-report-content');

        if (!modal) {
            console.error('Security modal not found');
            return;
        }
        
        // Ensure modal is visible first
        modal.classList.remove('hidden');

        // Set up modal based on language
        if (modalIcon && modalTitle) {
            if (language === 'php') {
                modalIcon.innerHTML = '<i class="fab fa-php text-2xl text-red-600"></i>';
                modalIcon.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900';
                modalTitle.textContent = 'PHP Security Analysis';
            } else {
                modalIcon.innerHTML = '<i class="fab fa-python text-2xl text-red-600"></i>';
                modalIcon.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900';
                modalTitle.textContent = 'Python Security Analysis';
            }
        }

        // Show/hide loading state
        if (loadingDiv && reportDiv) {
            if (loading) {
                loadingDiv.classList.remove('hidden');
                reportDiv.classList.add('hidden');
            } else {
                loadingDiv.classList.add('hidden');
                reportDiv.classList.remove('hidden');
            }
        }
    }

    closeSecurityModal() {
        const modal = document.getElementById('security-modal');
        modal.classList.add('hidden');
    }

    async explainCode(language = 'python') {
        const code = window.monacoManager?.getCode(language);
        if (!code?.trim()) {
            this.showToast(`No ${language.toUpperCase()} code to explain`, 'error');
            return;
        }

        if (!this.apiConnected || !this.selectedModel) {
            this.showToast('Please connect to API and select a model first', 'error');
            return;
        }

        // Show the modal with loading state
        this.showExplanationModal(language, true);

        try {
            const response = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    language: language,
                    model: this.selectedModel
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displayExplanation(data.explanation, language);
                this.showToast('Code explanation generated!', 'success');
            } else {
                this.showToast(data.error || 'Failed to generate explanation', 'error');
                this.closeExplanationModal();
            }
        } catch (error) {
            this.showToast('Failed to generate explanation. Please try again.', 'error');
            this.closeExplanationModal();
            console.error('Explanation error:', error);
        }
    }

    showExplanationModal(language, loading = false) {
        const modal = document.getElementById('explanation-modal');
        const modalIcon = document.getElementById('modal-icon');
        const modalTitle = document.getElementById('modal-title');
        const loadingDiv = document.getElementById('explanation-loading');
        const textDiv = document.getElementById('explanation-text');

        // Set up modal based on language
        if (language === 'php') {
            modalIcon.innerHTML = '<i class="fab fa-php text-2xl text-blue-600"></i>';
            modalIcon.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900';
            modalTitle.textContent = 'PHP Code Explanation';
        } else {
            modalIcon.innerHTML = '<i class="fab fa-python text-2xl text-yellow-600"></i>';
            modalIcon.className = 'w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900';
            modalTitle.textContent = 'Python Code Explanation';
        }

        // Show/hide loading state
        if (loading) {
            loadingDiv.classList.remove('hidden');
            textDiv.classList.add('hidden');
        } else {
            loadingDiv.classList.add('hidden');
            textDiv.classList.remove('hidden');
        }

        modal.classList.remove('hidden');
    }

    closeExplanationModal() {
        const modal = document.getElementById('explanation-modal');
        modal.classList.add('hidden');
    }

    displayExplanation(explanation, language) {
        const textDiv = document.getElementById('explanation-text');
        const loadingDiv = document.getElementById('explanation-loading');

        // Convert explanation to HTML with nice formatting
        const formattedExplanation = this.formatExplanationText(explanation);
        textDiv.innerHTML = formattedExplanation;

        loadingDiv.classList.add('hidden');
        textDiv.classList.remove('hidden');
    }

    formatExplanationText(text) {
        // Convert markdown-like formatting to HTML for better readability
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
            .replace(/\n\n/g, '</p><p class="mb-4">')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p class="mb-4">')
            .replace(/$/, '</p>');
    }

    displaySecurityReport(securityReport, language) {
        const reportDiv = document.getElementById('security-report-content');
        const loadingDiv = document.getElementById('security-loading');
        const applyFixesBtn = document.getElementById('apply-security-fixes-modal-btn');

        if (!reportDiv) {
            console.error('Security report div not found');
            return;
        }

        // Store current security report for later use
        this.currentSecurityReport = securityReport;
        this.currentSecurityLanguage = language;

        // Also show security issues in the bottom panel
        this.showSecurityIssuesPanel(securityReport, language);

        // Safe property access with fallbacks
        const vulnerabilities = (securityReport && securityReport.vulnerabilities_found) || 
                               (securityReport && securityReport.issues && securityReport.issues.length) || 0;
        const score = (securityReport && securityReport.security_score) || 0;
        const issues = (securityReport && securityReport.issues) || [];

        // Create severity color mapping
        const getSeverityColor = (severity) => {
            if (!severity) return 'bg-gray-100 text-gray-800 border-gray-200';
            switch(severity.toLowerCase()) {
                case 'critical': return 'bg-red-100 text-red-800 border-red-200';
                case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
                case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
                default: return 'bg-gray-100 text-gray-800 border-gray-200';
            }
        };

        const getScoreColor = (score) => {
            if (score >= 80) return 'text-green-600';
            if (score >= 60) return 'text-yellow-600';
            return 'text-red-600';
        };

        const reportHTML = `
            <div class="space-y-6">
                <!-- Security Score -->
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">Security Score</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${(securityReport && securityReport.overall_assessment) || 'Security analysis completed'}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold ${getScoreColor(score)}">${score}/100</div>
                            <div class="text-sm text-gray-500">${vulnerabilities} vulnerabilities found</div>
                        </div>
                    </div>
                </div>

                ${issues.length > 0 ? `
                <!-- Vulnerabilities Found -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Issues</h4>
                    <div class="space-y-4">
                        ${issues.map((issue, index) => `
                            <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div class="flex items-start justify-between mb-3">
                                    <div>
                                        <div class="flex items-center gap-2 mb-2">
                                            <span class="px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(issue.severity)}">
                                                ${issue.severity?.toUpperCase() || 'UNKNOWN'}
                                            </span>
                                            <h5 class="font-semibold text-gray-900 dark:text-white">${issue.title || issue.type || 'Security Issue'}</h5>
                                        </div>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">${issue.description || issue.message || 'No description available'}</p>
                                    </div>
                                    ${issue.line ? `<span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Line ${issue.line}</span>` : ''}
                                </div>
                                
                                ${issue.code_snippet ? `
                                <div class="mb-3">
                                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Problematic Code:</p>
                                    <code class="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">${issue.code_snippet}</code>
                                </div>
                                ` : ''}
                                
                                ${issue.fix ? `
                                <div class="mb-3">
                                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">How to Fix:</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">${issue.fix}</p>
                                </div>
                                ` : ''}
                                
                                ${issue.example ? `
                                <div>
                                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fixed Code Example:</p>
                                    <code class="block bg-green-50 dark:bg-green-900/20 p-2 rounded text-sm overflow-x-auto">${issue.example}</code>
                                </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div class="text-center py-8">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full mb-4">
                        <i class="fas fa-shield-alt text-2xl text-green-600 dark:text-green-400"></i>
                    </div>
                    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Security Issues Found</h4>
                    <p class="text-gray-600 dark:text-gray-400">Your ${language.toUpperCase()} code looks secure based on our analysis!</p>
                </div>
                `}

                ${securityReport.recommendations && securityReport.recommendations.length > 0 ? `
                <!-- Recommendations -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Recommendations</h4>
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <ul class="space-y-2">
                            ${securityReport.recommendations.map(rec => `
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-lightbulb text-blue-600 mt-1 text-sm"></i>
                                    <span class="text-sm text-gray-700 dark:text-gray-300">${rec}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        reportDiv.innerHTML = reportHTML;

        // Show apply fixes button if there are issues that can be fixed
        if (applyFixesBtn) {
            if (issues.length > 0) {
                applyFixesBtn.classList.remove('hidden');
            } else {
                applyFixesBtn.classList.add('hidden');
            }
        }

        // Force hide loading and show content
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
            loadingDiv.style.display = 'none';
        }
        if (reportDiv) {
            reportDiv.classList.remove('hidden');
            reportDiv.style.display = 'block';
            reportDiv.style.visibility = 'visible';
        }
        
        // Ensure the security modal is visible
        const modal = document.getElementById('security-modal');
        if (modal) {
            modal.classList.remove('hidden');
            console.log('Security modal made visible');
        }
        
        console.log('Security report displayed successfully', {
            reportDiv: reportDiv ? 'found' : 'not found',
            loadingDiv: loadingDiv ? 'found' : 'not found',
            modal: modal ? 'found' : 'not found',
            issuesCount: issues.length
        });
    }

    // New clean security report display function
    showSecurityReport(securityReport, language) {
        const modal = document.getElementById('sec-analysis-modal');
        const loadingDiv = document.getElementById('sec-loading');
        const reportDiv = document.getElementById('sec-report-display');
        const modalTitle = document.getElementById('sec-modal-title');

        if (!modal || !reportDiv) {
            console.error('Security modal elements not found');
            return;
        }

        // Update modal title
        if (modalTitle) {
            modalTitle.textContent = `${language.toUpperCase()} Security Analysis Report`;
        }

        // Store current security report for apply fixes functionality
        this.currentSecurityReport = securityReport;
        this.currentSecurityLanguage = language;

        // Hide loading and show modal
        if (loadingDiv) loadingDiv.style.display = 'none';
        modal.style.display = 'flex';
        
        // Ensure report div is visible
        reportDiv.style.display = 'block';

        // Get report data
        const issues = securityReport.issues || [];
        const score = securityReport.security_score || 0;
        const assessment = securityReport.overall_assessment || 'Analysis completed';

        // Create report HTML
        const reportHTML = `
            <div class="space-y-6">
                <!-- Security Score Card -->
                <div class="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-red-200 dark:border-red-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-xl font-bold text-gray-900 dark:text-white">Security Score</h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${assessment}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-4xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}">${score}/100</div>
                            <div class="text-sm text-gray-500">${issues.length} issues found</div>
                        </div>
                    </div>
                </div>

                ${issues.length > 0 ? `
                <!-- Security Issues -->
                <div>
                    <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <i class="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                        Security Vulnerabilities
                    </h4>
                    <div class="space-y-4">
                        ${issues.map((issue, index) => `
                            <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-3 mb-2">
                                            <span class="px-3 py-1 text-xs font-bold rounded-full ${
                                                issue.severity === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                issue.severity === 'High' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                issue.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                                'bg-blue-100 text-blue-800 border border-blue-200'
                                            }">
                                                ${issue.severity || 'Unknown'}
                                            </span>
                                            <h5 class="font-bold text-gray-900 dark:text-white">${issue.title || 'Security Issue'}</h5>
                                        </div>
                                        <p class="text-gray-700 dark:text-gray-300 mb-3">${issue.description || 'No description available'}</p>
                                        
                                        ${issue.fix ? `
                                        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3">
                                            <p class="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                                                <i class="fas fa-tools mr-1"></i>How to Fix:
                                            </p>
                                            <p class="text-sm text-green-700 dark:text-green-400">${issue.fix}</p>
                                        </div>
                                        ` : ''}
                                    </div>
                                    ${issue.line ? `<span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-3">Line ${issue.line}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div class="text-center py-12">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-800 rounded-full mb-4">
                        <i class="fas fa-shield-check text-3xl text-green-600 dark:text-green-400"></i>
                    </div>
                    <h4 class="text-xl font-bold text-gray-900 dark:text-white mb-2">No Security Issues Found</h4>
                    <p class="text-gray-600 dark:text-gray-400">Your ${language.toUpperCase()} code looks secure!</p>
                </div>
                `}

                ${securityReport.recommendations && securityReport.recommendations.length > 0 ? `
                <!-- Recommendations -->
                <div>
                    <h4 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        <i class="fas fa-lightbulb text-yellow-600 mr-2"></i>
                        Security Recommendations
                    </h4>
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <ul class="space-y-2">
                            ${securityReport.recommendations.map(rec => `
                                <li class="flex items-start gap-2">
                                    <i class="fas fa-check-circle text-blue-600 mt-1 text-sm"></i>
                                    <span class="text-sm text-gray-700 dark:text-gray-300">${rec}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        reportDiv.innerHTML = reportHTML;
        
        // Force show the content
        setTimeout(() => {
            reportDiv.style.display = 'block';
            reportDiv.style.visibility = 'visible';
            reportDiv.style.opacity = '1';
        }, 100);
        
        console.log('Security report displayed successfully with new modal', {
            modalVisible: modal.style.display,
            reportDivVisible: reportDiv.style.display,
            htmlLength: reportHTML.length,
            issuesCount: issues.length
        });
    }

    closeNewSecurityModal() {
        const modal = document.getElementById('sec-analysis-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSecurityLoading(language) {
        const modal = document.getElementById('sec-analysis-modal');
        const loadingDiv = document.getElementById('sec-loading');
        const reportDiv = document.getElementById('sec-report-display');
        const modalTitle = document.getElementById('sec-modal-title');

        if (modal && loadingDiv && reportDiv) {
            // Update title
            if (modalTitle) {
                modalTitle.textContent = `Analyzing ${language.toUpperCase()} Security...`;
            }

            // Show modal with loading
            modal.style.display = 'flex';
            loadingDiv.style.display = 'block';
            reportDiv.style.display = 'none';
        }
    }

    showSecurityFixLoading() {
        const modal = document.getElementById('sec-analysis-modal');
        const loadingDiv = document.getElementById('sec-loading');
        const reportDiv = document.getElementById('sec-report-display');
        const modalTitle = document.getElementById('sec-modal-title');

        if (modal && loadingDiv && reportDiv) {
            // Update title for applying fixes
            if (modalTitle) {
                modalTitle.textContent = `Applying ${this.currentSecurityLanguage.toUpperCase()} Security Fixes...`;
            }

            // Show loading state
            loadingDiv.style.display = 'block';
            reportDiv.style.display = 'none';
        }
    }

    async applySecurityFixes() {
        if (!this.currentSecurityReport || !this.currentSecurityLanguage) {
            this.showToast('No security report available to apply fixes', 'error');
            return;
        }

        if (!this.apiConnected || !this.selectedModel) {
            this.showToast('Please connect to API first', 'error');
            return;
        }

        const currentCode = window.monacoManager?.getCode(this.currentSecurityLanguage);
        if (!currentCode?.trim()) {
            this.showToast('No code to fix', 'error');
            return;
        }

        // Debug logging
        console.log('Apply fixes - Language:', this.currentSecurityLanguage);
        console.log('Apply fixes - Code length:', currentCode.length);
        
        // Show loading state in the modal
        this.showSecurityFixLoading();
        this.showLoading('Applying security fixes, please wait...');

        try {
            const requestData = {
                language: this.currentSecurityLanguage,
                security_report: this.currentSecurityReport,
                model: this.selectedModel,
                // Send language-specific code properly
                php_code: this.currentSecurityLanguage === 'php' ? currentCode : '',
                python_code: this.currentSecurityLanguage === 'python' ? currentCode : ''
            };
            
            console.log('Sending request data:', requestData);

            const response = await fetch('/api/apply-security-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (data.success) {
                // Get the correct fixed code based on language
                let fixedCode;
                if (this.currentSecurityLanguage === 'php') {
                    fixedCode = data.php_code || data.fixed_code;
                } else if (this.currentSecurityLanguage === 'python') {
                    fixedCode = data.python_code || data.fixed_code;
                }
                
                if (fixedCode) {
                    // Update the correct editor
                    window.monacoManager?.setCode(this.currentSecurityLanguage, fixedCode);
                    console.log(`Updated ${this.currentSecurityLanguage} editor with fixed code`);
                }
                
                // Show success message in modal first
                this.showSuccessInModal('Security fixes applied successfully!');
                
                // Auto-close modal after 2 seconds WITHOUT re-analyzing
                setTimeout(() => {
                    this.closeNewSecurityModal();
                    this.showToast('Security fixes applied successfully!', 'success');
                    // Removed automatic re-analysis to prevent popup from reopening
                }, 2000);
            } else {
                this.showToast(data.error || 'Failed to apply fixes', 'error');
            }
        } catch (error) {
            this.showToast('Failed to apply security fixes', 'error');
            console.error('Apply fixes error:', error);
        } finally {
            this.hideLoading();
        }
    }

    showSuccessInModal(message) {
        const reportDiv = document.getElementById('sec-report-display');
        if (reportDiv) {
            reportDiv.innerHTML = `
                <div class="text-center py-12">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-800 rounded-full mb-4">
                        <i class="fas fa-check-circle text-3xl text-green-600 dark:text-green-400"></i>
                    </div>
                    <h4 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${message}</h4>
                    <p class="text-gray-600 dark:text-gray-400">Modal will close automatically...</p>
                    <div class="mt-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                    </div>
                </div>
            `;
        }
    }

    copySecurityReport() {
        const reportDiv = document.getElementById('security-report-content');
        const text = reportDiv.textContent || reportDiv.innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Security report copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy security report', 'error');
        });
    }

    async applySecurityFixesFromModal() {
        if (!this.currentSecurityReport || !this.currentSecurityLanguage) {
            this.showToast('No security report available', 'error');
            return;
        }

        const language = this.currentSecurityLanguage;
        const code = window.monacoManager?.getCode(language);
        
        if (!code?.trim()) {
            this.showToast(`No ${language.toUpperCase()} code to fix`, 'error');
            return;
        }

        this.closeSecurityModal();
        this.showLoading(`Applying ${language.toUpperCase()} security fixes...`);

        try {
            const response = await fetch('/api/apply-security-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [language === 'php' ? 'php_code' : 'python_code']: code,
                    security_report: this.currentSecurityReport,
                    model: this.selectedModel,
                    language: language
                })
            });

            const data = await response.json();

            if (data.success) {
                const fixedCode = data[language === 'php' ? 'php_code' : 'python_code'] || data.fixed_code;
                window.monacoManager?.setCode(language, fixedCode);
                
                if (data.security_report) {
                    this.currentSecurityReport = data.security_report;
                }

                this.showToast(`${language.toUpperCase()} security fixes applied successfully!`, 'success');
            } else {
                this.showToast(data.error || 'Failed to apply security fixes', 'error');
            }
        } catch (error) {
            this.showToast('Failed to apply security fixes. Please try again.', 'error');
            console.error('Security fixes error:', error);
        } finally {
            this.hideLoading();
        }
    }

    copyExplanation() {
        const textDiv = document.getElementById('explanation-text');
        const text = textDiv.textContent || textDiv.innerText;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Explanation copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy explanation', 'error');
        });
    }

    downloadExplanation() {
        const textDiv = document.getElementById('explanation-text');
        const text = textDiv.textContent || textDiv.innerText;
        const modalTitle = document.getElementById('modal-title').textContent;
        
        if (!text.trim()) {
            this.showToast('No explanation text to download', 'error');
            return;
        }
        
        // Create filename based on language and timestamp
        const language = modalTitle.includes('PHP') ? 'PHP' : 'Python';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${language}_Code_Explanation_${timestamp}.txt`;
        
        // Create and download file
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.showToast(`Explanation downloaded as ${filename}`, 'success');
    }

    async generateDocumentation() {
        const pythonCode = window.monacoManager?.getCode('python');
        const phpCode = window.monacoManager?.getCode('php');
        
        if (!pythonCode?.trim()) {
            this.showToast('No Python code to document', 'error');
            return;
        }

        const docsBtn = document.getElementById('generate-docs-btn');
        this.setButtonLoading(docsBtn, true);
        this.showLoading('Generating documentation...');

        try {
            const response = await fetch('/api/generate-docs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    python_code: pythonCode,
                    php_code: phpCode,
                    security_report: this.currentSecurityReport,
                    model: this.selectedModel
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentDocumentation = data.documentation;
                this.displayDocumentation(data.documentation);
                
                // Enable download docs button
                const downloadDocsBtn = document.getElementById('download-docs');
                if (downloadDocsBtn) downloadDocsBtn.disabled = false;
                
                this.showToast('Documentation generated!', 'success');
            } else {
                this.showToast(data.error, 'error');
            }
        } catch (error) {
            this.showToast('Documentation generation failed', 'error');
            console.error('Documentation error:', error);
        } finally {
            this.hideLoading();
            this.setButtonLoading(docsBtn, false);
        }
    }



    downloadFile(type) {
        let content, filename, extension;

        if (type === 'python') {
            content = this.currentPythonCode;
            filename = 'converted_code';
            extension = 'py';
        } else if (type === 'php') {
            content = window.monacoManager?.getCode('php');
            filename = 'source_code';
            extension = 'php';
        } else if (type === 'documentation') {
            content = this.currentDocumentation;
            filename = 'documentation';
            extension = 'md';
        }

        if (!content) {
            this.showToast(`No ${type} content to download`, 'error');
            return;
        }

        // Create download URL
        const params = new URLSearchParams({
            content: content,
            filename: filename
        });

        const url = `/api/download/${extension}?${params.toString()}`;
        
        // Create temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        this.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} downloaded!`, 'success');
    }

    displaySecurityReport(report) {
        const container = document.getElementById('security-results');
        if (!container) return;

        // Enable/disable the apply security fixes button
        const applyFixesBtn = document.getElementById('apply-security-fixes-btn');
        if (applyFixesBtn) {
            applyFixesBtn.disabled = !report.issues || report.issues.length === 0;
        }

        const score = report.security_score;
        const scoreClass = score >= 80 ? 'security-score-high' : 
                          score >= 60 ? 'security-score-medium' : 'security-score-low';

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex items-center justify-between">
                    <h4 class="text-lg font-semibold">Security Analysis Results</h4>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm text-gray-600 dark:text-gray-400">Security Score:</span>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${scoreClass}">${score}/100</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">${report.summary.high_severity}</div>
                        <div class="text-sm text-red-600 dark:text-red-400">High Severity</div>
                    </div>
                    <div class="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${report.summary.medium_severity}</div>
                        <div class="text-sm text-yellow-600 dark:text-yellow-400">Medium Severity</div>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${report.summary.low_severity}</div>
                        <div class="text-sm text-blue-600 dark:text-blue-400">Low Severity</div>
                    </div>
                </div>

                ${report.issues.length > 0 ? `
                    <div class="space-y-4">
                        <h5 class="font-semibold">Security Issues</h5>
                        ${report.issues.map(issue => `
                            <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center space-x-2">
                                            <span class="px-2 py-1 text-xs rounded ${
                                                issue.severity === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            }">${issue.severity.toUpperCase()}</span>
                                            <span class="text-sm text-gray-500 dark:text-gray-400">Line ${issue.line}</span>
                                        </div>
                                        <h6 class="font-medium mt-2">${issue.message}</h6>
                                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${issue.recommendation}</p>
                                        ${issue.code_snippet ? `<code class="code-highlight mt-2 block">${issue.code_snippet}</code>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${report.recommendations.length > 0 ? `
                    <div class="space-y-2">
                        <h5 class="font-semibold">Recommendations</h5>
                        <ul class="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }

    displayTestResults(testCode, testResults) {
        const container = document.getElementById('test-results');
        if (!container) return;

        const success = testResults.success;
        const statusClass = success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const statusIcon = success ? 'fa-check-circle' : 'fa-times-circle';
        const bgClass = success ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20' : 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Results Summary -->
                <div class="bg-gradient-to-r ${bgClass} rounded-xl p-6 border ${success ? 'border-green-200 dark:border-green-700' : 'border-red-200 dark:border-red-700'}">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-lg font-semibold flex items-center">
                            <i class="fas ${statusIcon} ${statusClass} mr-3 text-xl"></i>
                            Code Verification Results
                        </h4>
                        <span class="px-4 py-2 rounded-full text-sm font-medium ${success ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'}">
                            ${success ? '✅ Working Correctly' : '❌ Needs Attention'}
                        </span>
                    </div>
                    
                    <div class="text-sm ${success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}">
                        ${success ? 
                            '🎉 Great news! Your converted Python code is working perfectly. All verification tests passed successfully.' : 
                            '⚠️ Your Python code needs some adjustments. Don\'t worry - this is normal during conversion. The system will automatically try to fix these issues.'
                        }
                    </div>
                    
                    ${testResults.execution_time ? `
                        <div class="mt-3 text-xs text-gray-600 dark:text-gray-400">
                            <i class="fas fa-clock mr-1"></i>Tested in ${testResults.execution_time.toFixed(2)}s
                        </div>
                    ` : ''}
                </div>

                <!-- What Was Tested -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h5 class="font-semibold mb-4 flex items-center">
                        <i class="fas fa-list-check text-blue-600 mr-2"></i>
                        What We Tested
                    </h5>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <pre class="text-sm overflow-x-auto text-gray-700 dark:text-gray-300 whitespace-pre-wrap"><code>${this.escapeHtml(testCode)}</code></pre>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        These tests verify that your converted Python code functions correctly with realistic inputs and produces expected outputs.
                    </p>
                </div>

                <!-- Detailed Results -->
                <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h5 class="font-semibold mb-4 flex items-center">
                        ${success ? 
                            '<i class="fas fa-thumbs-up text-green-600 mr-2"></i>Success Details' : 
                            '<i class="fas fa-bug text-red-600 mr-2"></i>Issues Found'
                        }
                    </h5>
                    
                    ${testResults.stdout ? `
                        <div class="mb-4">
                            <h6 class="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center">
                                <i class="fas fa-check mr-1"></i>Successful Output
                            </h6>
                            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                                <pre class="text-sm overflow-x-auto text-green-700 dark:text-green-300 whitespace-pre-wrap"><code>${this.escapeHtml(testResults.stdout)}</code></pre>
                            </div>
                        </div>
                    ` : ''}

                    ${testResults.stderr ? `
                        <div class="mb-4">
                            <h6 class="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center">
                                <i class="fas fa-exclamation-triangle mr-1"></i>Error Details
                            </h6>
                            <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
                                <pre class="text-sm overflow-x-auto text-red-700 dark:text-red-300 whitespace-pre-wrap"><code>${this.escapeHtml(testResults.stderr)}</code></pre>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${!success ? `
                        <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                            <h6 class="font-medium text-blue-800 dark:text-blue-200 mb-2">
                                <i class="fas fa-lightbulb mr-1"></i>What This Means for You
                            </h6>
                            <p class="text-sm text-blue-700 dark:text-blue-300">
                                The test failures above show specific areas where your converted Python code might need adjustment. 
                                This is completely normal during PHP to Python conversion. The AI system will automatically attempt to fix these issues.
                            </p>
                        </div>
                    ` : `
                        <div class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                            <h6 class="font-medium text-green-800 dark:text-green-200 mb-2">
                                <i class="fas fa-check-double mr-1"></i>Perfect Conversion!
                            </h6>
                            <p class="text-sm text-green-700 dark:text-green-300">
                                Your PHP code has been successfully converted to Python and all verification tests pass. 
                                The code is ready to use in your Python projects!
                            </p>
                        </div>
                    `}

                    <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span><i class="fas fa-info-circle mr-1"></i>Exit Code: ${testResults.exit_code}</span>
                    </div>
                </div>
            </div>
        `;
    }



    displayDocumentation(documentation) {
        const container = document.getElementById('documentation-content');
        if (!container) return;

        container.innerHTML = `
            <div class="prose dark:prose-invert max-w-none">
                ${this.markdownToHtml(documentation)}
            </div>
        `;
    }

    markdownToHtml(markdown) {
        // Simple markdown to HTML conversion
        return markdown
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mt-4 mb-2">$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/`([^`]*)`/gim, '<code class="code-highlight">$1</code>')
            .replace(/```([^`]*)```/gim, '<pre class="bg-gray-100 dark:bg-gray-800 rounded p-4 overflow-x-auto"><code>$1</code></pre>')
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gims, '<ul class="list-disc list-inside space-y-1 my-4">$1</ul>')
            .replace(/\n\n/gim, '</p><p class="mb-4">')
            .replace(/^(?!<[h|u|p|c])(.*)$/gim, '<p class="mb-4">$1</p>');
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('connection-status');
        const statusText = document.getElementById('status-text');
        
        if (statusDiv && statusText) {
            statusDiv.classList.remove('hidden');
            statusText.textContent = message;
            
            const icon = statusDiv.querySelector('i');
            if (icon) {
                icon.className = `fas fa-circle mr-2 status-${type}`;
            }
        }
    }

    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            if (text) text.textContent = message;
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;
        
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle text-green-600' :
                    type === 'error' ? 'fa-times-circle text-red-600' :
                    type === 'warning' ? 'fa-exclamation-triangle text-yellow-600' :
                    'fa-info-circle text-blue-600';

        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas ${icon}"></i>
                <span class="flex-1">${message}</span>
                <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Enhanced Security Panel Functions
    showSecurityIssuesPanel(securityReport, language) {
        const panel = document.getElementById('security-issues-panel');
        const summary = document.getElementById('security-panel-summary');
        const issuesList = document.getElementById('security-issues-list');
        
        if (!panel || !securityReport) {
            console.log('Security panel elements not found or no report');
            return;
        }

        const issues = securityReport.issues || [];
        const vulnerabilities = securityReport.vulnerabilities_found || issues.length || 0;
        
        if (vulnerabilities > 0) {
            panel.classList.remove('hidden');
            summary.textContent = `${vulnerabilities} security issues found in ${language.toUpperCase()} code. Click to view details and apply fixes.`;
            
            // Populate issues list
            issuesList.innerHTML = issues.map((issue, index) => `
                <div class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getSeverityColor(issue.severity)}">
                                    ${issue.severity || 'Medium'}
                                </span>
                                <span class="text-sm text-gray-500 dark:text-gray-400">
                                    Line ${issue.line || 'Unknown'}
                                </span>
                            </div>
                            <h4 class="font-semibold text-gray-900 dark:text-white mb-1">
                                ${issue.title || 'Security Issue'}
                            </h4>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                ${issue.description || 'Security vulnerability detected'}
                            </p>
                            ${issue.fix ? `
                                <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3">
                                    <p class="text-sm text-green-800 dark:text-green-200">
                                        <i class="fas fa-lightbulb mr-1"></i>
                                        <strong>Fix:</strong> ${issue.fix}
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                        <button class="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                onclick="app.applyIndividualFix(${index})">
                            <i class="fas fa-wrench mr-1"></i>Apply Fix
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            panel.classList.add('hidden');
        }
    }

    getSeverityColor(severity) {
        if (!severity) return 'bg-gray-100 text-gray-800';
        switch(severity.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    closeSecurityPanel() {
        const panel = document.getElementById('security-issues-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    async applyAllSecurityFixes() {
        if (!this.currentSecurityReport || !this.currentSecurityLanguage) {
            this.showToast('No security issues to fix', 'error');
            return;
        }

        const language = this.currentSecurityLanguage;
        const code = window.monacoManager?.getCode(language);
        
        if (!code?.trim()) {
            this.showToast(`No ${language.toUpperCase()} code available`, 'error');
            return;
        }

        this.showLoading(`Applying all ${language.toUpperCase()} security fixes...`);
        
        try {
            const response = await fetch('/api/apply-security-fixes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [language === 'php' ? 'php_code' : 'python_code']: code,
                    security_report: this.currentSecurityReport,
                    model: this.selectedModel,
                    language: language
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update the code editor with fixed code
                if (data.fixed_code) {
                    window.monacoManager?.setCode(language, data.fixed_code);
                }
                
                this.showToast('Security fixes applied successfully!', 'success');
                this.closeSecurityPanel();
                
                // Re-analyze security to show updated status
                setTimeout(() => {
                    this.analyzeCodeSecurity(language);
                }, 1000);
            } else {
                this.showToast(data.error || 'Failed to apply security fixes', 'error');
            }
        } catch (error) {
            this.showToast('Failed to apply security fixes. Please try again.', 'error');
            console.error('Security fixes error:', error);
        } finally {
            this.hideLoading();
        }
    }

    async applyIndividualFix(issueIndex) {
        if (!this.currentSecurityReport || !this.currentSecurityLanguage) {
            this.showToast('No security issue information available', 'error');
            return;
        }

        const issues = this.currentSecurityReport.issues || [];
        if (issueIndex >= issues.length) {
            this.showToast('Invalid security issue', 'error');
            return;
        }

        const issue = issues[issueIndex];
        const language = this.currentSecurityLanguage;
        const code = window.monacoManager?.getCode(language);
        
        if (!code?.trim()) {
            this.showToast(`No ${language.toUpperCase()} code available`, 'error');
            return;
        }

        this.showLoading(`Applying fix for: ${issue.title}...`);
        
        try {
            const response = await fetch('/api/apply-individual-security-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [language === 'php' ? 'php_code' : 'python_code']: code,
                    issue: issue,
                    model: this.selectedModel,
                    language: language
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update the code editor with fixed code
                if (data.fixed_code) {
                    window.monacoManager?.setCode(language, data.fixed_code);
                }
                
                this.showToast(`Fixed: ${issue.title}`, 'success');
                
                // Re-analyze security to show updated status
                setTimeout(() => {
                    this.analyzeCodeSecurity(language);
                }, 1000);
            } else {
                this.showToast(data.error || 'Failed to apply security fix', 'error');
            }
        } catch (error) {
            this.showToast('Failed to apply security fix. Please try again.', 'error');
            console.error('Individual security fix error:', error);
        } finally {
            this.hideLoading();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PHPToPythonConverter();
});
