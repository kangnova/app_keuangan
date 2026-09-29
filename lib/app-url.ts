// Basis URL aplikasi untuk membangun absolute URL redirect.
//
// JANGAN memakai `request.url` sebagai basis redirect. Di belakang nginx,
// Next.js (mode `next start`) menganggap host-nya adalah `localhost:3003`
// (host + port internal server), sehingga `new URL("/x", request.url)`
// menghasilkan `https://localhost:3003/x` — redirect jadi lari ke localhost,
// bukan ke domain publik. Pakai NEXT_PUBLIC_APP_URL sebagai gantinya
// (nilai produksi: https://artaku.my.id).
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
