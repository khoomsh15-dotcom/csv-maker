const express = require('express');
const { Telegraf } = require('telegraf');

// 1. WEB SERVER (Render Alive Rakhne Ke Liye)
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('<h1>🤖 CSV BOT: FIXED & READY</h1>'));
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

// 2. BOT SETUP
const bot = new Telegraf(process.env.BOT_TOKEN);

// MEMORY STORAGE
let leadStorage = {};

// --- SECTION 1: COMMANDS (YE PEHLE AAYENGE) ---

// Command: Check Status
bot.command('check', (ctx) => {
    return ctx.reply("🟢 Bot Zinda Hai! Leads forward karo.");
});

// Command: Clear Memory
bot.command('clear', (ctx) => {
    const userId = ctx.from.id;
    leadStorage[userId] = [];
    return ctx.reply("🗑️ Bag saaf kar diya.");
});

// Command: Export CSV (Main Kaam)
bot.command('export', async (ctx) => {
    const userId = ctx.from.id;
    console.log(`📤 Export requested by ${userId}`);

    // Check Memory
    if (!leadStorage[userId] || leadStorage[userId].length === 0) {
        return ctx.reply("📭 Bag khali hai! Pehle kuch leads forward karo.");
    }

    try {
        await ctx.reply("⚙️ Converting to CSV...");

        const leads = leadStorage[userId];

        // --- MANUAL CSV CREATION (Crash Proof) ---
        // Header
        let csvContent = "Name,Email,Phone,City,Zip,Rating\n";

        // Rows
        leads.forEach(lead => {
            // Data Sanitization (Commas hatana taaki CSV na tute)
            const clean = (text) => text ? String(text).replace(/,/g, ' ') : "N/A";
            
            const row = [
                clean(lead.name),
                clean(lead.email),
                clean(lead.phone),
                clean(lead.city),
                clean(lead.zip),
                clean(lead.rating)
            ].join(",");
            
            csvContent += row + "\n";
        });
        // -----------------------------------------

        // Send File
        await ctx.replyWithDocument({
            source: Buffer.from(csvContent, 'utf-8'),
            filename: `HQ_Leads_${Date.now()}.csv`
        }, { caption: `🚀 Ye lo bhai, ${leads.length} leads ready hain!` });

        // Clear Memory
        leadStorage[userId] = []; 
        await ctx.reply("🧹 Memory cleared for next batch.");

    } catch (e) {
        console.error("Export Failed:", e);
        await ctx.reply(`🚨 Error: ${e.message}`);
    }
});

// --- SECTION 2: TEXT HANDLER (YE LAST MEIN AAYEGA) ---
// Sirf tab chalega jab upar wala koi Command match nahi hoga

bot.on('text', async (ctx) => {
    // Agar galti se koi command yahan aa jaye, toh ignore karo
    if (ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text;
    const userId = ctx.from.id;

    // Storage Init
    if (!leadStorage[userId]) leadStorage[userId] = [];

    // DATA EXTRACTION (Loose Regex)
    const emailMatch = text.match(/(?:Email|📧).*?:\s*(.+)/i);
    const nameMatch = text.match(/(?:Name|🏢).*?:\s*(.+)/i);
    const phoneMatch = text.match(/(?:Phone|📞).*?:\s*(.+)/i);
    const cityMatch = text.match(/(?:City|📍).*?:\s*(.+)/i);
    const ratingMatch = text.match(/(?:Rating|⭐).*?:\s*(.+)/i);

    if (emailMatch && emailMatch[1]) {
        const rawCity = cityMatch ? cityMatch[1].trim() : "N/A";
        // City se Zip nikalna
        const zip = rawCity.match(/\d{5}/)?.[0] || "N/A";
        const city = rawCity.split('(')[0].trim();

        leadStorage[userId].push({
            name: nameMatch ? nameMatch[1].trim() : "N/A",
            email: emailMatch[1].trim(),
            phone: phoneMatch ? phoneMatch[1].trim() : "N/A",
            city: city,
            zip: zip,
            rating: ratingMatch ? ratingMatch[1].trim() : "N/A"
        });

        await ctx.reply(`✅ Added! (Bag: ${leadStorage[userId].length})`);
    } else {
        // Agar bina kaam ka message hai toh kuch mat bolo (Silent)
        // Ya debug ke liye: await ctx.reply("⚠️ No Email Found");
    }
});

// Handling Errors
bot.catch((err) => {
    console.log("Bot Error:", err);
});

// 3. LAUNCH
bot.launch();
console.log("🤖 CSV Bot Started...");

// Graceful Stop (Render Restart ke liye safe)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
