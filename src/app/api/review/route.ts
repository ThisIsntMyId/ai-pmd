import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import AnthropicVertex from '@anthropic-ai/vertex-sdk';
import { defaultSystemPrompt } from '@/app/prompt';
import { criteria } from '@/app/criteria';

// File size limit: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

// =============================================
// CONFIGURATION
// =============================================

function getConfig() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS not set in environment variables');
  }

  let projectId = process.env.PROJECT_ID;

  if (!projectId) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
      projectId = serviceAccount.project_id;
    } catch (e) {
      throw new Error(`Could not read service account file: ${credentialsPath}`);
    }
  }

  const region = process.env.REGION || 'us-east5';

  return { projectId, region };
}

// =============================================
// HELPER FUNCTIONS
// =============================================

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
type MediaType = ImageMediaType | 'application/pdf';

function getMediaType(fileName: string, fileType?: string): MediaType {
  // Use file type if available, otherwise infer from extension
  if (fileType) {
    if (fileType.startsWith('image/')) {
      if (['image/jpeg', 'image/jpg'].includes(fileType)) return 'image/jpeg';
      if (fileType === 'image/png') return 'image/png';
      if (fileType === 'image/gif') return 'image/gif';
      if (fileType === 'image/webp') return 'image/webp';
    }
    if (fileType === 'application/pdf') return 'application/pdf';
  }

  // Fallback to extension
  const ext = fileName.toLowerCase().split('.').pop();
  const types: Record<string, MediaType> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return types[ext || ''] || 'application/pdf';
}

function isImage(fileName: string, fileType?: string): boolean {
  const mediaType = getMediaType(fileName, fileType);
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType);
}

function isPDF(fileName: string, fileType?: string): boolean {
  return getMediaType(fileName, fileType) === 'application/pdf';
}

// =============================================
// API ROUTE HANDLER
// =============================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const patientName = (formData.get('patientName') as string) || '';
    const patientState = (formData.get('patientState') as string) || '';
    const patientAge = (formData.get('patientAge') as string) || '';
    const customSystemPrompt = formData.get('systemPrompt') as string;
    const customCriteria = formData.get('criteriaMatrix') as string;
    // const model = (formData.get('llmModel') as string) || 'claude-sonnet-4-5';
    const model = 'claude-sonnet-4-5';
    // Use custom prompts if provided, otherwise use defaults
    const systemPrompt = customSystemPrompt || defaultSystemPrompt;
    const criteriaMatrix = customCriteria || criteria;

    // Extract files (multiple files per category)
    const intakeFiles = formData.getAll('intakeFiles') as File[];
    const medicalRecordsFiles = formData.getAll('medicalRecordsFiles') as File[];
    const idProofFiles = formData.getAll('idProofFiles') as File[];

    // Combine all files for validation (excluding intake PDFs from size validation)
    const allFiles = [...intakeFiles, ...medicalRecordsFiles, ...idProofFiles];

    // Validate file sizes (skip intake PDFs as they can be larger)
    for (const file of allFiles) {
      // Skip size validation for intake PDFs
      const isIntakePDF = intakeFiles.includes(file) && isPDF(file.name, file.type);
      if (!isIntakePDF && file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 3MB limit. Size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
          { status: 400 }
        );
      }
    }

    // Get configuration
    const { projectId, region } = getConfig();

    // Initialize Vertex AI client
    const client = new AnthropicVertex({
      projectId,
      region,
    });

    // Build message content array
    const messageContent: any[] = [];

    // 1. Add criteria matrix first with cache control (for reference document)
    messageContent.push({
      type: 'text',
      text: `# Reference: Qualification Criteria Matrix\n\n${criteriaMatrix}`,
      cache_control: { type: 'ephemeral' },
    });

    messageContent.push({
      type: 'text',
      text: 'Above is the reference qualification criteria guide that you should use as context for reviewing the following files.',
      cache_control: { type: 'ephemeral' },
    });

    // 2. Add system prompt context
    messageContent.push({
      type: 'text',
      text: `# System Instructions\n\n${systemPrompt}`,
    });

    // 3. Add patient context if provided
    if (patientName || patientState || patientAge) {
      const patientContext = [
        patientName && `Patient Name: ${patientName}`,
        patientState && `State: ${patientState}`,
        patientAge && `Age: ${patientAge}`,
      ]
        .filter(Boolean)
        .join('\n');

      messageContent.push({
        type: 'text',
        text: `# Patient Context\n\n${patientContext}`,
      });
    }

    // 4. Process and add files
    // Process intake files (PDFs, images, or JSON expected)
    for (const file of intakeFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (isImage(file.name, file.type)) {
        const base64 = buffer.toString('base64');
        const imageMediaType = getMediaType(file.name, file.type) as ImageMediaType;
        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMediaType,
            data: base64,
          },
        });
      } else if (isPDF(file.name, file.type)) {
        // Pass PDF directly as document
        const base64 = buffer.toString('base64');
        messageContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        });
      } else {
        // For non-PDF/non-image intake files (e.g., JSON), treat as text if possible
        const text = buffer.toString('utf-8');
        messageContent.push({
          type: 'text',
          text: `# Intake Document: ${file.name}\n\n${text}`,
        });
      }
    }

    // Process medical records files (PDFs expected)
    for (const file of medicalRecordsFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');

      if (isImage(file.name, file.type)) {
        const imageMediaType = getMediaType(file.name, file.type) as ImageMediaType;
        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMediaType,
            data: base64,
          },
        });
      } else if (isPDF(file.name, file.type)) {
        messageContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        });
      } else {
        // For non-PDF medical records, treat as text if possible
        const text = buffer.toString('utf-8');
        messageContent.push({
          type: 'text',
          text: `# Medical Record: ${file.name}\n\n${text}`,
        });
      }
    }

    // Process ID proof files (images or PDFs)
    for (const file of idProofFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');

      if (isImage(file.name, file.type)) {
        const imageMediaType = getMediaType(file.name, file.type) as ImageMediaType;
        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMediaType,
            data: base64,
          },
        });
      } else if (isPDF(file.name, file.type)) {
        messageContent.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        });
      } else {
        // Fallback: treat as text
        const text = buffer.toString('utf-8');
        messageContent.push({
          type: 'text',
          text: `# ID Document: ${file.name}\n\n${text}`,
        });
      }
    }

    // 5. Add final instruction
    messageContent.push({
      type: 'text',
      text: 'Please review the uploaded files (intake form, identity document, and medical records) and return ONLY valid JSON matching the specified schema. Do not include markdown code blocks or any text before or after the JSON.',
    });

    // Call Claude API
    const response = await client.messages.create({
      model: model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    console.log(JSON.stringify(messageContent, null, 2));
    console.log(JSON.stringify(response, null, 2));

    // Extract response text
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');

    // Parse JSON response (remove markdown code blocks if present)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    let result;
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, return error
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON. The model may have returned invalid JSON.' },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error processing review:', error);

    // Return user-friendly error messages
    if (error.message?.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      return NextResponse.json(
        { error: 'Server configuration error: Google Cloud credentials not configured' },
        { status: 500 }
      );
    }

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { error: 'Authentication error: Check Google Cloud service account permissions' },
        { status: 500 }
      );
    }

    if (error.status === 404 || error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Model not found: Ensure Claude is enabled in Vertex AI Model Garden' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process review request' },
      { status: 500 }
    );
  }
}
