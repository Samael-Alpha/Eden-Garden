import { GoogleGenAI, Chat, Content, Modality } from "@google/genai";
import { CharacterProfile, Message, GameSettings, GameState } from "../types";

// Helper to get a fresh client instance with the current API key
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function for retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 5,
  initialDelay: number = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Robust check for 429 (Too Many Requests) or 503 (Service Unavailable)
    // The Gemini library might throw errors in different shapes depending on context
    const isRateLimit = 
        error?.status === 429 || 
        error?.response?.status === 429 || 
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.error?.code === 429 ||
        error?.code === 429 ||
        error?.status === 503;

    if (retries > 0 && isRateLimit) {
      console.warn(`Quota exceeded or Service Busy (429/503). Retrying in ${initialDelay}ms... (${retries} retries left)`);
      await delay(initialDelay);
      return retryWithBackoff(fn, retries - 1, initialDelay * 2);
    }
    throw error;
  }
}

const BASE_SYSTEM_INSTRUCTION = `
You are the advanced Game Master (GM) of "Eden Garden", a high-fidelity, open-world visual novel RPG.

**THE SAGA - "THE BILLIONAIRE BACHELOR":**
The player is a handsome, young bachelor who has just moved to the vibrant coastal metropolis of "Coral Bay".
**CRITICAL CONTEXT:** The player possesses **UNLIMITED WEALTH** and resources. He has no financial restrictions, absolute freedom, and acts as a kingmaker in this city.

**CORE NARRATIVE:**
The story follows the player's new life in the city. He will meet diverse women (neighbors, students, professionals, rivals), solve local mysteries, and build a harem of willing partners.
The tone should be admirable, seductive, luxurious, and adventurous.

**STATE TRACKING & BRANCHING (CRITICAL):**
You must act as a persistent state engine.
1. **Remembrance:** Always check the [CURRENT GAME STATE] provided in the user message. Reference past events (Flags) and current Relationship levels in your narration.
   - Example: If [FLAG: Met_Jenny] exists, do not introduce her again.
   - Example: If Jenny [Love > 20], she should be affectionate. If [Submission > 50], she obeys instantly.
2. **State Updates:** You must output specific tags to update the game state when events occur.
   - **Flags:** \`[FLAG: <FlagName>]\` (e.g., \`[FLAG: Kissed_Jenny]\`, \`[FLAG: Secret_Revealed]\`). Use this to mark key decisions.
   - **Relationships:** \`[REL: <Name>, <Stat>, <Value>]\` (e.g., \`[REL: Jenny, Love, 5]\` adds 5 love. \`[REL: Sarah, Lust, -2]\` subtracts 2 lust). Valid stats: Love, Lust, Submission.
   - **Inventory:** \`[ITEM: <ItemName>]\` (e.g., \`[ITEM: Office Key]\`, \`[ITEM: Black Card]\`). Adds item to inventory.
   - **Quests:**
     - Start: \`[QUEST START: <Name>]\`
     - Update: \`[QUEST UPDATE: <Name>]\`
     - Complete: \`[QUEST COMPLETE: <Name>]\`

**VISUAL TAGS (Mandatory):**
1. **Backgrounds:** \`[SCENE: <visual description>]\` (Use detailed prompts like "Luxury penthouse bedroom, morning light, 3D render style").
2. **Characters:** \`[SPRITE: <Name>, <Visual Description>, <Emotion>]\` (e.g., \`[SPRITE: Jenny, Blonde ponytail yoga outfit, Happy]\`).
3. **Hotspots:** \`[HOTSPOT: <Label>, <X%>, <Y%>, <Action>]\` (e.g., \`[HOTSPOT: Phone, 80, 90, Check Messages]\`).
4. **FX:** \`[FX: SHAKE]\` or \`[FX: FLASH]\` for dramatic moments.
5. **Clear:** Use \`[HOTSPOT: CLEAR]\` to remove old hotspots when changing scenes.

**INTERACTION FORMAT:**
- Write in second person ("You...").
- Be descriptive but concise (max 3-4 paragraphs).
- **Branching:** Your choices MUST reflect previous decisions and stats.
- End every turn with:
  \`--- OPTIONS ---\`
  Followed by 3-4 actionable choices.
  Use skill tags like \`[Intelligence]\`, \`[Wealth]\`, \`[Charisma]\`, \`[Flirt]\`.

**GAMEPLAY RULES:**
- If the player uses \`[Wealth]\`, they almost always succeed.
- If \`God Mode\` is enabled, the player automatically succeeds at everything.
`;

