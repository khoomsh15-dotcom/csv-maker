const express = require('express');
const { Telegraf } = require('telegraf');
const { stringify } = require('csv-stringify/sync');

// 1. WEB SERVER (Render Health Check ke liye)
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('<h1>📂 EXODUS CSV BUILDER: ONLINE</h1>'));
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

// 2. BOT SETUP
// Render Environment Variables mein 'BOT_TOKEN' daalna
const bot = new Telegraf(process.env.BOT_TOKEN);

// TEMPORARY STORAGE (RAM)
let leadStorage = {}; // Chat ID ke hisab se data store karega

// 3. LOGIC: JAB TU MESSAGE FORWARD KAREGA
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;

    // Initialize storage for user if not exists
    if (!leadStorage[userId]) leadStorage[userId] = [];

    // DATA EXTRACTION (Regex Magic)
    // Ye tere "Lead Bot" ke format ko padhne ke liye hai
    const isLeadMsg = text.includes('Email:') || text.includes('GOD-TIER');
    
    if (isLeadMsg) {
        try {
            // Data nikalna (Icons aur text hatake)
            // Format match: "📧 Email: something@gmail.com"
            const name = text.match(/Name:\s*(.+)/i)?.[1]?.trim() || "N/A";
            const email = text.match(/Email:\s*(.+)/i)?.[1]?.trim() || "N/A";
            const phone = text.match(/Phone:\s*(.+)/i)?.[1]?.trim() || "N/A";
            
            // City aur Zip alag karna
            const cityFull = text.match(/City:\s*(.+)/i)?.[1]?.trim() || "N/A";
            const city = cityFull.split('(')[0].trim();
            const zip = cityFull.match(/Zip:\s*(\d+|N\/A)/i)?.[1] || "N/A";
            
            const rating = text.match(/Rating:\s*(.+)/i)?.[1]?.trim() || "N/A";

            // Save to Memory
            leadStorage[userId].push({
                email: email, // 'email' header verification tool ke liye zaroori hai
                name: name,
                phone: phone,
                city: city,
                zip: zip,
                rating: rating,
                source: "Exodus Hunter"
            });

            // Confirmation (Chupchap save karega, spam nahi karega)
            // Agar spam hatana hai toh niche wali line hata dena
            await ctx.reply(`✅ Saved. Total: ${leadStorage[userId].length} (Send /export to finish)`);

        } catch (e) {
            console.log("Parsing Error", e);
        }
    } else {
        // Agar normal message hai (Commands chhod ke)
        if (!text.startsWith('/')) {
            ctx.reply("❌ Bhai, ye Lead format nahi hai. Sahi message forward kar.");
        }
    }
});

// 4. COMMAND: CSV GENERATE KARO
bot.command('export', async (ctx) => {
    const userId = ctx.from.id;
    const leads = leadStorage[userId];

    if (!leads || leads.length === 0) {
        return ctx.reply("📭 Bag khali hai! Pehle kuch leads forward karo.");
    }

    try {
        ctx.reply("⚙️ Generating HQ CSV...");

        // Convert JSON to CSV
        const csvData = stringify(leads, { header: true });
        
        // Send File
        const fileName = `HQ_Leads_${Date.now()}.csv`;
        await ctx.replyWithDocument({
            source: Buffer.from(csvData),
            filename: fileName
        }, { caption: `🚀 Ye lo bhai, ${leads.length} leads ready hain verification ke liye.` });

        // Memory Clear (Taaki agla batch mix na ho)
        leadStorage[userId] = []; 
        
    } catch (e) {
        ctx.reply(`🚨 Error: ${e.message}`);
    }
});

// COMMAND: MANUAL CLEAR
bot.command('clear', (ctx) => {
    const userId = ctx.from.id;
    leadStorage[userId] = [];
    ctx.reply("🗑️ Memory saaf kar di.");
});

// START
bot.launch();
console.log("🤖 CSV Builder Bot Started");

// Graceful Stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
