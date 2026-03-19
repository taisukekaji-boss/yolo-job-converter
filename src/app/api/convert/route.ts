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

    const { content, url, systemPrompt } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "ページ内容が指定されていません" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "APIキーが設定されていません" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const client = new Anthropic({ apiKey });

    // Chrome拡張から送られたシステムプロンプトを使用（なければデフォルト）
    const finalPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: finalPrompt,
      messages: [
        {
          role: "user",
          content: `以下の求人ページをYOLO WORK形式に変換してください。\n\nURL: ${url}\n\nページ内容:\n${content}`,
        },
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
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText;
    const objMatch = jsonStr.match(/(\{[\s\S]*\})/);
    const finalStr = objMatch ? objMatch[1] : jsonStr;

    let data;
    try {
      data = JSON.parse(finalStr);
    } catch (e) {
      console.error("JSON parse error:", e);
      console.error("Raw text:", rawText);
      return NextResponse.json(
        { success: false, error: "変換結果のパースに失敗しました。別のURLを試してください。" },
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
    console.error("Convert API error:", error);
    const msg = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

const DEFAULT_SYSTEM_PROMPT = `あなたはYOLO WORK（外国人向け求人媒体）の求人作成アシスタントです。
提供された求人ページの内容を読み込み、YOLO WORK形式のJSONに変換してください。
必ずJSONのみを返すこと。説明文は不要。
フィールドが不明な場合はnullを入れること。
エラーの場合は {"error": "理由"} のみ返すこと。`;