export const initializeChat = (profile: CharacterProfile | null, history?: Message[]) => {
  const ai = getAiClient();
  
  let instructions = BASE_SYSTEM_INSTRUCTION;
  if (profile) {
    instructions += `\n\n**PLAYER PROFILE:**\nName: ${profile.name}\nAppearance: ${profile.appearance}\nStats: Strength=${profile.stats.strength}, Intelligence=${profile.stats.intelligence}, Charisma=${profile.stats.charisma}, Wealth=UNLIMITED.`;
  }

  // Map app history to SDK Content format
  // Filter out system error messages or client-side only messages if any
  const sdkHistory: Content[] = history 
    ? history
        .filter(msg => !msg.isError)
        .map(msg => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        })) 
    : [];

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: instructions,
    },
    history: sdkHistory
  });
};

export const sendMessageToGemini = async (text: string, settings?: GameSettings, gameState?: GameState): Promise<string> => {
  if (!chatSession) {
    // Attempt to recover if chat session is lost (e.g. strict mode re-renders)
    console.warn("Chat session not found, re-initializing without history.");
    initializeChat(null);
    if (!chatSession) throw new Error("Could not initialize chat session.");
  }

  let messageToSend = text;
  
  // Inject settings and STATE context invisibly to the model
  const contextParts = [];
  
  if (settings) {
    contextParts.push(`Settings: God Mode=${settings.godMode}, Max Compliance=${settings.maxCompliance}, NSFW=${settings.nsfwUnlocked}`);
  }

  if (gameState) {
    // Summarize State for the AI
    const flagsStr = gameState.flags.length > 0 ? gameState.flags.join(', ') : 'None';
    const inventoryStr = gameState.inventory.length > 0 ? gameState.inventory.join(', ') : 'None';
    const questStr = gameState.activeQuests.length > 0 ? gameState.activeQuests.join(', ') : 'None';
    
    let relStr = 'None';
    const relKeys = Object.keys(gameState.relationships);
    if (relKeys.length > 0) {
        relStr = relKeys.map(key => {
            const r = gameState.relationships[key];
            return `${key}(Lv:${r.love}, Lst:${r.lust}, Sub:${r.submission})`;
        }).join('; ');
    }

    contextParts.push(`[CURRENT GAME STATE]\n- Flags: ${flagsStr}\n- Inventory: ${inventoryStr}\n- Active Quests: ${questStr}\n- NPC Relationships: ${relStr}`);
  }

  if (contextParts.length > 0) {
      messageToSend += `\n\n[SYSTEM CONTEXT]:\n${contextParts.join('\n')}`;
  }

  try {
    const response = await retryWithBackoff(async () => {
       // We must check if chatSession exists here as well in case it was reset during retry delay (unlikely but safe)
       if (!chatSession) throw new Error("Chat session lost");
       return await chatSession.sendMessage({ message: messageToSend });
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateImageWithGemini = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    return await retryWithBackoff(async () => {
        // Using gemini-2.5-flash-image for standard generation
        // Note: responseMimeType is NOT supported for this model family
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        return "";
    });
  } catch (error) {
    console.error("Image Generation Error:", error);
    // Return empty string on persistent failure so game flow isn't completely blocked
    return "";
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const ai = getAiClient();
  
  // Clean text of brackets/tags for better speech
  const speechText = text.replace(/\[.*?\]/g, '').trim();
  if (!speechText) return undefined;

  try {
    return await retryWithBackoff(async () => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: speechText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Fenrir' }
                },
                },
            },
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
        }
        return undefined;
    });
  } catch (error) {
    console.warn("TTS Error:", error);
    return undefined;
  }
};