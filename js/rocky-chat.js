// =====================================================
// ROCKY CHAT - Texas Got Rocks AI Assistant
// v3 - No static prices, uses main.js pricing logic
// =====================================================

const RockyChat = (function() {
    
    const CONFIG = {
        rockyImage: '/images/rocky-logo-transparent.png',
        apiEndpoint: '/.netlify/functions/rocky-chat',
        hintDelay: 30000,
        hintMessage: "Need help picking a material?"
    };
    
    // =====================================================
    // PRODUCT KNOWLEDGE (NO PRICES - prices come from calculator)
    // =====================================================
    const PRODUCT_KNOWLEDGE = {
        // Direct product lookups (for when user asks about specific product)
        productKeywords: {
            'topsoil': {
                productId: 'topsoil',
                response: "**Topsoil** is great for gardens, lawns, and raised beds. It's nutrient-rich and screened for easy spreading. Want me to get you an exact delivered price?"
            },
            'black mulch': {
                productId: 'mulch-black',
                response: "**Black Mulch** creates a dramatic contrast against your plants and helps retain moisture. How many yards are you thinking?"
            },
            'brown mulch': {
                productId: 'mulch-brown',
                response: "**Brown Hardwood Mulch** gives you that natural forest floor look—great for a traditional appearance. How much area are you covering?"
            },
            'decomposed granite': {
                productId: 'decomposed-granite',
                response: "**Decomposed Granite** is perfect for patios, walkways, and xeriscaping. It compacts into a firm, stable surface with a rustic Texas look."
            },
            'granite base': {
                productId: 'granite-base',
                response: "**Granite Base** is ideal for driveway foundations—compacts really well and provides excellent stability for vehicle traffic."
            },
            'limestone base': {
                productId: 'limestone-base',
                response: "**Limestone Base** is another great option for driveway bases. Compacts well and creates a solid foundation."
            },
            'limestone': {
                productId: 'limestone-1',
                response: "We've got several **Limestone** options—1\", 3/4\", and 3/8\" sizes plus base material. What's your project? I can recommend the right one."
            },
            'bull rock': {
                productId: 'bull-rock-3x5',
                response: "**3x5 Bull Rock** is perfect for drainage projects, borders, and accent areas. The larger stones let water flow through easily."
            },
            'pea gravel': {
                productId: 'pea-gravel',
                response: "**Pea Gravel** is great for xeriscaping, decorative areas, and walkways. Low maintenance and drains well."
            },
            'black star': {
                productId: 'blackstar',
                response: "**5/8\" Black Star** is our premium option—it's volcanic basalt with a stunning dark, elegant look. Really makes a statement!"
            },
            'blackstar': {
                productId: 'blackstar',
                response: "**5/8\" Black Star** is our premium option—volcanic basalt with a stunning dark look. Really makes a statement!"
            },
            'mason sand': {
                productId: 'mason-sand',
                response: "**Mason Sand** is clean and fine—perfect for sandboxes and masonry work. Safe for kids!"
            },
            'select fill': {
                productId: 'select-fill',
                response: "**Select Fill** is great for filling low spots and grading. Compacts well and easy to work with."
            },
            'fill dirt': {
                productId: 'select-fill',
                response: "For fill, **Select Fill** is what you want—great for leveling and grading projects."
            },
            'bank sand': {
                productId: 'bank-sand',
                response: "**Bank Sand** is useful for various fill and leveling projects."
            },
            'gravel': {
                productId: 'pea-gravel',
                response: "We've got several gravel options! **Pea Gravel** for decorative use, **Bull Rock** for drainage, or **Decomposed Granite** for paths. What's the project?"
            },
            'sand': {
                productId: 'mason-sand',
                response: "We carry **Mason Sand** (fine, great for sandboxes), **Bank Sand**, and **Torpedo Sand**. What do you need it for?"
            },
            'mulch': {
                productId: 'mulch-black',
                response: "We've got **Black Mulch** for a bold look or **Brown Hardwood Mulch** for a natural appearance. Which color do you prefer?"
            }
        },
        
        // Project-based recommendations
        projectMappings: {
            'driveway': {
                products: ['granite-base', 'limestone-base'],
                response: "For a solid driveway, I'd recommend **Granite Base** or **Limestone Base**—both compact really well. Are you building a new base or topping an existing one?"
            },
            'french drain': {
                products: ['bull-rock-3x5'],
                response: "For French drains, **3x5 Bull Rock** is your best bet—the larger stones allow water to flow through easily."
            },
            'drainage': {
                products: ['bull-rock-3x5', 'gravel-1.5-minus'],
                response: "For drainage, I'd go with **3x5 Bull Rock**—lets water flow through nicely. How big is the drainage area?"
            },
            'patio': {
                products: ['decomposed-granite'],
                response: "**Decomposed Granite** is perfect for patios—compacts into a firm, stable surface with that natural rustic look."
            },
            'walkway': {
                products: ['decomposed-granite', 'pea-gravel'],
                response: "For walkways, **Decomposed Granite** gives you a firm, natural path. **Pea Gravel** is also popular for a more decorative look. Which style do you prefer?"
            },
            'path': {
                products: ['decomposed-granite', 'pea-gravel'],
                response: "For paths, **Decomposed Granite** compacts firm, or **Pea Gravel** for a looser decorative look. What's your preference?"
            },
            'garden': {
                products: ['mulch-black', 'mulch-brown', 'topsoil'],
                response: "For garden beds, you'll want **Mulch** on top (black or brown, your choice) and **Topsoil** underneath if you're building up the beds. Mulch helps retain moisture and suppress weeds."
            },
            'flower bed': {
                products: ['mulch-black', 'mulch-brown', 'topsoil'],
                response: "Flower beds look great with **Black** or **Brown Mulch**. Need topsoil underneath too, or just refreshing the mulch?"
            },
            'raised bed': {
                products: ['topsoil'],
                response: "For raised beds, **Topsoil** is what you need—nutrient-rich and perfect for planting. How many beds are you filling?"
            },
            'fill': {
                products: ['select-fill'],
                response: "For filling in low spots, **Select Fill** is what you need—works great for leveling."
            },
            'grading': {
                products: ['select-fill'],
                response: "**Select Fill** is perfect for grading projects—compacts well and easy to work with."
            },
            'level': {
                products: ['select-fill'],
                response: "To level out an area, **Select Fill** is your go-to. How big is the area you're working with?"
            },
            'low spot': {
                products: ['select-fill', 'topsoil'],
                response: "For filling low spots, **Select Fill** is your best bet—compacts well and levels out perfectly. **Topsoil** works too if you're planning to plant or seed over it."
            },
            'sandbox': {
                products: ['mason-sand'],
                response: "For a sandbox, **Mason Sand** is perfect—clean, fine, and safe for kids!"
            },
            'xeriscaping': {
                products: ['pea-gravel', 'decomposed-granite'],
                response: "For xeriscaping, **Pea Gravel** or **Decomposed Granite** are great choices—look clean, drain well, zero maintenance."
            },
            'landscaping': {
                products: ['decomposed-granite', 'pea-gravel', 'mulch-black'],
                response: "For landscaping, it depends on the area—**Decomposed Granite** for paths, **Pea Gravel** for accents, or **Mulch** around plants. What specifically are you working on?"
            },
            'yard': {
                products: ['topsoil', 'mulch-black'],
                response: "What are you doing in the yard? Planting (topsoil), mulching beds, building a path, or something else?"
            }
        },
        
        // Product database (for lookups only, not prices)
        products: {
            'decomposed-granite': { name: '1/4" Minus Decomposed Granite', weight: 1.4 },
            'granite-base': { name: 'Granite Base', weight: 1.4 },
            'limestone-1': { name: '1" Limestone', weight: 1.4 },
            'limestone-3/4': { name: '3/4" Limestone', weight: 1.4 },
            'limestone-3/8': { name: '3/8" Limestone', weight: 1.4 },
            'limestone-base': { name: 'Limestone Base', weight: 1.4 },
            'bull-rock-3x5': { name: '3x5 Bull Rock', weight: 1.4 },
            'gravel-2x3': { name: '2x3 Gravel', weight: 1.4 },
            'gravel-1.5-minus': { name: '1.5" Minus Gravel', weight: 1.4 },
            'pea-gravel': { name: '3/8" Pea Gravel', weight: 1.4 },
            'rainbow-gravel': { name: 'Rainbow Gravel', weight: 1.4 },
            'blackstar': { name: '5/8" Black Star', weight: 1.4 },
            'colorado-bull-rock': { name: '1x3 Colorado Bull Rock', weight: 1.4 },
            'fairland-pink': { name: '1x2 Fairland Pink', weight: 1.4 },
            'bank-sand': { name: 'Bank Sand', weight: 1.4 },
            'select-fill': { name: 'Select Fill', weight: 1.4 },
            'topsoil': { name: 'Topsoil', weight: 1.4 },
            'torpedo-sand': { name: 'Torpedo Sand', weight: 1.4 },
            'mason-sand': { name: 'Mason Sand', weight: 1.4 },
            'mulch-black': { name: 'Black Mulch', weight: 0.5 },
            'mulch-brown': { name: 'Brown Hardwood Mulch', weight: 0.5 }
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
        showInitialGreeting();
    }
    
    function showInitialGreeting() {
        setTimeout(() => {
            addRockyMessage(
                "Hey! I'm Rocky. I can help you pick the right material and get you an exact delivered price in about 60 seconds. What's your project?",
                getInitialQuickActions(),
                null
            );
        }, 500);
    }
    
    function getInitialQuickActions() {
        return [
            { text: "Driveway", action: "driveway" },
            { text: "Patio/Walkway", action: "patio" },
            { text: "Garden beds", action: "garden" },
            { text: "Drainage", action: "drainage" },
            { text: "Something else", action: "other" }
        ];
    }
    
    // =====================================================
    // ACTION HANDLING
    // =====================================================
    function executeAction(actionId) {
        switch(actionId) {
            case 'driveway':
                simulateUserMessage("I need material for a driveway");
                break;
            case 'patio':
                simulateUserMessage("I'm working on a patio");
                break;
            case 'garden':
                simulateUserMessage("I need mulch for garden beds");
                break;
            case 'drainage':
                simulateUserMessage("I have a drainage project");
                break;
            case 'other':
                simulateUserMessage("I have a different project");
                break;
            case 'getQuote':
                if (state.conversationContext.product) {
                    openQuoteWithProduct(state.conversationContext.product);
                } else {
                    openQuoteModal();
                }
                break;
            case 'differentProject':
                state.conversationContext.product = null;
                state.conversationContext.project = null;
                simulateUserMessage("I have a different project");
                break;
            case 'call':
                window.location.href = 'tel:9362592887';
                break;
            case 'text':
                window.location.href = 'sms:9362592887';
                break;
            case 'openQuoteModal':
                openQuoteModal();
                break;
            default:
                if (actionId.startsWith('quote_')) {
                    const productId = actionId.replace('quote_', '');
                    openQuoteWithProduct(productId);
                }
                break;
        }
    }
    
    function simulateUserMessage(message) {
        addUserMessage(message);
        handleUserMessage(message);
    }
    
    // =====================================================
    // CREATE DOM ELEMENTS
    // =====================================================
    function createChatElements() {
        const bubble = document.createElement('div');
        bubble.className = 'rocky-chat-bubble has-notification';
        bubble.id = 'rockyChatBubble';
        bubble.innerHTML = `<img src="${CONFIG.rockyImage}" alt="Rocky">`;
        bubble.onclick = toggleChat;
        document.body.appendChild(bubble);
        
        const hint = document.createElement('div');
        hint.className = 'rocky-chat-hint';
        hint.id = 'rockyChatHint';
        hint.textContent = CONFIG.hintMessage;
        document.body.appendChild(hint);
        
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
                <button class="rocky-inline-trigger-btn">💬 Chat with Rocky</button>
            `;
            callbackBox.replaceWith(inlineTrigger);
        }
    }
    
    // =====================================================
    // EVENT LISTENERS
    // =====================================================
    function attachEventListeners() {
        document.getElementById('rockyChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.isOpen) {
                closeChat();
            }
        });
        
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
        state.isOpen ? closeChat() : openChat();
    }
    
    function openChat() {
        state.isOpen = true;
        document.getElementById('rockyChatWindow').classList.add('open');
        document.getElementById('rockyChatBubble').classList.remove('has-notification');
        hideHint();
        setTimeout(() => {
            document.getElementById('rockyChatInput').focus();
        }, 300);
    }
    
    function closeChat() {
        state.isOpen = false;
        document.getElementById('rockyChatWindow').classList.remove('open');
        resetConversation();
    }
    
    function resetConversation() {
        state.messages = [];
        state.conversationContext = { project: null, product: null, quantity: null, zip: null };
        
        const messagesContainer = document.getElementById('rockyChatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        showInitialGreeting();
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
        setTimeout(hideHint, 8000);
    }
    
    function hideHint() {
        const hint = document.getElementById('rockyChatHint');
        if (hint) hint.classList.remove('show');
    }
    
    // =====================================================
    // MESSAGE HANDLING
    // =====================================================
    function sendMessage() {
        const input = document.getElementById('rockyChatInput');
        const message = input.value.trim();
        if (!message) return;
        input.value = '';
        addUserMessage(message);
        handleUserMessage(message);
    }
    
    function handleUserMessage(message) {
        showTyping();
        const localResponse = processLocally(message);
        
        if (localResponse) {
            setTimeout(() => {
                hideTyping();
                addRockyMessage(localResponse.text, localResponse.quickActions, localResponse.productCard);
            }, 800 + Math.random() * 500);
        } else {
            callRockyAPI(message);
        }
    }
    
    function processLocally(message) {
        const lowerMessage = message.toLowerCase();
        
        // FIRST: Check for specific product mentions (highest priority)
        for (const [keyword, data] of Object.entries(PRODUCT_KNOWLEDGE.productKeywords)) {
            if (lowerMessage.includes(keyword)) {
                state.conversationContext.product = data.productId;
                
                return {
                    text: data.response,
                    quickActions: [
                        { text: "Different product", action: "differentProject" }
                    ],
                    productCard: data.productId
                };
            }
        }
        
        // SECOND: Check for pricing questions
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
            // If they mention a product name in the price question, find it
            for (const [keyword, data] of Object.entries(PRODUCT_KNOWLEDGE.productKeywords)) {
                if (lowerMessage.includes(keyword)) {
                    state.conversationContext.product = data.productId;
                    return {
                        text: `Great choice! The exact price for **${PRODUCT_KNOWLEDGE.products[data.productId].name}** depends on quantity and your delivery location. Let me get you an exact quote—it only takes a sec.`,
                        quickActions: [
                            { text: "Different product", action: "differentProject" }
                        ],
                        productCard: data.productId
                    };
                }
            }
            
            // Generic price question without product
            if (!state.conversationContext.product) {
                return {
                    text: "Pricing depends on the material, quantity, and your location. What are you working on? I can recommend the right product and get you an exact delivered price.",
                    quickActions: getInitialQuickActions(),
                    productCard: null
                };
            }
            
            // Price question with product already in context
            const product = PRODUCT_KNOWLEDGE.products[state.conversationContext.product];
            return {
                text: `The exact price for **${product.name}** depends on quantity and delivery distance. Let me get you a real quote with your ZIP code.`,
                quickActions: [
                    { text: "Different product", action: "differentProject" }
                ],
                productCard: state.conversationContext.product
            };
        }
        
        // THIRD: Check for project keywords
        for (const [project, data] of Object.entries(PRODUCT_KNOWLEDGE.projectMappings)) {
            if (lowerMessage.includes(project)) {
                state.conversationContext.project = project;
                state.conversationContext.product = data.products[0];
                
                return {
                    text: data.response,
                    quickActions: [
                        { text: "Different project", action: "differentProject" }
                    ],
                    productCard: data.products[0]
                };
            }
        }
        
        // Check for quantity mentions
        const quantityMatch = message.match(/(\d+)\s*(yard|cubic yard|cy|ton)/i);
        if (quantityMatch && state.conversationContext.product) {
            state.conversationContext.quantity = parseInt(quantityMatch[1]);
            const productName = PRODUCT_KNOWLEDGE.products[state.conversationContext.product]?.name || 'that';
            return {
                text: `Got it—${quantityMatch[1]} ${quantityMatch[2]}s of ${productName}. What's your ZIP code so I can get you an exact delivered price?`,
                quickActions: [],
                productCard: null
            };
        }
        
        // Check for ZIP code
        const zipMatch = message.match(/\b(\d{5})\b/);
        if (zipMatch) {
            state.conversationContext.zip = zipMatch[1];
            // Use the main.js ZIP_DATA if available
            if (typeof ZIP_DATA !== 'undefined' && ZIP_DATA[zipMatch[1]]) {
                return {
                    text: `Great, we deliver to ${ZIP_DATA[zipMatch[1]].city}! Click below to get your exact delivered price with all costs included.`,
                    quickActions: [
                        { text: "Get exact price", action: "getQuote" }
                    ],
                    productCard: null
                };
            } else if (typeof ZIP_DATA !== 'undefined') {
                return {
                    text: `Hmm, ${zipMatch[1]} might be outside our usual area. Give us a call at (936) 259-2887 and we'll see what we can do!`,
                    quickActions: [
                        { text: "📞 Call now", action: "call" },
                        { text: "Try different ZIP", action: "other" }
                    ],
                    productCard: null
                };
            }
        }
        
        // Help/confused
        if (lowerMessage.includes("don't know") || lowerMessage.includes("not sure") || lowerMessage.includes("help") || lowerMessage.includes("confused")) {
            return {
                text: "No problem! Tell me about your project and I'll recommend the right material. Driveway, patio, garden beds, or something else?",
                quickActions: getInitialQuickActions(),
                productCard: null
            };
        }
        
        // Different/other
        if (lowerMessage.includes("different") || lowerMessage.includes("something else") || lowerMessage.includes("other")) {
            state.conversationContext.product = null;
            state.conversationContext.project = null;
            return {
                text: "No problem! What are you working on—driveway, landscaping, drainage, patio, filling in low spots? I've seen it all.",
                quickActions: [],
                productCard: null
            };
        }
        
        // Human handoff
        if (lowerMessage.includes("talk to") || lowerMessage.includes("real person") || lowerMessage.includes("call") || lowerMessage.includes("phone")) {
            return {
                text: "Absolutely! Give us a call or text at (936) 259-2887. We're real people here in Conroe—not a call center.",
                quickActions: [
                    { text: "📞 Call now", action: "call" },
                    { text: "💬 Text instead", action: "text" }
                ],
                productCard: null
            };
        }
        
        // Delivery questions
        if (lowerMessage.includes("deliver") || lowerMessage.includes("delivery")) {
            return {
                text: "Delivery is **always FREE**—that's our promise. We cover Conroe, The Woodlands, Spring, and most of the Greater Houston area. What's your ZIP code?",
                quickActions: [],
                productCard: null
            };
        }
        
        // Default: didn't understand, use API
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
                    history: state.messages.slice(-6)
                })
            });
            
            if (!response.ok) throw new Error('API error');
            
            const data = await response.json();
            hideTyping();
            addRockyMessage(
                data.response || "I'm not quite sure about that one. What project are you working on?",
                [
                    { text: "Start over", action: "differentProject" },
                    { text: "📞 Call us", action: "call" }
                ],
                null
            );
            
        } catch (error) {
            console.error('Rocky API error:', error);
            hideTyping();
            addRockyMessage(
                "Tell me more about what you're working on—I want to recommend the right material for you.",
                getInitialQuickActions(),
                null
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
        
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        let html = `
            <div class="rocky-message-avatar">
                <img src="${CONFIG.rockyImage}" alt="Rocky">
            </div>
            <div class="rocky-message-content">
                ${formattedText}
        `;
        
        // Add product card if specified (includes its own quote button)
        if (productId && PRODUCT_KNOWLEDGE.products[productId]) {
            const product = PRODUCT_KNOWLEDGE.products[productId];
            html += `
                <div class="rocky-product-card">
                    <div class="rocky-product-card-header">
                        <span class="rocky-product-card-name">${product.name}</span>
                    </div>
                    <div class="rocky-product-card-desc">Free delivery included • 2 yard minimum</div>
                    <button class="rocky-product-card-btn" onclick="RockyChat.executeAction('quote_${productId}')">
                        Get Exact Quote →
                    </button>
                </div>
            `;
        }
        
        // Add quick actions ONLY if no product card (to avoid redundant quote buttons)
        if (quickActions && quickActions.length > 0 && !productId) {
            html += `<div class="rocky-quick-actions">`;
            quickActions.forEach((qa) => {
                html += `<button class="rocky-quick-btn" onclick="RockyChat.executeAction('${qa.action}')">${qa.text}</button>`;
            });
            html += `</div>`;
        }
        
        // If product card exists, only show non-quote quick actions
        if (quickActions && quickActions.length > 0 && productId) {
            const nonQuoteActions = quickActions.filter(qa => 
                !qa.action.includes('quote') && !qa.action.includes('Quote')
            );
            if (nonQuoteActions.length > 0) {
                html += `<div class="rocky-quick-actions">`;
                nonQuoteActions.forEach((qa) => {
                    html += `<button class="rocky-quick-btn" onclick="RockyChat.executeAction('${qa.action}')">${qa.text}</button>`;
                });
                html += `</div>`;
            }
        }
        
        html += `</div>`;
        messageEl.innerHTML = html;
        messagesContainer.appendChild(messageEl);
        scrollToBottom();
    }
    
    function showTyping() {
        state.isTyping = true;
        const messagesContainer = document.getElementById('rockyChatMessages');
        
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
    // QUOTE MODAL INTEGRATION
    // =====================================================
    function openQuoteModal() {
        closeChat();
        if (typeof openCalculatorModal === 'function') {
            openCalculatorModal();
        }
    }
    
    function openQuoteWithProduct(productId) {
        closeChat();
        
        if (typeof openCalculatorModal === 'function') {
            openCalculatorModal();
        }
        
        setTimeout(() => {
            const productSelect = document.getElementById('quoteProduct');
            if (productSelect) {
                productSelect.value = productId;
                productSelect.dispatchEvent(new Event('change'));
            }
            
            if (state.conversationContext.quantity) {
                const quantityInput = document.getElementById('quoteQuantity');
                if (quantityInput) {
                    quantityInput.value = state.conversationContext.quantity;
                    quantityInput.dispatchEvent(new Event('input'));
                }
            }
            
            if (state.conversationContext.zip) {
                const zipInput = document.getElementById('quoteZipCode');
                if (zipInput) {
                    zipInput.value = state.conversationContext.zip;
                    zipInput.dispatchEvent(new Event('input'));
                }
            }
            
            if (typeof recalculateQuote === 'function') {
                recalculateQuote();
            }
        }, 300);
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
        executeAction: executeAction
    };
    
})();

document.addEventListener('DOMContentLoaded', function() {
    RockyChat.init();
});
