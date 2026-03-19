"use client";

interface UrlInputProps {
  url: string;
  onChange: (url: string) => void;
  disabled: boolean;
}

export default function UrlInput({ url, onChange, disabled }: UrlInputProps) {
  return (
    <div className="w-full">
      <input
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="バイトル・Indeed・タウンワークなどのURLを貼り付けてください"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-yolo-red focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
      />
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
        <span>対応媒体:</span>
        {["バイトル", "Indeed", "タウンワーク", "求人ボックス", "その他"].map(
          (name) => (
            <span
              key={name}
              className="px-2 py-0.5 bg-gray-100 rounded-full"
            >
              {name}
            </span>
          )
        )}
      </div>
    </div>
  );
}
