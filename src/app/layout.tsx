import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YOLO WORK 求人変換ツール",
  description: "バイトル・タウンワーク・Indeedなどの求人URLをYOLO WORK形式に自動変換",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-white text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-yolo-red">YOLO WORK</span>
            <span className="text-lg text-gray-600">求人変換ツール</span>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
