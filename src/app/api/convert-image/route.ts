import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    // トークン認証
    const token = request.headers.get('X-API-Token');
    if (token !== process.env.INTERNAL_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { images, url, systemPrompt } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'スクリーンショットが指定されていません' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'APIキーが設定されていません' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const client = new Anthropic({ apiKey });
    const finalPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // 画像をClaude Vision用のcontent配列に変換（最大4枚）
    const imageContent: Anthropic.Messages.ContentBlockParam[] = [];

    const maxImages = Math.min(images.length, 4);
    for (let i = 0; i < maxImages; i++) {
      const dataUrl = images[i] as string;
      // data:image/jpeg;base64,xxxxx → base64部分を抽出
      const match = dataUrl.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/);
      if (match) {
        const mediaType = match[1] as 'jpeg' | 'png' | 'gif' | 'webp';
        const base64Data = match[2];
        imageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: `image/${mediaType}`,
            data: base64Data,
          }
        });
      }
    }

    if (imageContent.length === 0) {
      return NextResponse.json(
        { success: false, error: '有効な画像データがありません' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // テキスト指示を追加
    imageContent.push({
      type: 'text',
      text: `上記は求人ページのスクリーンショットです。この求人情報をYOLO WORK形式のJSONに変換してください。\n\nURL: ${url || '不明'}`
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: finalPrompt,
      messages: [
        {
          role: 'user',
          content: imageContent,
        }
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { success: false, error: "AIからの応答を取得できませんでした" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const rawText = textContent.text.trim();

    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const stripped = codeBlockMatch ? codeBlockMatch[1].trim() : rawText;

    const extractJSON = (text: string): string | null => {
      let depth = 0;
      let start = -1;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (text[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            return text.slice(start, i + 1);
          }
        }
      }
      return null;
    };

    const finalStr = extractJSON(stripped) || stripped;

    let data;
    try {
      data = JSON.parse(finalStr);
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Parse error. Raw response length:", rawText.length);
      console.error("First 500 chars:", rawText.slice(0, 500));
      console.error("Last 500 chars:", rawText.slice(-500));
      return NextResponse.json(
        { success: false, error: "変換結果のパースに失敗しました" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({ success: true, data }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Convert-image API error:", error);
    const msg = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

const DEFAULT_SYSTEM_PROMPT = `あなたはYOLO WORK（外国人向け求人媒体）の求人作成アシスタントです。
提供された求人ページのスクリーンショットを読み取り、YOLO WORK形式のJSONに変換してください。
必ずJSONのみを返すこと。説明文は不要。
フィールドが不明な場合はnullを入れること。
エラーの場合は {"error": "理由"} のみ返すこと。`;
