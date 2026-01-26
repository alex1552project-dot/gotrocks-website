// =====================================================
// ROCKY CHAT - Texas Got Rocks AI Assistant
// Integrates with existing quote modal and pricing logic
// =====================================================

const RockyChat = (function() {
    
    // =====================================================
    // CONFIGURATION
    // =====================================================
    const CONFIG = {
        rockyImage: '/images/rocky-logo-transparent.png',
        apiEndpoint: '/.netlify/functions/rocky-chat', // Your Netlify function
        hintDelay: 30000, // Show hint after 30 seconds
        hintMessage: "Need help picking a material?"
    };
    
    // =====================================================
    // PRODUCT KNOWLEDGE - Rocky's brain
    // =====================================================
    const PRODUCT_KNOWLEDGE = {
        // Project to product mappings
        projectMappings: {
            'driveway base': {
                products: ['granite-base', 'limestone-base'],
                response: "For a solid driveway base, I'd recommend **Granite Base** or **Limestone Base**. Both compact well and provide excellent stability for vehicle traffic. Granite Base is $91/cy and Limestone Base is $85/cy."
            },
            'french drain': {
                products: ['bull-rock-3x5'],
                response: "For French drains and drainage, **3x5 Bull Rock** is your best bet. The larger stones allow water to flow through easily. It's $80/cy with free delivery."
            },
            'drainage': {
                products: ['bull-rock-3x5', 'gravel-1.5-minus'],
                response: "For drainage projects, I'd go with **3x5 Bull Rock** for the main drainage area—it lets water flow through nicely. If you need something smaller, **1.5\" Minus Gravel** also works well."
            },
            'patio': {
                products: ['decomposed-granite'],
                response: "**Decomposed Granite** is perfect for patios. It compacts into a firm, stable surface with a natural rustic look. Great for that Texas Hill Country vibe. $85/cy delivered free."
            },
            'walkway': {
                products: ['decomposed-granite', 'pea-gravel'],
                response: "For walkways, **Decomposed Granite** gives you a firm, natural path that compacts well. If you want something a bit more decorative, **Pea Gravel** is also popular. Both look great!"
            },
            'garden': {
                products: ['mulch-black', 'mulch-brown', 'topsoil'],
                response: "For garden beds, you'll want **Mulch** on top (black or brown, your choice) and **Topsoil** underneath if you're building up the beds. Mulch helps retain moisture and suppress weeds."
            },
            'flower bed': {
                products: ['mulch-black', 'mulch-brown', 'topsoil'],
                response: "Flower beds look great with **Black Mulch** or **Brown Mulch**—the black creates a dramatic contrast, brown gives a more natural forest floor look. Both are $32-35/cy. Need topsoil underneath?"
            },
            'fill': {
                products: ['select-fill'],
                response: "For filling in low spots or grading, **Select Fill** is what you need. It's $40/cy and works great for leveling out your yard before landscaping."
            },
            'grading': {
                products: ['select-fill'],
                response: "**Select Fill** is perfect for grading projects. It compacts well and is easy to work with. $40/cy delivered free to your location."
            },
            'sandbox': {
                products: ['mason-sand'],
                response: "For a sandbox, you want **Mason Sand**—it's clean, fine, and safe for kids. $30/cy and we'll deliver it right to your driveway."
            },
            'xeriscaping': {
                products: ['pea-gravel'],
                response: "For xeriscaping and low-water landscaping, **Pea Gravel** is a great choice. It looks clean, drains well, and requires zero maintenance. $80/cy with free delivery."
            },
            'landscaping': {
                products: ['decomposed-granite', 'pea-gravel', 'mulch-black'],
                response: "For general landscaping, it depends on the look you're going for. **Decomposed Granite** for paths and beds, **Pea Gravel** for accent areas, or **Mulch** around plants. What's the specific area you're working on?"
            }
        },
        
        // Product details
        products: {
            'decomposed-granite': { name: '1/4" Minus Decomposed Granite', price: 85, unit: 'cy' },
            'granite-base': { name: 'Granite Base', price: 91, unit: 'cy' },
            'limestone-1': { name: '1" Limestone', price: 80, unit: 'cy' },
            'limestone-3/4': { name: '3/4" Limestone', price: 80, unit: 'cy' },
            'limestone-3/8': { name: '3/8" Limestone', price: 85, unit: 'cy' },
            'limestone-base': { name: 'Limestone Base', price: 85, unit: 'cy' },
            'bull-rock-3x5': { name: '3x5 Bull Rock', price: 80, unit: 'cy' },
            'gravel-2x3': { name: '2x3 Gravel', price: 80, unit: 'cy' },
            'gravel-1.5-minus': { name: '1.5" Minus Gravel', price: 80, unit: 'cy' },
            'pea-gravel': { name: '3/8" Pea Gravel', price: 80, unit: 'cy' },
            'rainbow-gravel': { name: 'Rainbow Gravel', price: 90, unit: 'cy' },
            'blackstar': { name: '5/8" Black Star', price: 190, unit: 'cy' },
            'colorado-bull-rock': { name: '1x3 Colorado Bull Rock', price: 120, unit: 'cy' },
            'fairland-pink': { name: '1x2 Fairland Pink', price: 80, unit: 'cy' },
            'bank-sand': { name: 'Bank Sand', price: 40, unit: 'cy' },
            'select-fill': { name: 'Select Fill', price: 40, unit: 'cy' },
            'topsoil': { name: 'Topsoil', price: 35, unit: 'cy' },
            'torpedo-sand': { name: 'Torpedo Sand', price: 30, unit: 'cy' },
            'mason-sand': { name: 'Mason Sand', price: 30, unit: 'cy' },
            'mulch-black': { name: 'Black Mulch', price: 35, unit: 'cy' },
            'mulch-brown': { name: 'Brown Hardwood Mulch', price: 32, unit: 'cy' }
        }
    };
    
    // =====================================================
    // STATE
    // =====================================================
    let state = {
        isOpen: false,
        messages: [],
        isTyping: false,
        conversationContext: {
            project: null,
            product: null,
            quantity: null,
            zip: null
        },
        hintShown: false
    };
    
    // =====================================================
    // INITIALIZATION
    // =====================================================
    function init() {
        createChatElements();
        attachEventListeners();
        scheduleHint();
        
        // Add initial Rocky greeting after a brief delay
        setTimeout(() => {
            addRockyMessage(
                "Hey! I'm Rocky. I can help you pick the right material and get you a delivered price in about 60 seconds. What's your project?",
                getInitialQuickActions()
            );
        }, 500);
    }
    
    function getInitialQuickActions() {
        return [
            { text: "Driveway", action: () => handleUserMessage("I need material for a driveway") },
            { text: "Patio/Walkway", action: () => handleUserMessage("I'm working on a patio") },
            { text: "Garden beds", action: () => handleUserMessage("I need mulch for garden beds") },
            { text: "Drainage", action: () => handleUserMessage("I have a drainage project") },
            { text: "Something else", action: () => handleUserMessage("I have a different project") }
        ];
    }
    
    // =====================================================
    // CREATE DOM ELEMENTS
    // =====================================================
    function createChatElements() {
        // Create chat bubble
        const bubble = document.createElement('div');
        bubble.className = 'rocky-chat-bubble has-notification';
        bubble.id = 'rockyChatBubble';
        bubble.innerHTML = `<img src="${CONFIG.rockyImage}" alt="Rocky">`;
        bubble.onclick = toggleChat;
        document.body.appendChild(bubble);
        
        // Create hint tooltip
        const hint = document.createElement('div');
        hint.className = 'rocky-chat-hint';
        hint.id = 'rockyChatHint';
        hint.textContent = CONFIG.hintMessage;
        document.body.appendChild(hint);
        
        // Create chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'rocky-chat-window';
        chatWindow.id = 'rockyChatWindow';
        chatWindow.innerHTML = `
            <div class="rocky-chat-header">
                <div class="rocky-chat-header-avatar">
                    <img src="${CONFIG.rockyImage}" alt="Rocky">
                </div>
                <div class="rocky-chat-header-info">
                    <h3 class="rocky-chat-header-name">Rocky</h3>
                    <div class="rocky-chat-header-status">Online now</div>
                </div>
                <button class="rocky-chat-close" onclick="RockyChat.close()">&times;</button>
            </div>
            <div class="rocky-chat-messages" id="rockyChatMessages"></div>
            <div class="rocky-chat-input-area">
                <input type="text" class="rocky-chat-input" id="rockyChatInput" placeholder="Type your message..." />
                <button class="rocky-chat-send" id="rockyChatSend" onclick="RockyChat.sendMessage()">➤</button>
            </div>
        `;
        document.body.appendChild(chatWindow);
        
        // Replace callback box with inline trigger
        replaceCallbackBox();
    }
    
    function replaceCallbackBox() {
        const callbackBox = document.querySelector('.callback-box');
        if (callbackBox) {
            const inlineTrigger = document.createElement('div');
            inlineTrigger.className = 'rocky-inline-trigger';
            inlineTrigger.onclick = () => { openChat(); };
            inlineTrigger.innerHTML = `
                <div class="rocky-inline-trigger-avatar">
                    <img src="${CONFIG.rockyImage}" alt="Rocky">
                </div>
                <h4>Need help picking a material?</h4>
                <p>Chat with Rocky—he knows his stuff</p>
                <button class="rocky-inline-trigger-btn">
                    💬 Chat with Rocky
                </button>
            `;
            callbackBox.replaceWith(inlineTrigger);
        }
    }
    
    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    function attachEventListeners() {
        // Enter key to send
        document.getElementById('rockyChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                closeChat();
            }
        });
        
        // Hide hint when clicking anywhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#rockyChatHint') && !e.target.closest('#rockyChatBubble')) {
                hideHint();
            }
        });
    }
    
    // =====================================================
    // CHAT WINDOW CONTROLS
    // =====================================================
    function toggleChat() {
        if (state.isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }
    
    function openChat() {
        state.isOpen = true;
        document.getElementById('rockyChatWindow').classList.add('open');
        document.getElementById('rockyChatBubble').classList.remove('has-notification');
        hideHint();
        
        // Focus input
        setTimeout(() => {
            document.getElementById('rockyChatInput').focus();
        }, 300);
    }
    
    function closeChat() {
        state.isOpen = false;
        document.getElementById('rockyChatWindow').classList.remove('open');
    }
    
    // =====================================================
    // HINT SYSTEM
    // =====================================================
    function scheduleHint() {
        setTimeout(() => {
            if (!state.isOpen && !state.hintShown) {
                showHint();
            }
        }, CONFIG.hintDelay);
    }
    
    function showHint() {
        state.hintShown = true;
        document.getElementById('rockyChatHint').classList.add('show');
        
        // Auto-hide after 8 seconds
        setTimeout(hideHint, 8000);
    }
    
    function hideHint() {
        document.getElementById('rockyChatHint').classList.remove('show');
    }
    
    // =====================================================
    // MESSAGE HANDLING
    // =====================================================
    function sendMessage() {
        const input = document.getElementById('rockyChatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Clear input
        input.value = '';
        
        // Add user message
        addUserMessage(message);
        
        // Process and respond
        handleUserMessage(message);
    }
    
    function handleUserMessage(message) {
        // Show typing indicator
        showTyping();
        
        // Process locally first for speed
        const localResponse = processLocally(message);
        
        if (localResponse) {
            setTimeout(() => {
                hideTyping();
                addRockyMessage(localResponse.text, localResponse.quickActions, localResponse.productCard);
            }, 800 + Math.random() * 500);
        } else {
            // Fall back to API for complex queries
            callRockyAPI(message);
        }
    }
    
    function processLocally(message) {
        const lowerMessage = message.toLowerCase();
        
        // Check for project keywords
        for (const [project, data] of Object.entries(PRODUCT_KNOWLEDGE.projectMappings)) {
            if (lowerMessage.includes(project)) {
                state.conversationContext.project = project;
                state.conversationContext.product = data.products[0];
                
                return {
                    text: data.response,
                    quickActions: [
                        { text: "Get a quote", action: () => openQuoteWithProduct(data.products[0]) },
                        { text: "Tell me more", action: () => handleUserMessage(`Tell me more about ${PRODUCT_KNOWLEDGE.products[data.products[0]].name}`) },
                        { text: "Different project", action: () => handleUserMessage("I have a different project") }
                    ],
                    productCard: data.products[0]
                };
            }
        }
        
        // Check for quantity mentions
        const quantityMatch = message.match(/(\d+)\s*(yard|cubic yard|cy|ton)/i);
        if (quantityMatch && state.conversationContext.product) {
            state.conversationContext.quantity = parseInt(quantityMatch[1]);
            return {
                text: `Got it—${quantityMatch[1]} ${quantityMatch[2]}s of ${PRODUCT_KNOWLEDGE.products[state.conversationContext.product].name}. What's your ZIP code so I can get you an exact delivered price?`,
                quickActions: []
            };
        }
        
        // Check for ZIP code
        const zipMatch = message.match(/\b(\d{5})\b/);
        if (zipMatch) {
            state.conversationContext.zip = zipMatch[1];
            // Check if ZIP is in service area (using existing ZIP_DATA if available)
            if (typeof ZIP_DATA !== 'undefined' && ZIP_DATA[zipMatch[1]]) {
                return {
                    text: `Great, we deliver to ${ZIP_DATA[zipMatch[1]].city}! Let me pull up the quote calculator with your selections...`,
                    quickActions: [
                        { text: "Open quote", action: () => openQuoteWithContext() }
                    ]
                };
            } else if (typeof ZIP_DATA !== 'undefined') {
                return {
                    text: `Hmm, ${zipMatch[1]} might be outside our usual delivery area. Give us a call at (936) 259-2887 and we'll see what we can do for you.`,
                    quickActions: [
                        { text: "📞 Call now", action: () => window.location.href = 'tel:9362592887' },
                        { text: "Try different ZIP", action: () => handleUserMessage("Let me try a different ZIP code") }
                    ]
                };
            }
        }
        
        // Check for pricing questions
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
            if (state.conversationContext.product) {
                const product = PRODUCT_KNOWLEDGE.products[state.conversationContext.product];
                return {
                    text: `${product.name} starts at $${product.price} per cubic yard. The final delivered price depends on your location and quantity. Want me to get you an exact quote?`,
                    quickActions: [
                        { text: "Get exact quote", action: () => openQuoteWithProduct(state.conversationContext.product) },
                        { text: "See all products", action: () => handleUserMessage("Show me all your products") }
                    ]
                };
            } else {
                return {
                    text: "Pricing depends on the material and your location. What project are you working on? I can recommend the right material and get you a delivered price.",
                    quickActions: getInitialQuickActions()
                };
            }
        }
        
        // Check for help/confused
        if (lowerMessage.includes("don't know") || lowerMessage.includes("not sure") || lowerMessage.includes("help") || lowerMessage.includes("confused")) {
            return {
                text: "No problem—that's what I'm here for! Tell me about your project and I'll recommend the right material. Are you working on a driveway, patio, garden beds, or something else?",
                quickActions: getInitialQuickActions()
            };
        }
        
        // Check for "different project" or "something else"
        if (lowerMessage.includes("different") || lowerMessage.includes("something else") || lowerMessage.includes("other")) {
            return {
                text: "No problem! Tell me what you're working on—driveway, landscaping, drainage, building a patio, filling in low spots? I've seen it all.",
                quickActions: []
            };
        }
        
        // Check for human handoff
        if (lowerMessage.includes("talk to") || lowerMessage.includes("real person") || lowerMessage.includes("call") || lowerMessage.includes("phone")) {
            return {
                text: "Absolutely! Give us a call or text at (936) 259-2887. We're real people here in Conroe—not a call center.",
                quickActions: [
                    { text: "📞 Call now", action: () => window.location.href = 'tel:9362592887' },
                    { text: "💬 Text instead", action: () => window.location.href = 'sms:9362592887' }
                ]
            };
        }
        
        // Check for delivery questions
        if (lowerMessage.includes("deliver") || lowerMessage.includes("delivery")) {
            return {
                text: "Delivery is **always FREE**—that's our promise. We cover Conroe, The Woodlands, Spring, Magnolia, and most of the Greater Houston area. Same-day delivery is often available for orders placed before noon. What's your ZIP code?",
                quickActions: []
            };
        }
        
        // Default: didn't understand, be helpful
        return null;
    }
    
    async function callRockyAPI(message) {
        try {
            const response = await fetch(CONFIG.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    context: state.conversationContext,
                    history: state.messages.slice(-6) // Last 6 messages for context
                })
            });
            
            if (!response.ok) throw new Error('API error');
            
            const data = await response.json();
            
            hideTyping();
            addRockyMessage(
                data.response || "I'm not quite sure about that one. Want to tell me more about your project, or give us a call at (936) 259-2887?",
                data.quickActions || [
                    { text: "Start over", action: () => handleUserMessage("I want to start over") },
                    { text: "📞 Call us", action: () => window.location.href = 'tel:9362592887' }
                ]
            );
            
        } catch (error) {
            console.error('Rocky API error:', error);
            hideTyping();
            
            // Graceful fallback
            addRockyMessage(
                "Tell me a bit more about what you're working on—I want to make sure I recommend the right material for your project.",
                getInitialQuickActions()
            );
        }
    }
    
    // =====================================================
    // UI UPDATES
    // =====================================================
    function addUserMessage(text) {
        state.messages.push({ role: 'user', content: text });
        
        const messagesContainer = document.getElementById('rockyChatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = 'rocky-message from-user';
        messageEl.innerHTML = `
            <div class="rocky-message-avatar">Y</div>
            <div class="rocky-message-content">${escapeHtml(text)}</div>
        `;
        messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }
    
    function addRockyMessage(text, quickActions = [], productId = null) {
        state.messages.push({ role: 'assistant', content: text });
        
        const messagesContainer = document.getElementById('rockyChatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = 'rocky-message from-rocky';
        
        // Convert markdown-style bold to HTML
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        let html = `
            <div class="rocky-message-avatar">
                <img src="${CONFIG.rockyImage}" alt="Rocky">
            </div>
            <div class="rocky-message-content">
                ${formattedText}
        `;
        
        // Add product card if specified
        if (productId && PRODUCT_KNOWLEDGE.products[productId]) {
            const product = PRODUCT_KNOWLEDGE.products[productId];
            html += `
                <div class="rocky-product-card">
                    <div class="rocky-product-card-header">
                        <span class="rocky-product-card-name">${product.name}</span>
                        <span class="rocky-product-card-price">$${product.price}/${product.unit}</span>
                    </div>
                    <div class="rocky-product-card-desc">Free delivery included</div>
                    <button class="rocky-product-card-btn" onclick="RockyChat.openQuoteWithProduct('${productId}')">
                        Get Exact Quote →
                    </button>
                </div>
            `;
        }
        
        // Add quick actions if specified
        if (quickActions && quickActions.length > 0) {
            html += `<div class="rocky-quick-actions">`;
            quickActions.forEach((action, index) => {
                html += `<button class="rocky-quick-btn" onclick="RockyChat.handleQuickAction(${index})">${action.text}</button>`;
            });
            html += `</div>`;
            
            // Store quick actions for later reference
            state.currentQuickActions = quickActions;
        }
        
        html += `</div>`;
        messageEl.innerHTML = html;
        messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }
    
    function showTyping() {
        state.isTyping = true;
        const messagesContainer = document.getElementById('rockyChatMessages');
        
        // Remove existing typing indicator if any
        const existingTyping = messagesContainer.querySelector('.rocky-typing-container');
        if (existingTyping) existingTyping.remove();
        
        const typingEl = document.createElement('div');
        typingEl.className = 'rocky-message from-rocky rocky-typing-container';
        typingEl.innerHTML = `
            <div class="rocky-message-avatar">
                <img src="${CONFIG.rockyImage}" alt="Rocky">
            </div>
            <div class="rocky-typing">
                <div class="rocky-typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingEl);
        scrollToBottom();
    }
    
    function hideTyping() {
        state.isTyping = false;
        const typingEl = document.querySelector('.rocky-typing-container');
        if (typingEl) typingEl.remove();
    }
    
    function scrollToBottom() {
        const messagesContainer = document.getElementById('rockyChatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // =====================================================
    // INTEGRATION WITH QUOTE MODAL
    // =====================================================
    function openQuoteWithProduct(productId) {
        closeChat();
        
        // Open the calculator modal
        if (typeof openCalculatorModal === 'function') {
            openCalculatorModal();
        }
        
        // Pre-fill the product after a brief delay
        setTimeout(() => {
            const productSelect = document.getElementById('quoteProduct');
            if (productSelect) {
                productSelect.value = productId;
                productSelect.dispatchEvent(new Event('change'));
            }
            
            // If we have quantity context, set that too
            if (state.conversationContext.quantity) {
                const quantityInput = document.getElementById('quoteQuantity');
                if (quantityInput) {
                    quantityInput.value = state.conversationContext.quantity;
                    quantityInput.dispatchEvent(new Event('input'));
                }
            }
            
            // If we have ZIP context, set that too
            if (state.conversationContext.zip) {
                const zipInput = document.getElementById('quoteZipCode');
                if (zipInput) {
                    zipInput.value = state.conversationContext.zip;
                    zipInput.dispatchEvent(new Event('input'));
                }
            }
            
            // Trigger recalculation
            if (typeof recalculateQuote === 'function') {
                recalculateQuote();
            }
        }, 300);
    }
    
    function openQuoteWithContext() {
        openQuoteWithProduct(state.conversationContext.product);
    }
    
    // =====================================================
    // QUICK ACTION HANDLER
    // =====================================================
    function handleQuickAction(index) {
        if (state.currentQuickActions && state.currentQuickActions[index]) {
            state.currentQuickActions[index].action();
        }
    }
    
    // =====================================================
    // PUBLIC API
    // =====================================================
    return {
        init: init,
        open: openChat,
        close: closeChat,
        toggle: toggleChat,
        sendMessage: sendMessage,
        openQuoteWithProduct: openQuoteWithProduct,
        handleQuickAction: handleQuickAction
    };
    
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    RockyChat.init();
});
