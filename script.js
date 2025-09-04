class SlimLeaderboardApp {
    constructor() {
        this.form = document.getElementById('repository-form');
        this.submitBtn = document.getElementById('analyze-btn');
        this.loader = document.getElementById('loader');
        this.btnText = document.querySelector('.btn-text');
        this.resultsSection = document.getElementById('results-section');
        this.resultsContent = document.getElementById('results-content');
        this.errorSection = document.getElementById('error-section');
        this.errorMessage = document.getElementById('error-message');
        this.clearBtn = document.getElementById('clear-results');
        this.targetTypeSelect = document.getElementById('target-type');
        this.urlLabel = document.getElementById('url-label');
        this.urlHelp = document.getElementById('url-help');
        this.repoUrlInput = document.getElementById('repo-url');
        this.progressSection = document.getElementById('progress-section');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        this.clearBtn.addEventListener('click', this.clearResults.bind(this));
        this.targetTypeSelect.addEventListener('change', this.handleTargetTypeChange.bind(this));
        
        // Initialize the form state
        this.handleTargetTypeChange();
    }

    handleTargetTypeChange() {
        const targetType = this.targetTypeSelect.value;
        
        if (targetType === 'organization') {
            this.urlLabel.textContent = 'GitHub Organization URL';
            this.repoUrlInput.placeholder = 'https://github.com/nasa-ammos';
            this.urlHelp.textContent = 'Enter a GitHub organization URL (e.g., https://github.com/nasa-ammos) - note: lowercase';
        } else {
            this.urlLabel.textContent = 'GitHub Repository URL';
            this.repoUrlInput.placeholder = 'https://github.com/owner/repository';
            this.urlHelp.textContent = 'Enter a GitHub repository URL';
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(this.form);
        const targetUrl = formData.get('repo-url');
        const targetType = formData.get('target-type');
        const outputFormat = formData.get('output-format');
        const verbose = formData.get('verbose') === 'on';
        const emoji = formData.get('emoji') === 'on';
        const unsorted = formData.get('unsorted') === 'on';
        // No need for token - server uses GITHUB_TOKEN from environment

        if (!this.validateGitHubUrl(targetUrl, targetType)) {
            const errorMsg = targetType === 'organization' 
                ? 'Please enter a valid GitHub organization URL' 
                : 'Please enter a valid GitHub repository URL';
            this.showError(errorMsg);
            return;
        }

        this.setLoadingState(true);
        this.hideError();
        this.hideResults();
        this.showProgress(targetType);

        try {
            const result = await this.analyzeTarget({
                targetUrl,
                targetType,
                outputFormat,
                verbose,
                emoji,
                unsorted
            });
            
            this.hideProgress();
            this.showResults(result, outputFormat);
        } catch (error) {
            this.hideProgress();
            this.showError(error.message || 'An error occurred while analyzing the target');
        } finally {
            this.setLoadingState(false);
        }
    }

    validateGitHubUrl(url, targetType) {
        if (targetType === 'organization') {
            // Pattern for organization: https://github.com/org-name
            const orgPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/?$/;
            return orgPattern.test(url);
        } else {
            // Pattern for repository: https://github.com/owner/repo
            const repoPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
            return repoPattern.test(url);
        }
    }

    async analyzeTarget(options) {
        const { targetUrl, targetType, outputFormat, verbose, emoji, unsorted } = options;
        
        // Normalize the URL for organization (remove trailing slash, convert to lowercase)
        let normalizedUrl = targetUrl;
        if (targetType === 'organization') {
            normalizedUrl = targetUrl.toLowerCase().replace(/\/$/, '');
        }

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repository_url: normalizedUrl,
                target_type: targetType,
                output_format: outputFormat,
                verbose: verbose,
                emoji: emoji,
                unsorted: unsorted
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }

        return await response.json();
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.btnText.style.display = 'none';
            this.loader.style.display = 'block';
        } else {
            this.submitBtn.disabled = false;
            this.btnText.style.display = 'block';
            this.loader.style.display = 'none';
        }
    }

    showResults(data, format) {
        this.hideError();
        
        let formattedOutput = '';
        
        if (format === 'MARKDOWN') {
            formattedOutput = this.formatMarkdownOutput(data.output);
        } else {
            formattedOutput = `<pre>${this.escapeHtml(data.output)}</pre>`;
        }
        
        this.resultsContent.innerHTML = formattedOutput;
        this.resultsSection.style.display = 'block';
        this.resultsSection.classList.add('fade-in');
        
        this.resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    formatMarkdownOutput(output) {
        if (!output) return 'No output received';
        
        const lines = output.split('\n');
        let formattedHtml = '';
        let inCodeBlock = false;
        
        for (const line of lines) {
            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    formattedHtml += '</pre>\n';
                    inCodeBlock = false;
                } else {
                    formattedHtml += '<pre><code>';
                    inCodeBlock = true;
                }
                continue;
            }
            
            if (inCodeBlock) {
                formattedHtml += this.escapeHtml(line) + '\n';
                continue;
            }
            
            if (line.startsWith('# ')) {
                formattedHtml += `<h1>${this.escapeHtml(line.substring(2))}</h1>\n`;
            } else if (line.startsWith('## ')) {
                formattedHtml += `<h2>${this.escapeHtml(line.substring(3))}</h2>\n`;
            } else if (line.startsWith('### ')) {
                formattedHtml += `<h3>${this.escapeHtml(line.substring(4))}</h3>\n`;
            } else if (line.startsWith('**') && line.endsWith('**')) {
                const content = line.slice(2, -2);
                formattedHtml += `<p><strong>${this.escapeHtml(content)}</strong></p>\n`;
            } else if (line.trim()) {
                // Handle links
                let processedLine = line;
                processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
                formattedHtml += `<p>${processedLine}</p>\n`;
            } else {
                formattedHtml += '<br>\n';
            }
        }
        
        if (inCodeBlock) {
            formattedHtml += '</code></pre>\n';
        }
        
        return formattedHtml;
    }

    showProgress(targetType) {
        const isOrg = targetType === 'organization';
        const message = isOrg 
            ? 'Analyzing organization repositories...' 
            : 'Analyzing repository...';
        
        this.progressText.textContent = message;
        this.progressSection.style.display = 'block';
        this.progressSection.classList.add('fade-in');
        
        // Simulate progress for real analysis
        this.simulateProgress(isOrg);
    }

    simulateProgress(isOrganization) {
        const duration = isOrganization ? 120000 : 30000; // 2 minutes for org, 30 seconds for repo
        const interval = 1000;
        const totalSteps = duration / interval;
        let currentStep = 0;
        
        this.progressInterval = setInterval(() => {
            currentStep++;
            const progress = (currentStep / totalSteps) * 100;
            this.progressBar.style.width = `${progress}%`;
            
            // Update progress message
            if (progress < 25) {
                this.progressText.textContent = 'Fetching repository data...';
            } else if (progress < 50) {
                this.progressText.textContent = 'Analyzing SLIM best practices...';
            } else if (progress < 75) {
                this.progressText.textContent = 'Processing compliance checks...';
            } else if (progress < 95) {
                this.progressText.textContent = 'Generating report...';
            } else {
                this.progressText.textContent = 'Finalizing analysis...';
            }
            
            if (currentStep >= totalSteps) {
                clearInterval(this.progressInterval);
                this.progressText.textContent = 'Analysis complete!';
                this.progressBar.style.width = '100%';
            }
        }, interval);
    }

    hideProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        this.progressSection.style.display = 'none';
        this.progressBar.style.width = '0%';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorSection.style.display = 'block';
        this.hideResults();
        
        this.errorSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    hideResults() {
        this.resultsSection.style.display = 'none';
    }

    clearResults() {
        this.hideResults();
        this.hideError();
        this.hideProgress();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SlimLeaderboardApp();
});