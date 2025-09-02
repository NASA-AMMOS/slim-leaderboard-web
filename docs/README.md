# SLIM Leaderboard Web Interface

A professional web interface for analyzing GitHub repositories using the SLIM Best Practices Leaderboard tool.

🌐 **Live Demo:** https://nasa-ammos.github.io/slim-leaderboard-web/

## Features

- **Professional black and white design**
- **Organization & repository analysis**
- **Multiple output formats** (Table, Tree, Markdown, Plain)
- **Progress tracking** with visual indicators
- **Responsive design** for desktop and mobile
- **GitHub Pages compatible** - no server required

## Local Development

For the full-featured version with real-time analysis:

1. Clone this repository:
   ```bash
   git clone https://github.com/NASA-AMMOS/slim-leaderboard-web.git
   cd slim-leaderboard-web
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set your GitHub token:
   ```bash
   export GITHUB_TOKEN=your_github_token_here
   ```

4. Run the web application:
   ```bash
   python app.py
   ```

5. Open your browser to `http://localhost:8081`

## About SLIM

SLIM (Software Lifecycle Improvement & Modernization) provides best practices for NASA AMMOS software development. This tool analyzes repositories for compliance with these practices.

Learn more: https://nasa-ammos.github.io/slim/