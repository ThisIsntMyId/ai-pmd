// file-upload-test.ts
// Run with: pnpx tsx src/file-upload-test.ts

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import AnthropicVertex from "@anthropic-ai/vertex-sdk";

// =============================================
// FILE PATHS - Update these to your actual files
// =============================================
const FILES = {
  image: "./files/id.png",           // Any image: .png, .jpg, .jpeg, .gif, .webp
  pdf: "./files/intake3.pdf",         // Regular PDF to review
  cached: "./files/criteria.md",     // Markdown file to cache (guidelines, reference, etc.)
};

// =============================================
// AUTO-DETECT CONFIG FROM SERVICE ACCOUNT FILE
// =============================================

function getConfig() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    console.error("❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env");
    process.exit(1);
  }

  let projectId = process.env.PROJECT_ID;

  if (!projectId) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      projectId = serviceAccount.project_id;
      console.log("📄 Auto-detected project ID from service account file\n");
    } catch (e) {
      console.error("❌ Could not read service account file:", credentialsPath);
      process.exit(1);
    }
  }

  const region = process.env.REGION || "us-east5";

  return { projectId, region, credentialsPath };
}

// =============================================
// HELPER FUNCTIONS
// =============================================

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
type MediaType = ImageMediaType | "application/pdf";

function getMediaType(filePath: string): MediaType {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, MediaType> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  return types[ext] || "application/pdf";
}

function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

function loadFileAsBase64(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath).toString("base64");
}

function loadFileAsText(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, "utf-8");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// =============================================
// MAIN FUNCTION
// =============================================

async function main() {
  const { projectId, region, credentialsPath } = getConfig();

  console.log("🚀 Claude Vertex AI - File Upload Test\n");
  console.log(`   Project ID:   ${projectId}`);
  console.log(`   Region:       ${region}`);
  console.log(`   Credentials:  ${credentialsPath}\n`);

  // Check files exist
  console.log("📁 Loading files...");
  for (const [name, filePath] of Object.entries(FILES)) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.error(`   Create a 'files' directory and add your test files.`);
      process.exit(1);
    }
    const stats = fs.statSync(filePath);
    const fileType = isMarkdownFile(filePath) ? "markdown" : path.extname(filePath);
    console.log(`   ✓ ${name}: ${filePath} (${formatBytes(stats.size)}) ${fileType}`);
  }
  console.log("");

  // Load files - handle markdown differently
  const imageBase64 = loadFileAsBase64(FILES.image);
  const pdfBase64 = loadFileAsBase64(FILES.pdf);
  
  // Check if cached file is markdown or PDF
  const isCachedMarkdown = isMarkdownFile(FILES.cached);
  const cachedContent = isCachedMarkdown 
    ? loadFileAsText(FILES.cached) 
    : loadFileAsBase64(FILES.cached);

  const imageMediaType = getMediaType(FILES.image);

  // Initialize client
  const client = new AnthropicVertex({
    projectId,
    region,
  });

  try {
    console.log("📡 Sending request to Claude with 3 files...\n");
    console.log("   - Image: will be analyzed");
    console.log("   - PDF: will be reviewed");
    console.log(`   - Cached ${isCachedMarkdown ? 'Markdown' : 'PDF'}: used as reference context (prompt cached)\n`);

    // Build content array dynamically based on file type
    const messageContent: any[] = [];

    // ============================================
    // 1. CACHED CONTENT - Large reference document
    //    Put this FIRST and mark with cache_control
    //    Must be 1024+ tokens to benefit from caching
    // ============================================
    if (isCachedMarkdown) {
      // For markdown, use text block
      messageContent.push({
        type: "text",
        text: `# Reference Document\n\n${cachedContent}`,
        cache_control: { type: "ephemeral" },
      });
    } else {
      // For PDF, use document block
      messageContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: cachedContent,
        },
        cache_control: { type: "ephemeral" },
      });
    }

    messageContent.push({
      type: "text",
      text: "Above is a reference guide that you should use as context for reviewing the following files.",
      cache_control: { type: "ephemeral" },
    });

    // ============================================
    // 2. IMAGE FILE - Screenshot/image to analyze
    // ============================================
    messageContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imageMediaType as ImageMediaType,
        data: imageBase64,
      },
    });

    // ============================================
    // 3. PDF FILE - Document to review
    // ============================================
    messageContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: pdfBase64,
      },
    });

    // ============================================
    // 4. PROMPT - What to do with these files
    // ============================================
    messageContent.push({
      type: "text",
      text: `Please review the files I've uploaded:

1. **Image Analysis**: Describe what you see in the image. What is it showing? Any notable details?

2. **PDF Review**: Summarize the PDF document. What are the key points or content?

3. **Cross-Reference**: Based on the reference guide I provided first, are there any relevant connections or observations you can make about the image and PDF?

Please structure your response with clear sections for each.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    // Extract response text
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    console.log("✅ SUCCESS!\n");
    console.log("═".repeat(60));
    console.log(text);
    console.log("═".repeat(60));
    console.log("");

    // Usage stats
    const usage = response.usage as any;
    console.log("📊 Token Usage:");
    console.log(`   Input tokens:          ${usage.input_tokens}`);
    console.log(`   Output tokens:         ${usage.output_tokens}`);
    console.log(`   Cache creation tokens: ${usage.cache_creation_input_tokens || 0}`);
    console.log(`   Cache read tokens:     ${usage.cache_read_input_tokens || 0}`);
    console.log(`   Model:                 ${response.model}`);

    // Explain caching
    if (usage.cache_creation_input_tokens > 0) {
      console.log("\n💡 Cache was CREATED for the reference document.");
      console.log("   Next request with same content will be cheaper (cache hit).");
    }
    if (usage.cache_read_input_tokens > 0) {
      console.log("\n💡 Cache HIT! Saved money by reusing cached content.");
    }

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);

    if (error.status === 401 || error.status === 403) {
      console.error("\n🔑 Authentication issue. Check:");
      console.error("   1. Service account has 'Vertex AI User' role");
      console.error("   2. Vertex AI API is enabled");
    }

    if (error.status === 404 || error.message?.includes("not found")) {
      console.error("\n🔍 Model not found. Check:");
      console.error("   1. Go to Vertex AI → Model Garden → Claude");
      console.error("   2. Click ENABLE and accept terms");
    }

    if (error.message?.includes("too large")) {
      console.error("\n📦 File too large. Limits:");
      console.error("   - Images: ~20MB");
      console.error("   - PDFs: ~32MB / 100 pages");
      console.error("   - Text/Markdown: Check token limits");
    }

    process.exit(1);
  }
}

main();