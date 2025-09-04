from flask import Flask, request, jsonify, send_from_directory
import subprocess
import json
import os
import sys
import logging

app = Flask(__name__, static_folder='.')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    try:
        with open('/Users/kyun/Downloads/SLIM/slim-leaderboard-web/index.html', 'r') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error serving index.html: {e}")
        return f"Error loading page: {e}", 500

@app.route('/styles.css')
def styles():
    try:
        with open('/Users/kyun/Downloads/SLIM/slim-leaderboard-web/styles.css', 'r') as f:
            response = app.response_class(
                response=f.read(),
                status=200,
                mimetype='text/css'
            )
            return response
    except Exception as e:
        logger.error(f"Error serving styles.css: {e}")
        return f"Error loading CSS: {e}", 500

@app.route('/script.js')
def script():
    try:
        with open('/Users/kyun/Downloads/SLIM/slim-leaderboard-web/script.js', 'r') as f:
            response = app.response_class(
                response=f.read(),
                status=200,
                mimetype='application/javascript'
            )
            return response
    except Exception as e:
        logger.error(f"Error serving script.js: {e}")
        return f"Error loading JS: {e}", 500

@app.route('/api/analyze', methods=['POST'])
def analyze_repository():
    try:
        data = request.get_json()
        
        if not data or 'repository_url' not in data:
            return jsonify({'error': 'Repository URL is required'}), 400
        
        target_url = data['repository_url']
        target_type = data.get('target_type', 'repository')
        output_format = data.get('output_format', 'TABLE')
        verbose = data.get('verbose', False)
        emoji = data.get('emoji', False)
        unsorted = data.get('unsorted', False)
        
        if not os.getenv('GITHUB_TOKEN'):
            return jsonify({
                'error': 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.'
            }), 500
        
        # Add the local source to Python path
        sys.path.insert(0, '/Users/kyun/Downloads/SLIM/slim-leaderboard-web/slim-leaderboard/src')
        
        try:
            from jpl.slim.leaderboard import main as slim_main
            
            # Create a temporary config file
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                config = {
                    "targets": [
                        {
                            "type": target_type,
                            "name": target_url
                        }
                    ]
                }
                json.dump(config, f)
                config_path = f.name
            
            # Capture stdout to get the analysis result
            from io import StringIO
            import contextlib
            
            # Prepare command line arguments for the main function
            old_argv = sys.argv
            sys.argv = ['slim-leaderboard']
            sys.argv.extend(['--output_format', output_format])
            
            if verbose:
                sys.argv.append('--verbose')
            if emoji:
                sys.argv.append('--emoji')
            if unsorted:
                sys.argv.append('--unsorted')
            
            sys.argv.append(config_path)
            
            logger.info(f"Running analysis for {target_type}: {target_url} with args: {sys.argv}")
            
            # Capture the output
            captured_output = StringIO()
            try:
                with contextlib.redirect_stdout(captured_output):
                    slim_main()
                result_output = captured_output.getvalue()
                result_returncode = 0
            except SystemExit as e:
                result_output = captured_output.getvalue()
                result_returncode = e.code if e.code is not None else 0
            except Exception as e:
                result_output = f"Error: {str(e)}"
                result_returncode = 1
            finally:
                sys.argv = old_argv
                if os.path.exists(config_path):
                    os.unlink(config_path)
            
            # Create a mock result object
            class MockResult:
                def __init__(self, stdout, returncode):
                    self.stdout = stdout
                    self.stderr = ""
                    self.returncode = returncode
            
            result = MockResult(result_output, result_returncode)
            
        except ImportError as e:
            return jsonify({
                'error': f'Unable to import slim-leaderboard module: {str(e)}'
            }), 500
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or 'Unknown error occurred'
            logger.error(f"Command failed with return code {result.returncode}: {error_msg}")
            return jsonify({'error': f'Analysis failed: {error_msg}'}), 500
        
        output = result.stdout
        logger.info(f"Analysis completed successfully for {target_url}")
        
        return jsonify({
            'success': True,
            'output': output,
            'target_url': target_url,
            'target_type': target_type,
            'format': output_format
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Analysis timed out. Please try again.'}), 408
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'github_token_configured': bool(os.getenv('GITHUB_TOKEN'))
    })

if __name__ == '__main__':
    if not os.getenv('GITHUB_TOKEN'):
        print("Warning: GITHUB_TOKEN environment variable not set.")
        print("Please set it with your GitHub Personal Access Token to use the analysis feature.")
        print("Example: export GITHUB_TOKEN=your_token_here")
    
    port = int(os.getenv('PORT', 8081))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Starting SLIM Leaderboard Web Interface on port {port}")
    if os.getenv('PORT'):
        print(f"Running in production mode")
    else:
        print(f"Open your browser to http://localhost:{port}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)