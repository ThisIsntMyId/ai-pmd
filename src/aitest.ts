// hello-vertex.ts
// Run with: pnpx tsx src/aitest.ts

import "dotenv/config";
import * as fs from "fs";
import AnthropicVertex from "@anthropic-ai/vertex-sdk";

// =============================================
// AUTO-DETECT CONFIG FROM SERVICE ACCOUNT FILE
// =============================================

function getConfig() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsPath) {
    console.error("❌ GOOGLE_APPLICATION_CREDENTIALS not set in .env");
    process.exit(1);
  }

  // Read project ID from service account JSON
  let projectId = process.env.PROJECT_ID;
  
  if (!projectId) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      projectId = serviceAccount.project_id;
      console.log("📄 Auto-detected project ID from service account file");
    } catch (e) {
      console.error("❌ Could not read service account file:", credentialsPath);
      process.exit(1);
    }
  }

  const region = process.env.REGION || "us-east5";

  return { projectId, region, credentialsPath };
}

async function main() {
  const { projectId, region, credentialsPath } = getConfig();

  console.log("🚀 Testing Claude on Vertex AI...\n");
  console.log(`   Project ID:   ${projectId}`);
  console.log(`   Region:       ${region}`);
  console.log(`   Credentials:  ${credentialsPath}\n`);

  const client = new AnthropicVertex({
    projectId,
    region,
  });

  try {
    console.log("📡 Sending request to Claude...\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: "Say hello and confirm you're Claude running on Google Vertex AI. Keep it to 1-2 sentences.",
        },
      ],
    });

    // Extract text
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    console.log("✅ SUCCESS!\n");
    console.log("---");
    console.log(text);
    console.log("---\n");

    console.log("📊 Usage:");
    console.log(`   Input tokens:  ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);
    console.log(`   Model:         ${response.model}`);
    console.log(`   Response Full:         ${JSON.stringify(response, null, 2)}`);

  } catch (error: any) {
    console.error("❌ ERROR:", error.message);

    if (error.status === 401 || error.status === 403) {
      console.error("\n🔑 Authentication issue. Check:");
      console.error("   1. Service account has 'Vertex AI User' role in IAM");
      console.error("   2. Vertex AI API is enabled in your project");
    }

    if (error.status === 404 || error.message?.includes("not found")) {
      console.error("\n🔍 Model not found. Check:");
      console.error("   1. Go to Vertex AI → Model Garden → Claude");
      console.error("   2. Click ENABLE and accept terms");
      console.error("   3. Make sure region supports Claude (us-east5, us-central1, europe-west1, europe-west4, asia-southeast1)");
    }

    process.exit(1);
  }
}

main();