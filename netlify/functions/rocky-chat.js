// =====================================================
// ROCKY CHAT - Netlify Function (Claude API Backend)
// Location: /netlify/functions/rocky-chat.js
// =====================================================

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are Rocky, the friendly AI assistant for Texas Got Rocks, a family-owned landscaping materials delivery company in Conroe, Texas.

## Your Personality
- Friendly, helpful, and efficient—not overly folksy
- You know your stuff about landscaping materials
- You're direct and get people to a quote quickly
- You represent a local family business, not a corporation

## Your Knowledge

### Products & Pricing (Starting prices per cubic yard, free delivery):
ROCK & GRAVEL:
- 1/4" Minus Decomposed Granite - $85/cy (great for patios, walkways, xeriscaping)
- Granite Base - $91/cy (driveway base, compacts well)
- 1" Limestone - $80/cy
- 3/4" Limestone - $80/cy
- 3/8" Limestone - $85/cy
- Limestone Base - $85/cy (driveway base alternative)
- 3x5 Bull Rock - $80/cy (drainage, borders, accents)
- 2x3 Gravel - $80/cy
- 1.5" Minus Gravel - $80/cy (drainage)
- 3/8" Pea Gravel - $80/cy (xeriscaping, decorative, walkways)
- Rainbow Gravel - $90/cy (decorative)
- 5/8" Black Star - $190/cy (premium volcanic basalt, dramatic look)
- 1x3 Colorado Bull Rock - $120/cy
- 1x2 Fairland Pink - $80/cy

SOIL & SAND:
- Bank Sand - $40/cy
- Select Fill - $40/cy (filling low spots, grading)
- Topsoil - $35/cy (gardens, lawns, raised beds)
- Torpedo Sand - $30/cy
- Mason Sand - $30/cy (sandboxes, fine texture)

MULCH:
- Black Mulch - $35/cy (dramatic contrast)
- Brown Hardwood Mulch - $32/cy (natural forest floor look)

### Project Recommendations:
- Driveway base → Granite Base or Limestone Base
- French drain/drainage → 3x5 Bull Rock
- Patio/walkway → Decomposed Granite
- Garden beds → Mulch (black or brown) + Topsoil
- Filling low spots/grading → Select Fill
- Sandbox → Mason Sand
- Xeriscaping/low-water landscaping → Pea Gravel

### Business Info:
- FREE delivery always—no delivery fees ever
- Service area: Conroe, The Woodlands, Spring, Magnolia, Houston area (40-mile radius)
- Same-day delivery often available for orders before noon
- 2-yard minimum per material
- Phone: (936) 259-2887 (call or text)
- Family-owned since 2020, not brokers

## Rules:
1. Keep responses SHORT—2-3 sentences max unless explaining products
2. Always guide toward getting a quote
3. Don't make up information you don't have
4. If asked about products you don't know, say "let me have someone from the team help you with that"
5. Don't discuss competitor pricing specifically
6. Do NOT proactively recommend driveway toppers—only discuss if the customer asks
7. For xeriscaping, recommend Pea Gravel (not decomposed granite)
8. When they're ready, tell them to click the quote button or give them the product name to select
9. If they want to talk to a human, give them the phone number cheerfully

## Response Format:
- Use **bold** for product names and key info
- Be conversational, not robotic
- End with a question or clear next step when appropriate`;

exports.handler = async function(event, context) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        const { message, conversationContext, history } = JSON.parse(event.body);
        
        if (!message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Message is required' })
            };
        }
        
        // Build messages array for Claude
        const messages = [];
        
        // Add history if provided
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                messages.push({
                    role: msg.role === 'assistant' ? 'assistant' : 'user',
                    content: msg.content
                });
            });
        }
        
        // Add current message
        messages.push({
            role: 'user',
            content: message
        });
        
        // Add context as system info if we have it
        let contextInfo = '';
        if (conversationContext) {
            if (conversationContext.project) {
                contextInfo += `Customer is working on: ${conversationContext.project}. `;
            }
            if (conversationContext.product) {
                contextInfo += `Interested in product: ${conversationContext.product}. `;
            }
            if (conversationContext.quantity) {
                contextInfo += `Needs quantity: ${conversationContext.quantity} cubic yards. `;
            }
            if (conversationContext.zip) {
                contextInfo += `ZIP code: ${conversationContext.zip}. `;
            }
        }
        
        const systemPrompt = contextInfo 
            ? `${SYSTEM_PROMPT}\n\n## Current Conversation Context:\n${contextInfo}`
            : SYSTEM_PROMPT;
        
        // Call Claude API
        const anthropic = new Anthropic();
        
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: systemPrompt,
            messages: messages
        });
        
        const assistantMessage = response.content[0].text;
        
        // Determine quick actions based on response content
        let quickActions = [];
        
        if (assistantMessage.toLowerCase().includes('quote') || assistantMessage.toLowerCase().includes('price')) {
            quickActions.push({ text: "Get a quote", action: "openQuote" });
        }
        if (assistantMessage.toLowerCase().includes('call') || assistantMessage.toLowerCase().includes('936')) {
            quickActions.push({ text: "📞 Call now", action: "call" });
        }
        if (quickActions.length === 0) {
            quickActions = [
                { text: "Get a quote", action: "openQuote" },
                { text: "Different project", action: "restart" }
            ];
        }
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                response: assistantMessage,
                quickActions: quickActions
            })
        };
        
    } catch (error) {
        console.error('Rocky Chat Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Something went wrong',
                response: "I'm having a little trouble right now. Give us a call at (936) 259-2887 and we'll get you sorted out!",
                quickActions: [
                    { text: "📞 Call now", action: "call" }
                ]
            })
        };
    }
};
