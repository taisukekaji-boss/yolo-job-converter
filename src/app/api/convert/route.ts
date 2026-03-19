import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `あなたはYOLO WORK（外国人向け求人媒体）の求人作成アシスタントです。
提供されたURLの求人情報を読み込み、YOLO WORK形式に変換してください。

変換ルール：
- 在留資格の条件を必ず明記する（記載がない場合は「要確認」と記載）
- 日本語レベルの要件を必ず追加する（N1/N2/N3/N4/N5/不問）
- 外国人が魅力を感じる訴求ポイントを1〜3個追加する
- 給与は月給換算で記載する
- 勤務地は最寄り駅を含めて記載する

出力はJSON形式で以下のフィールドを含めること：
{
  "job_title": "職種名",
  "job_description": "仕事内容（200字以内）",
  "salary": "給与",
  "location": "勤務地・最寄り駅",
  "working_hours": "勤務時間",
  "holiday": "休日・休暇",
  "visa_requirement": "在留資格条件",
  "japanese_level": "日本語レベル",
  "appeal_points": ["外国人向け訴求ポイント1", "訴求ポイント2"],
  "company_name": "会社名",
  "employment_type": "雇用形態（正社員/アルバイト/契約社員）",
  "source_url": "元のURL"
}

JSONのみを返すこと。説明文は不要。

URLが読み込めない場合や情報が不足している場合でも、必ずJSON形式のみで返すこと。
エラーの場合は { "error": "エラーの理由" } のJSON形式で返すこと。
日本語の説明文を返してはいけない。`;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "URLが指定されていません" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // URLのHTMLを取得
    let pageContent = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
        }
      });
      const html = await response.text();
      // HTMLタグを除去してテキストだけ抽出（最大5000文字）
      pageContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
    } catch {
      return NextResponse.json(
        { success: false, error: 'URLのページを取得できませんでした。URLを確認してください。' },
        { status: 500 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下の求人ページのテキストをYOLO WORK形式に変換してください。\n\nURL: ${url}\n\nページ内容:\n${pageContent}`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { success: false, error: "AIからの応答を取得できませんでした" },
        { status: 500 }
      );
    }

    const rawText = textContent.text.trim();
    // コードブロックを除去
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText;
    // 先頭と末尾の{...}だけ抽出（テキストが混ざってる場合）
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
        { status: 500 }
      );
    }

    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Convert API error:", error);

    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
