const express = require('express');
const { Telegraf } = require('telegraf');

// 1. WEB SERVER
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('<h1>🤖 EXODUS CSV MAKER: READY</h1>'));
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

// 2. BOT SETUP
const bot = new Telegraf(process.env.BOT_TOKEN);

// MEMORY STORE
let leadStorage = {};

// 3. LOGIC: Message Receive
bot.on('text', async (ctx) => {
    // Ignore commands
    if (ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text;
    const userId = ctx.from.id;

    if (!leadStorage[userId]) leadStorage[userId] = [];

    // DATA EXTRACTION
    // Loose Regex jo thoda messy data bhi utha lega
    const emailMatch = text.match(/(?:Email|📧).*?:\s*(.+)/i);
    const nameMatch = text.match(/(?:Name|🏢).*?:\s*(.+)/i);
    const phoneMatch = text.match(/(?:Phone|📞).*?:\s*(.+)/i);
    const cityMatch = text.match(/(?:City|📍).*?:\s*(.+)/i);
    const ratingMatch = text.match(/(?:Rating|⭐).*?:\s*(.+)/i);

    if (emailMatch && emailMatch[1]) {
        const rawCity = cityMatch ? cityMatch[1].trim() : "N/A";
        const cityParts = rawCity.split('(');
        const city = cityParts[0].trim();
        const zip = rawCity.match(/Zip:\s*(\d+)/i)?.[1] || "N/A";

        leadStorage[userId].push({
            name: nameMatch ? nameMatch[1].trim() : "N/A",
            email: emailMatch[1].trim(),
            phone: phoneMatch ? phoneMatch[1].trim() : "N/A",
            city: city,
            zip: zip,
            rating: ratingMatch ? ratingMatch[1].trim() : "N/A"
        });

        // Confirmation reply
        await ctx.reply(`✅ Added! (Bag: ${leadStorage[userId].length})`);
    } else {
        await ctx.reply("⚠️ Email nahi mila. Format check karo.");
    }
});

// 4. COMMAND: EXPORT (DESI STYLE - NO CRASH)
bot.command('export', async (ctx) => {
    const userId = ctx.from.id;
    console.log(`📤 Export requested by ${userId}`);

    // Check Memory
    if (!leadStorage[userId] || leadStorage[userId].length === 0) {
        return ctx.reply("📭 Bag khali hai! Bot restart hua hoga ya tumne kuch add nahi kiya.");
    }

    try {
        await ctx.reply("⚙️ Converting to CSV...");

        const leads = leadStorage[userId];

        // --- MANUAL CSV CREATION (100% Crash Proof) ---
        // Header Row
        let csvContent = "Name,Email,Phone,City,Zip,Rating\n";

        // Data Rows
        leads.forEach(lead => {
            // Comma se bachne ke liye quotes lagaye (Sanitization)
            const row = [
                `"${lead.name}"`,
                `"${lead.email}"`,
                `"${lead.phone}"`,
                `"${lead.city}"`,
                `"${lead.zip}"`,
                `"${lead.rating}"`
            ].join(","); // Join with commas
            
            csvContent += row + "\n"; // Add new line
        });
        // ----------------------------------------------

        // Send File
        await ctx.replyWithDocument({
            source: Buffer.from(csvContent, 'utf-8'),
            filename: `HQ_Leads_${Date.now()}.csv`
        }, { caption: `🚀 Ye lo bhai, ${leads.length} leads ready hain!` });

        // Clear Memory after sending
        leadStorage[userId] = []; 
        await ctx.reply("🧹 Memory cleared for next batch.");

    } catch (e) {
        console.error("Export Failed:", e);
        await ctx.reply(`🚨 Error aa gaya: ${e.message}`);
    }
});

// COMMAND: CHECK
bot.command('check', (ctx) => ctx.reply("🟢 System Online. Forward karo!"));

// ERROR HANDLING
bot.catch((err) => {
    console.log("Bot Error:", err);
});

bot.launch();
