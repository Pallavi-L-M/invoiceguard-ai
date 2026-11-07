// ── LLM service – Google Gemini integration ──

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Invoice, VerificationResult, ChatMessage } from '../types/index.js';
import { recallMemories } from './hindsightService.js';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Analyse an invoice verification result using Gemini and optionally
 * enrich the response with Hindsight memories.
 */
export async function analyzeInvoice(
  invoice: Invoice,
  verificationResult: VerificationResult
): Promise<{ analysis: string; hindsightContext: string[] }> {
  const hindsightContext: string[] = [];

  // Try to recall relevant memories from Hindsight
  const recallRes = await recallMemories(
    `invoice from ${invoice.vendor} ${invoice.invoiceNumber} amount ${invoice.total}`
  );
  if (recallRes.available && recallRes.data) {
    const memories = recallRes.data;
    if (Array.isArray(memories)) {
      for (const mem of memories) {
        const text = typeof mem === 'string' ? mem : (mem as any)?.content ?? JSON.stringify(mem);
        hindsightContext.push(text);
      }
    } else if (typeof memories === 'string') {
      hindsightContext.push(memories);
    }
  }

  const ai = getGenAI();
  if (!ai) {
    // Build a rule-based analysis when Gemini is unavailable
    const fallback = buildFallbackAnalysis(invoice, verificationResult, hindsightContext);
    return { analysis: fallback, hindsightContext };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert invoice auditor AI. Analyse the following invoice verification result and provide a clear, concise professional summary with actionable recommendations.

INVOICE DETAILS:
- Invoice #: ${invoice.invoiceNumber}
- Vendor: ${invoice.vendor}
- Date: ${invoice.date}
- Subtotal: ₹${invoice.subtotal.toLocaleString()}
- Tax (${invoice.taxRate}%): ₹${invoice.taxAmount.toLocaleString()}
- Total: ₹${invoice.total.toLocaleString()}
- Description: ${invoice.description || 'N/A'}

VERIFICATION RESULT:
- Overall Risk: ${verificationResult.overallRisk}
- Issues Found: ${verificationResult.issues.length}
${verificationResult.issues.map((issue, i) => `  ${i + 1}. [${issue.severity}] ${issue.type}: ${issue.explanation}`).join('\n')}

${hindsightContext.length > 0 ? `HISTORICAL CONTEXT (from memory):\n${hindsightContext.map((c, i) => `  ${i + 1}. ${c}`).join('\n')}` : 'No historical context available.'}

Provide:
1. A brief overall assessment (2-3 sentences)
2. For each issue, a clear explanation of the risk and recommended action
3. If there is historical context, explain how past experience informs the current assessment
4. A final recommendation (approve / hold for review / reject)

Keep the response under 400 words. Use plain language.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return { analysis: text, hindsightContext };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Gemini error';
    console.error('[LLM] Gemini analysis failed:', msg);
    const fallback = buildFallbackAnalysis(invoice, verificationResult, hindsightContext);
    return { analysis: fallback + `\n\n_Note: AI-powered analysis was unavailable (${msg}). The above is a rule-based summary._`, hindsightContext };
  }
}

/**
 * Chat with the AI assistant. Uses Hindsight memories as context.
 */
export async function chat(
  message: string,
  conversationHistory: ChatMessage[] = [],
  invoiceContext?: Invoice | null
): Promise<string> {
  const ai = getGenAI();
  if (!ai) {
    return 'The AI assistant is not configured. Please set the GEMINI_API_KEY environment variable to enable AI-powered chat. You can still use all other features of InvoiceGuard including rule-based verification, OCR upload, and Hindsight memory.';
  }

  // Recall relevant memories
  const hindsightContext: string[] = [];
  const recallRes = await recallMemories(message);
  if (recallRes.available && recallRes.data) {
    const memories = recallRes.data;
    if (Array.isArray(memories)) {
      for (const mem of memories) {
        const text = typeof mem === 'string' ? mem : (mem as any)?.content ?? JSON.stringify(mem);
        hindsightContext.push(text);
      }
    } else if (typeof memories === 'string') {
      hindsightContext.push(memories);
    }
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const systemPrompt = `You are InvoiceGuard AI Assistant, an expert in accounts payable, invoice verification, and financial compliance. You help users understand invoice issues, guide them through resolving flagged invoices, and answer questions about the verification process.

Be concise, professional, and helpful. Use Indian Rupee (₹) for currency. When in doubt, recommend caution and suggest manual verification.

${hindsightContext.length > 0 ? `RELEVANT MEMORIES FROM PAST EXPERIENCE:\n${hindsightContext.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nUse these memories to provide context-aware responses when relevant.` : ''}

${invoiceContext ? `CURRENT INVOICE CONTEXT:\n- Invoice #: ${invoiceContext.invoiceNumber}\n- Vendor: ${invoiceContext.vendor}\n- Total: ₹${invoiceContext.total.toLocaleString()}\n- Status: ${invoiceContext.status}` : ''}`;

    const contents = [
      { role: 'user' as const, parts: [{ text: systemPrompt + '\n\nPlease acknowledge you understand your role. Be brief.' }] },
      { role: 'model' as const, parts: [{ text: 'Understood. I\'m InvoiceGuard AI Assistant, ready to help with invoice verification, anomaly detection, and accounts payable queries. How can I help?' }] },
      ...conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.content }],
      })),
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    const result = await model.generateContent({ contents });
    const response = result.response;
    return response.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LLM] Chat failed:', msg);
    return `I'm sorry, I encountered an error while processing your request: ${msg}. Please try again or use the rule-based verification features directly.`;
  }
}

// ── Fallback rule-based analysis ──

function buildFallbackAnalysis(
  invoice: Invoice,
  result: VerificationResult,
  hindsightContext: string[]
): string {
  const lines: string[] = [];

  lines.push(`## Verification Summary for ${invoice.invoiceNumber}`);
  lines.push('');

  if (result.issues.length === 0) {
    lines.push(`✅ **All checks passed.** Invoice ${invoice.invoiceNumber} from ${invoice.vendor} for ₹${invoice.total.toLocaleString()} appears legitimate.`);
    lines.push('');
    lines.push('**Recommendation:** Approve for payment.');
  } else {
    lines.push(`⚠️ **${result.issues.length} issue(s) detected** with overall risk level: **${result.overallRisk}**.`);
    lines.push('');

    for (const issue of result.issues) {
      const icon = issue.severity === 'High' ? '🔴' : issue.severity === 'Medium' ? '🟡' : '🟢';
      lines.push(`### ${icon} ${issue.type.replace(/_/g, ' ').toUpperCase()} (${issue.severity})`);
      lines.push(issue.explanation);
      lines.push(`**Action:** ${issue.recommendedAction}`);
      lines.push('');
    }

    if (result.overallRisk === 'High') {
      lines.push('**Recommendation:** Hold for manual review. Do not approve payment until all high-severity issues are resolved.');
    } else if (result.overallRisk === 'Medium') {
      lines.push('**Recommendation:** Review flagged items before approving. Consider contacting the vendor for clarification.');
    } else {
      lines.push('**Recommendation:** Low-risk issues noted. May proceed with payment after acknowledging the findings.');
    }
  }

  if (hindsightContext.length > 0) {
    lines.push('');
    lines.push('### Historical Context');
    for (const ctx of hindsightContext) {
      lines.push(`- ${ctx}`);
    }
  }

  return lines.join('\n');
}
