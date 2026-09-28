import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paket berat berbasis Node (fs/stream) agar tidak di-bundle untuk client/server components
  serverExternalPackages: ["exceljs", "pdfmake", "@prisma/client"],
};

export default nextConfig;
