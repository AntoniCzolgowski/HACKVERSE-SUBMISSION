import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12 px-6 md:px-12">
      <div className="max-w-content mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-sans font-bold text-sm text-gray-900 mb-3">Product</h3>
          <div className="flex flex-col gap-2">
            <Link href="/discover" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Discover</Link>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Dashboard</Link>
          </div>
        </div>
        <div>
          <h3 className="font-sans font-bold text-sm text-gray-900 mb-3">Team</h3>
          <p className="text-sm text-gray-500">Antoni Czolgowski</p>
          <p className="text-sm text-gray-500">Nivid Pathak</p>
          <p className="text-sm text-gray-500">Atharva Zodpe</p>
          <p className="text-sm text-gray-500">Zach</p>
        </div>
        <div>
          <h3 className="font-sans font-bold text-sm text-gray-900 mb-3">Built with</h3>
          <p className="text-sm text-gray-500">Claude Sonnet 4.6 & Haiku 4.5</p>
          <p className="text-sm text-gray-500">Reddit Public API</p>
          <p className="text-sm text-gray-500">Next.js 16 · React 19</p>
          <p className="text-sm text-gray-500">FastAPI · Python</p>
          <p className="text-sm text-gray-500">sentence-transformers (MiniLM)</p>
        </div>
      </div>
      <div className="max-w-content mx-auto mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">© 2026 LexTrack AI — Hackverse 2026</p>
      </div>
    </footer>
  );
}
