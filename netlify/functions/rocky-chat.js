// netlify/functions/rocky-chat.js
// Rocky AI Backend - No hardcoded prices, directs to quote calculator

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

const ROCKY_SYSTEM_PROMPT = `You are Rocky, the friendly AI assistant for Texas Got Rocks, a family-owned landscaping materials delivery company in Conroe, Texas.

CRITICAL RULES:
1. NEVER quote specific prices - prices depend on quantity, delivery location, and current rates
2. When asked about prices, say something like "The exact price depends on how much you need and where you're located. I can get you an exact quote in about 30 seconds if you'd like!"
3. Always recommend getting an exact quote through our calculator
4. Keep responses SHORT - 2-3 sentences max
5. Be friendly, casual, and helpful - you're a local Texan, not a corporate bot
6. Always mention FREE delivery when relevant

PRODUCTS WE CARRY (never quote prices):
- Rock & Gravel: Decomposed Granite, Granite Base, Limestone (various sizes), Bull Rock, Pea Gravel, Black Star, Rainbow Gravel
- Soil & Sand: Topsoil, Select Fill, Bank Sand, Mason Sand, Torpedo Sand
- Mulch: Black Mulch, Brown Hardwood Mulch

PROJECT RECOMMENDATIONS:
- Driveways: Granite Base or Limestone Base
- Patios/Walkways: Decomposed Granite or Pea Gravel
- Garden beds: Mulch (black or brown) + Topsoil if building up
- Drainage/French drains: 3x5 Bull Rock
- Filling low spots/grading: Select Fill
- Sandboxes: Mason Sand

ABOUT US:
- Family-owned in Conroe, TX - not brokers, not a call center
- FREE delivery always - that's our promise
- 2 yard minimum per material
- Service area: Conroe, The Woodlands, Spring, Houston area
- Phone: (936) 259-2887

If someone asks something you're unsure about, suggest they call or text us.`;

exports.handler = async (event) => {
    // Handle CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { message, context, history } = JSON.parse(event.body);

        // Build conversation messages
        const messages = [];
        
        // Add history if provided
        if (history && history.length > 0) {
            history.forEach(msg => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        // Add context to the user message if available
        let contextNote = '';
        if (context) {
            if (context.product) contextNote += `\n[Context: User is interested in ${context.product}]`;
            if (context.project) contextNote += `\n[Context: Project type is ${context.project}]`;
            if (context.zip) contextNote += `\n[Context: ZIP code is ${context.zip}]`;
        }

        if (contextNote) {
            messages[messages.length - 1].content += contextNote;
        }

        const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: ROCKY_SYSTEM_PROMPT,
            messages: messages
        });

        const rockyResponse = response.content[0].text;

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response: rockyResponse,
                context: context
            })
        };

    } catch (error) {
        console.error('Rocky API Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                response: "I'm having a little trouble right now. Give us a call at (936) 259-2887 and we'll help you out!",
                error: error.message
            })
        };
    }
};
