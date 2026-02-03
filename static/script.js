document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const modal = document.getElementById('github-modal');
    const closeBtn = document.querySelector('.close');
    const pushConfirm = document.getElementById('push-confirm');
    const repoNameInput = document.getElementById('repo-name');
    const pushStatus = document.getElementById('push-status');
    
    let currentCodeContent = '';
    let isProcessing = false;
    
    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
    });
    
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter (without Shift)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Push to GitHub
    pushConfirm.addEventListener('click', pushToGitHub);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message || isProcessing) return;
        
        // Add user message to chat
        addMessage(message, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Disable input while processing
        isProcessing = true;
        userInput.disabled = true;
        sendBtn.disabled = true;
        
        // Get chat history
        const messages = Array.from(chatContainer.querySelectorAll('.message')).map(msg => {
            return {
                role: msg.classList.contains('user-message') ? 'user' : 'assistant',
                content: msg.querySelector('.message-content').innerText
            };
        });
        
        // Send to server
        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            addMessage(data.response, 'bot');
        })
        .catch(error => {
            addMessage(`Error: ${error.message}`, 'bot');
        })
        .finally(() => {
            isProcessing = false;
            userInput.disabled = false;
            sendBtn.disabled = false;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        });
    }
    
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('message-header');
        headerDiv.innerHTML = sender === 'user' ? 
            '<i class="fas fa-user"></i> You' : 
            '<i class="fas fa-robot"></i> DeepSeek R1';
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = marked.parse(content);
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        
        // Process code blocks after rendering
        setTimeout(() => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
                
                // Get the language class
                const langClass = Array.from(block.classList).find(cls => cls.startsWith('language-'));
                const language = langClass ? langClass.replace('language-', '') : 'code';
                
                // Create code header
                const header = document.createElement('div');
                header.className = 'code-header';
                header.innerHTML = `
                    <span>${language}</span>
                    <div class="code-actions">
                        <button class="code-btn copy" title="Copy Code">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                        <button class="code-btn push" title="Push to GitHub">
                            <i class="fab fa-github"></i> Push
                        </button>
                    </div>
                `;
                
                // Insert header before the code block
                block.parentNode.insertBefore(header, block);
                
                // Add copy functionality
                header.querySelector('.copy').addEventListener('click', () => {
                    navigator.clipboard.writeText(block.textContent);
                    const copyBtn = header.querySelector('.copy');
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                    }, 2000);
                });
                
                // Add push to GitHub functionality
                header.querySelector('.push').addEventListener('click', () => {
                    currentCodeContent = block.textContent;
                    repoNameInput.value = '';
                    pushStatus.textContent = '';
                    modal.style.display = 'flex';
                });
            });
            
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 0);
    }
    
    function pushToGitHub() {
        const repoName = repoNameInput.value.trim();
        if (!repoName) {
            pushStatus.textContent = 'Please enter a repository name';
            pushStatus.style.color = 'var(--error)';
            return;
        }
        
        pushConfirm.disabled = true;
        pushStatus.textContent = 'Pushing to GitHub...';
        pushStatus.style.color = 'var(--text)';
        
        fetch('/api/github-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code_content: currentCodeContent,
                repo_name: repoName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            pushStatus.innerHTML = `Success! <a href="${data.url}" target="_blank">View Repository</a>`;
            pushStatus.style.color = 'var(--success)';
            
            // Close modal after 3 seconds
            setTimeout(() => {
                modal.style.display = 'none';
            }, 3000);
        })
        .catch(error => {
            pushStatus.textContent = `Error: ${error.message}`;
            pushStatus.style.color = 'var(--error)';
            pushConfirm.disabled = false;
        });
    }
    
    // Initial greeting
    setTimeout(() => {
        addMessage(
            "Hello! I'm DeepSeek R1, your AI coding assistant. How can I help you with programming today?",
            'bot'
        );
    }, 1000);
});