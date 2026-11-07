# InvoiceGuard AI – Intelligent Invoice Verification & Learning Agent
> **Hackathon Theme: "AI Agents That Learn Using Hindsight"**

InvoiceGuard AI is an autonomous, professional accounts payable assistant that helps businesses verify invoices, detect duplicate payments, identify suspicious amounts, find arithmetic/tax mismatches, and **remember and learn from previously resolved invoice problems using Vectorize Hindsight persistent memory**.

---

## 🌟 The Core Differentiator: Hindsight Persistent Memory

Standard accounts payable validation tools are stateless—they flag the same issue repeatedly and force accountants to re-investigate recurring false alarms or known vendor billing quirks.

**InvoiceGuard AI leverages Vectorize Hindsight**:
1. **Retain**: Every time an accountant investigates an invoice and confirms a resolution (e.g. "Vendor ABC Technologies had an ERP re-billing glitch causing duplicate INV-1001"), the agent stores the experience, vendor metadata, and resolution logic in Hindsight.
2. **Recall**: When an invoice is subsequently uploaded in a future session, the agent queries Hindsight for semantically similar past experiences.
3. **Reflect**: The agent synthesizes recalled memories into actionable recommendations (e.g. "This matches a known re-billing glitch resolved on Oct 20. Confirm with vendor before holding disbursement").

---

## 🚀 60-Second Hackathon Demonstration Sequence

Follow this end-to-end sequence during presentation:

1. **Step 1: Process Sample Invoice 1 (Duplicate Problem)**
   - Navigate to **Upload Invoice** (`/upload`).
   - Click the **"Case 1: Duplicate (ABC Tech ₹25,000)"** quick-fill button.
   - Click **Save & Run AI Verification**.
   - Notice the system flags a **High-severity Duplicate Invoice** issue.

2. **Step 2: Investigate & Resolve the Issue**
   - In the **Human Investigation & Decision** panel, choose **Reject** (or **Hold Review**).
   - Enter finding: *"Contacted vendor ABC Technologies; confirmed duplicate submission of previous invoice INV-1001. Marked as rejected duplicate."*
   - Click **Confirm Decision & Retain in Hindsight**.

3. **Step 3: Verify Memory Retention in Hindsight**
   - Click **Memory Explorer** (`/memories`) in the sidebar.
   - View the newly retained memory bank entry containing the vendor, invoice reference, and exact resolution rationale.

4. **Step 4: Process Another Similar Invoice in a Fresh Session**
   - Go back to **Upload Invoice** (`/upload`).
   - Upload or enter another invoice from `ABC Technologies` for ₹25,000.

5. **Step 5: Automatic Recall via Hindsight**
   - Click **Save & Run AI Verification**.
   - Notice the **Hindsight Memory Recall** card displays the previously stored investigation outcome!

6. **Step 6 & 7: Memory-Informed AI Auditor Assessment**
   - Read the AI assessment: It cites the prior resolution from Hindsight and recommends the exact precedent established by the accountant, demonstrating true learning across sessions.

---

## 📋 Preloaded Demonstration Test Cases

The application comes pre-loaded with synthetic demo records:

- **Case 1: Duplicate Invoice**
  - **Vendor**: ABC Technologies
  - **Invoice #**: INV-1001
  - **Amount**: ₹25,000
  - **Problem**: Same invoice number and vendor appear twice.
- **Case 2: Tax Calculation Mismatch**
  - **Vendor**: Global Supplies
  - **Invoice #**: INV-1002
  - **Amount**: ₹11,800
  - **Problem**: Subtotal ₹10,000 + 10% Tax (₹1,000) = ₹11,000, but entered as ₹11,800.
- **Case 3: Unusual Amount Spike**
  - **Vendor**: Bright Solutions
  - **Invoice #**: INV-1003
  - **Amount**: ₹95,000
  - **Problem**: Vendor baseline average is ~₹13,000. Amount is ~700% higher than historical average.

---

## 🛠️ Technology Architecture

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, React Router
- **Backend**: Node.js, Express, TypeScript, TSX
- **Memory System**: `@vectorize-io/hindsight-client` (Official Vectorize SDK)
- **Document Extraction / OCR**: `tesseract.js` Optical Character Recognition
- **LLM Reasoning**: Google Gemini API (`@google/generative-ai`)
- **Design System**: Commercial SaaS layout (Navy blue `#0F172A`, Indigo/Purple accents `#6366F1`, Emerald success `#10B981`)

---

## 🏃 Running the Application

### 1. Backend Server
```bash
cd backend
npm install
npm start
```
Runs on `http://localhost:3001`.

### 2. Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### 3. Optional: Vectorize Hindsight Server (Docker)
```bash
docker run -it -p 8888:8888 -p 9999:9999 \
  -e HINDSIGHT_API_LLM_PROVIDER=openai \
  -e HINDSIGHT_API_LLM_API_KEY=your_key \
  ghcr.io/vectorize-io/hindsight:latest
```
*(If the local Hindsight Docker server is not running, InvoiceGuard AI gracefully indicates server offline status on `/memories` without fabricating memory responses, in strict compliance with hackathon rules).*

### 4. Environment Variables (`backend/.env`)
```env
PORT=3001
HINDSIGHT_API_URL=http://localhost:8888
HINDSIGHT_BANK_ID=invoiceguard
GEMINI_API_KEY=your_gemini_api_key_here
```
