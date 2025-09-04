#!/bin/bash

# Production runner script for SLIM Leaderboard Web Interface
# This script uses the repository's GITHUB_TOKEN for API access

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Warning: GITHUB_TOKEN not set. The app will require users to provide their own tokens."
    echo "To use the repository's token, set it as an environment variable:"
    echo "  export GITHUB_TOKEN=your_github_token_here"
fi

# Install dependencies if needed
if [ ! -d "slim-leaderboard/src" ]; then
    echo "Initializing submodules..."
    git submodule update --init --recursive
fi

# Install slim-leaderboard if not already installed
if ! python -c "import jpl.slim.leaderboard" 2>/dev/null; then
    echo "Installing slim-leaderboard..."
    cd slim-leaderboard && pip install -e . && cd ..
fi

# Install Flask dependencies
pip install -r requirements.txt

# Start the Flask application
echo "Starting SLIM Leaderboard Web Interface..."
echo "Using GITHUB_TOKEN from environment for API access"
echo "Access the application at http://localhost:8081"

# Run with production settings
export FLASK_ENV=production
export PORT=8081
python app.py