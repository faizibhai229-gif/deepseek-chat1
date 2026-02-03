import os
import json
import requests
from flask import Flask, render_template, request, jsonify
from github import Github, GithubException

app = Flask(__name__)

# Load environment variables
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek/deepseek-r1",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        ai_response = response.json()['choices'][0]['message']['content']
        return jsonify({"response": ai_response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/github-push', methods=['POST'])
def github_push():
    data = request.get_json()
    code_content = data.get('code_content')
    repo_name = data.get('repo_name')
    
    if not code_content or not repo_name:
        return jsonify({"error": "Missing code_content or repo_name"}), 400
    
    try:
        g = Github(GITHUB_TOKEN)
        user = g.get_user()
        
        # Check if repo exists
        try:
            repo = user.get_repo(repo_name)
        except GithubException:
            repo = user.create_repo(repo_name, private=False)
        
        # Determine file extension
        file_ext = ".py" if "python" in code_content.lower() else ".txt"
        file_name = f"main{file_ext}"
        
        # Create or update file
        try:
            contents = repo.get_contents(file_name)
            repo.update_file(contents.path, "Update from DeepSeek", code_content, contents.sha)
        except GithubException:
            repo.create_file(file_name, "Initial commit from DeepSeek", code_content)
        
        repo_url = f"https://github.com/{user.login}/{repo_name}"
        return jsonify({"url": repo_url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)