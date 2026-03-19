"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import ConvertButton from "@/components/ConvertButton";
import JobPreview, { JobData } from "@/components/JobPreview";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobData, setJobData] = useState<JobData | null>(null);

  const handleConvert = async () => {
    if (!url.trim()) {
      setError("URLを入力してください");
      return;
    }

    setLoading(true);
    setError("");
    setJobData(null);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const result = await res.json();

      if (result.success) {
        setJobData(result.data);
      } else {
        setError(result.error || "変換に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setJobData(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          求人URLを<span className="text-yolo-red">YOLO WORK形式</span>に変換
        </h1>
        <p className="text-gray-500">
          バイトル・タウンワーク・Indeedなどの求人URLを貼り付けるだけで、
          <br className="hidden sm:block" />
          外国人向け求人フォーマットに自動変換します
        </p>
      </div>

      {/* Input or Result */}
      {jobData ? (
        <JobPreview data={jobData} onReset={handleReset} />
      ) : (
        <div className="max-w-xl mx-auto space-y-4">
          <UrlInput url={url} onChange={setUrl} disabled={loading} />
          <ConvertButton
            onClick={handleConvert}
            disabled={!url.trim()}
            loading={loading}
          />

          {/* Loading message */}
          {loading && (
            <p className="text-center text-gray-500 text-sm mt-4">
              AIが求人情報を読み込んでいます...
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
