/**
 * Lớp truy cập dữ liệu — thay bằng Prisma / Drizzle / MongoDB khi kết nối DB thật.
 */
export const db = {
  // placeholder — dùng in-memory hoặc file cho dev
  isConnected: () => Boolean(process.env.DATABASE_URL),
};
