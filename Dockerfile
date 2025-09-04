FROM python:3.11-slim

WORKDIR /app

# Install git for submodules
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . .

# Initialize and update git submodules
RUN git submodule update --init --recursive

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN cd slim-leaderboard && pip install --no-cache-dir -e .

# Expose port
EXPOSE 8081

# Set environment variables
ENV PORT=8081
ENV FLASK_ENV=production

# Run the application
CMD ["python", "app.py"]