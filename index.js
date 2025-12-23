const express = require('express');
const { Telegraf } = require('telegraf');
const { stringify } = require('csv-stringify/sync');

// 1. WEB SERVER
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('<h1>🤖 CSV BOT: DEBUG MODE ONLINE</h1>'));
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));

// 2. BOT SETUP
const bot = new Telegraf(process.env.BOT_TOKEN);

// MEMORY
let leadStorage = {}; 

// LOGIC: DATA COLLECTION
bot.on('text', async (ctx) => {
    // 1. Check: Kya ye command hai? (/export) Agar haan, toh ignore karo yahan
    if (ctx.message.text.startsWith('/')) return;

    const text = ctx.message.text;
    const userId = ctx.from.id;

    if (!leadStorage[userId]) leadStorage[userId] = [];

    // DEBUG LOG: Render console mein dikhega
    console.log(`📩 Message received from ${userId}: ${text.substring(0, 20)}...`);

    try {
        // LOOSE REGEX (Icons, Stars, sab handle karega)
        // Ye dhoondhta hai "Email:" ke baad kya likha hai, chahe icon ho ya na ho
        const emailMatch = text.match(/(?:Email|📧).*?:\s*(.+)/i);
        const nameMatch = text.match(/(?:Name|🏢).*?:\s*(.+)/i);
        const phoneMatch = text.match(/(?:Phone|📞).*?:\s*(.+)/i);
        const cityMatch = text.match(/(?:City|📍).*?:\s*(.+)/i);
        const ratingMatch = text.match(/(?:Rating|⭐).*?:\s*(.+)/i);

        // Agar Email mila, tabhi save karo
        if (emailMatch && emailMatch[1]) {
            const rawCity = cityMatch ? cityMatch[1].trim() : "N/A";
            
            leadStorage[userId].push({
                email: emailMatch[1].trim(),
                name: nameMatch ? nameMatch[1].trim() : "N/A",
                phone: phoneMatch ? phoneMatch[1].trim() : "N/A",
                city: rawCity.split('(')[0].trim(), // Zip code alag kar diya
                rating: ratingMatch ? ratingMatch[1].trim() : "N/A"
            });

            await ctx.reply(`✅ Added! (Bag: ${leadStorage[userId].length})`);
        } else {
            // Agar format match nahi hua
            await ctx.reply("⚠️ Format samajh nahi aaya. Kya ye sahi Lead Message hai?");
            console.log("❌ Regex failed on:", text);
        }

    } catch (e) {
        console.error("Parsing Error:", e);
        await ctx.reply(`❌ Parsing Error: ${e.message}`);
    }
});

// COMMAND: EXPORT
bot.command('export', async (ctx) => {
    const userId = ctx.from.id;
    console.log(`📤 Export command received from ${userId}`);

    // SAFETY CHECK 1: Memory check
    if (!leadStorage[userId] || leadStorage[userId].length === 0) {
        return ctx.reply("📭 Bag khali hai! Ya toh bot restart hua hai, ya tumne kuch save nahi kiya.");
    }

    try {
        await ctx.reply("⚙️ CSV bana raha hoon, 1 second...");

        const leads = leadStorage[userId];
        
        // SAFETY CHECK 2: CSV Generation
        const csvData = stringify(leads, { header: true });
        
        // SAFETY CHECK 3: Sending File
        await ctx.replyWithDocument({
            source: Buffer.from(csvData),
            filename: `Exodus_Leads_${Date.now()}.csv`
        }, { caption: `🚀 Ye lo bhai, ${leads.length} leads ready hain!` });

        // Memory Clear
        leadStorage[userId] = []; 
        
    } catch (e) {
        console.error("Export Error:", e);
        await ctx.reply(`🚨 Export Error: ${e.message}`);
    }
});

// COMMAND: DEBUG CHECK
bot.command('check', (ctx) => {
    ctx.reply("🟢 Bot Zinda Hai! Mujhe forward karo.");
});

// HANDLING CRASHES
bot.catch((err, ctx) => {
    console.log(`Ooops, encountered an error for ${ctx.updateType}`, err);
    ctx.reply("🔥 Critical Error aa gaya internal system mein.");
});

bot.launch();
console.log("🤖 Debug Bot Started...");
