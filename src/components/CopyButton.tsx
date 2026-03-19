"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="px-6 py-2.5 border-2 border-yolo-red text-yolo-red font-bold rounded-lg hover:bg-red-50 transition-colors"
    >
      {copied ? "コピーしました!" : "クリップボードにコピー"}
    </button>
  );
}
